// CRUD + computed stats for per-item data: prices, comments, history.
// All operations use Supabase directly. RLS ensures only list members
// can read/write data for items in their lists.

import { supabase, IS_DEMO, type ItemPrice, type ItemComment, type ItemHistoryEvent } from "./supabase";

// ── PURCHASES / PRICES ─────────────────────────────────────────────────
// item_prices stores purchase events. A row can represent:
//   - A manual price entry (store + price set)
//   - An auto-logged purchase (store + price both null) when user marks done

export async function addItemPrice(params: {
  itemId: string;
  store: string;
  price: number;
  currency: string;
  addedBy: string;
  addedByName: string;
  // For weighed items, price is per-unit (per kg/L) and qty/unit record
  // how much was purchased so the actual amount paid is recoverable as
  // price × qty. For piece-counted items, omit both and price is the
  // amount paid as before.
  qty?: number | null;
  unit?: string | null;
}): Promise<ItemPrice | null> {
  if (IS_DEMO || !supabase) return null;
  const row: Record<string, unknown> = {
    item_id: params.itemId,
    store: params.store,
    price_value: params.price,
    currency: params.currency,
    added_by: params.addedBy,
    added_by_name: params.addedByName,
  };
  if (params.qty != null) row.qty = params.qty;
  if (params.unit) row.unit = params.unit;
  const { data, error } = await supabase
    .from("item_prices")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data as ItemPrice;
}

/** Auto-log a purchase when user marks an item as done (no price/store). */
export async function logAutoPurchase(params: {
  itemId: string;
  byUserId: string;
  byUserName: string;
}): Promise<ItemPrice | null> {
  if (IS_DEMO || !supabase) return null;
  const { data, error } = await supabase
    .from("item_prices")
    .insert({
      item_id: params.itemId,
      store: null,
      price_value: null,
      currency: "EUR",
      added_by: params.byUserId,
      added_by_name: params.byUserName,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ItemPrice;
}

/** Remove the most recent auto-logged purchase by this user (last 60s). */
export async function removeRecentAutoPurchase(params: {
  itemId: string;
  byUserId: string;
}): Promise<void> {
  if (IS_DEMO || !supabase) return;
  const cutoff = new Date(Date.now() - 60 * 1000).toISOString();
  const { data } = await supabase
    .from("item_prices")
    .select("id")
    .eq("item_id", params.itemId)
    .eq("added_by", params.byUserId)
    .is("price_value", null)
    .is("store", null)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1);
  if (data && data.length > 0) {
    await supabase.from("item_prices").delete().eq("id", data[0].id);
  }
}

export async function deleteItemPrice(priceId: string): Promise<void> {
  if (IS_DEMO || !supabase) return;
  const { error } = await supabase.from("item_prices").delete().eq("id", priceId);
  if (error) throw error;
}

export async function getItemPrices(itemId: string): Promise<ItemPrice[]> {
  if (IS_DEMO || !supabase) return [];
  const { data, error } = await supabase
    .from("item_prices")
    .select("*")
    .eq("item_id", itemId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as ItemPrice[];
}

// ── COMMENTS ───────────────────────────────────────────────────────────

export async function addItemComment(params: {
  itemId: string;
  text: string;
  addedBy: string;
  addedByName: string;
  addedByLang: string;
}): Promise<ItemComment | null> {
  if (IS_DEMO || !supabase) return null;
  const { data, error } = await supabase
    .from("item_comments")
    .insert({
      item_id: params.itemId,
      text: params.text,
      added_by: params.addedBy,
      added_by_name: params.addedByName,
      added_by_lang: params.addedByLang,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ItemComment;
}

export async function deleteItemComment(commentId: string): Promise<void> {
  if (IS_DEMO || !supabase) return;
  const { error } = await supabase.from("item_comments").delete().eq("id", commentId);
  if (error) throw error;
}

export async function getItemComments(itemId: string): Promise<ItemComment[]> {
  if (IS_DEMO || !supabase) return [];
  const { data, error } = await supabase
    .from("item_comments")
    .select("*")
    .eq("item_id", itemId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data as ItemComment[];
}

// ── HISTORY ────────────────────────────────────────────────────────────

export async function logItemHistory(params: {
  itemId: string;
  eventType: string;
  description: string;
  icon?: string;
  byUserId: string;
  byUserName: string;
}): Promise<void> {
  if (IS_DEMO || !supabase) return;
  const { error } = await supabase.from("item_history").insert({
    item_id: params.itemId,
    event_type: params.eventType,
    description: params.description,
    icon: params.icon ?? null,
    by_user_id: params.byUserId,
    by_user_name: params.byUserName,
  });
  if (error) throw error;
}

export async function getItemHistory(itemId: string): Promise<ItemHistoryEvent[]> {
  if (IS_DEMO || !supabase) return [];
  const { data, error } = await supabase
    .from("item_history")
    .select("*")
    .eq("item_id", itemId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as ItemHistoryEvent[];
}

// ── COMPUTED STATS ─────────────────────────────────────────────────────

export interface ItemStats {
  totalPurchases: number;
  totalSpent: number;
  averagePrice: number;
  bestPrice: number | null;
  bestStore: string | null;
  worstPrice: number | null;
  worstStore: string | null;
  currency: string;
  frequencyDays: number | null;
  lastPurchase: string | null;
  favoriteStore: string | null;
  favoriteStoreCount: number;
  byUser: Array<{ name: string; count: number; pct: number }>;
  byStore: Array<{ store: string; count: number }>;
}

export function computeItemStats(prices: ItemPrice[]): ItemStats {
  // Total purchases: ALL rows (manual prices + auto-logged from check)
  const totalPurchases = prices.length;

  // For money/store stats, only use rows with actual price + store
  const pricedRows = prices.filter(p => p.price_value !== null);
  const storedRows = prices.filter(p => p.store !== null && p.store !== "");

  if (totalPurchases === 0) {
    return {
      totalPurchases: 0,
      totalSpent: 0,
      averagePrice: 0,
      bestPrice: null,
      bestStore: null,
      worstPrice: null,
      worstStore: null,
      currency: "EUR",
      frequencyDays: null,
      lastPurchase: null,
      favoriteStore: null,
      favoriteStoreCount: 0,
      byUser: [],
      byStore: [],
    };
  }

  // Money stats from priced rows only.
  // Total spent = sum(price_value × qty) — for weighed items qty is the kg/L
  // and price_value is per-unit, so this gives the real money paid. Legacy
  // rows have qty NULL → treated as qty = 1, preserving the old behaviour
  // where price_value already was the total.
  const total = pricedRows.reduce((s, p) => {
    const q = p.qty != null && p.qty > 0 ? Number(p.qty) : 1;
    return s + Number(p.price_value) * q;
  }, 0);
  // Average is over UNIT prices (price_value as-is), so €/kg comparisons
  // stay sensible across purchases with different weights.
  const avg = pricedRows.length > 0
    ? pricedRows.reduce((s, p) => s + Number(p.price_value), 0) / pricedRows.length
    : 0;

  let bestPrice: number | null = null;
  let bestStore: string | null = null;
  let worstPrice: number | null = null;
  let worstStore: string | null = null;
  if (pricedRows.length > 0) {
    const sorted = [...pricedRows].sort((a, b) => Number(a.price_value) - Number(b.price_value));
    const cheapest = sorted[0];
    const most_expensive = sorted[sorted.length - 1];
    bestPrice = Number(cheapest.price_value);
    bestStore = cheapest.store;
    worstPrice = Number(most_expensive.price_value);
    worstStore = most_expensive.store;
  }

  // Frequency: days between first and last purchase (any kind)
  let frequencyDays: number | null = null;
  if (totalPurchases > 1) {
    const sortedByDate = [...prices].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const totalDays = (new Date(sortedByDate[sortedByDate.length - 1].created_at).getTime()
      - new Date(sortedByDate[0].created_at).getTime()) / (1000 * 60 * 60 * 24);
    frequencyDays = Math.max(0, Math.round(totalDays / (totalPurchases - 1)));
  }

  // Group by store (only rows with a store)
  const byStoreMap: Record<string, number> = {};
  for (const p of storedRows) {
    if (p.store) byStoreMap[p.store] = (byStoreMap[p.store] || 0) + 1;
  }
  const byStore = Object.entries(byStoreMap)
    .map(([store, count]) => ({ store, count }))
    .sort((a, b) => b.count - a.count);
  const favoriteStore = byStore[0]?.store ?? null;
  const favoriteStoreCount = byStore[0]?.count ?? 0;

  // Group by user (all purchases count)
  const byUserMap: Record<string, number> = {};
  for (const p of prices) {
    const name = p.added_by_name || "Unknown";
    byUserMap[name] = (byUserMap[name] || 0) + 1;
  }
  const byUser = Object.entries(byUserMap)
    .map(([name, count]) => ({ name, count, pct: Math.round((count / totalPurchases) * 100) }))
    .sort((a, b) => b.count - a.count);

  return {
    totalPurchases,
    totalSpent: total,
    averagePrice: avg,
    bestPrice,
    bestStore,
    worstPrice,
    worstStore,
    currency: pricedRows[0]?.currency ?? "EUR",
    frequencyDays,
    lastPurchase: [...prices].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at,
    favoriteStore,
    favoriteStoreCount,
    byUser,
    byStore,
  };
}

// Helper to format relative time
export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days}d`;
  const months = Math.floor(days / 30);
  return `hace ${months}mes${months > 1 ? "es" : ""}`;
}

// ── SHARED PRODUCT PRICES ──────────────────────────────────────────────
// Cross-user/global price book keyed by a normalized product identity.
// Mirrored from item_prices via a Postgres trigger (see migration 018).

// Must stay in sync with compute_product_key() in 019_product_key_redesign.sql.
// Brand is intentionally ignored: "Leche Pascual" and "Leche Mercadona"
// share the same canonical key so the price-by-brand panel can compare them
// and user stats can sum all milk purchases regardless of brand.
export function productKey(name: string, _brand?: string | null): string {
  return (name ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

export interface ProductAvg {
  avg: number;
  currency: string;
  count: number;
}

export async function getProductAvgsByKeys(
  keys: string[],
  country?: string | null,
): Promise<Record<string, ProductAvg>> {
  if (IS_DEMO || !supabase || keys.length === 0) return {};
  const unique = Array.from(new Set(keys.filter(Boolean)));
  if (unique.length === 0) return {};
  let q = supabase
    .from("product_prices")
    .select("product_key, price_value, currency")
    .in("product_key", unique);
  if (country) q = q.eq("country", country);
  const { data, error } = await q;
  if (error || !data) return {};
  const groups: Record<string, { sum: number; count: number; currency: string }> = {};
  for (const row of data as Array<{ product_key: string; price_value: number; currency: string }>) {
    const g = groups[row.product_key] || { sum: 0, count: 0, currency: row.currency };
    g.sum += Number(row.price_value);
    g.count += 1;
    if (!g.currency) g.currency = row.currency;
    groups[row.product_key] = g;
  }
  const out: Record<string, ProductAvg> = {};
  for (const [key, g] of Object.entries(groups)) {
    out[key] = { avg: g.sum / g.count, currency: g.currency, count: g.count };
  }
  return out;
}

// ── BRAND-LEVEL PRICE COMPARISON ───────────────────────────────────────
// For a given product (e.g. "leche"), break the global price book down
// by brand so the UI can show "Pascual 2.45€ · Mercadona 1.95€".
// Group key is normalized brand (case/space-insensitive) so typos that
// share a normalized form merge; the displayed casing is the most common
// original spelling across the rows.

export interface BrandPrice {
  brand: string | null;       // normalized lowercase brand, null = no brand
  brandDisplay: string;       // most common original casing
  avg: number;
  min: number;
  max: number;
  count: number;
  currency: string;
}

export async function getProductPricesByBrand(
  pkey: string,
  country?: string | null,
): Promise<BrandPrice[]> {
  if (IS_DEMO || !supabase || !pkey) return [];
  let q = supabase
    .from("product_prices")
    .select("brand, price_value, currency")
    .eq("product_key", pkey);
  if (country) q = q.eq("country", country);
  const { data, error } = await q;
  if (error || !data) return [];

  const groups: Record<string, {
    sum: number; count: number; min: number; max: number;
    currency: string; spellings: Record<string, number>;
  }> = {};
  for (const r of data as Array<{ brand: string | null; price_value: number; currency: string }>) {
    const norm = (r.brand ?? "").trim().toLowerCase();
    const orig = (r.brand ?? "").trim();
    const g = groups[norm] || {
      sum: 0, count: 0, min: Infinity, max: -Infinity,
      currency: r.currency, spellings: {},
    };
    const v = Number(r.price_value);
    g.sum += v;
    g.count += 1;
    if (v < g.min) g.min = v;
    if (v > g.max) g.max = v;
    if (orig) g.spellings[orig] = (g.spellings[orig] || 0) + 1;
    groups[norm] = g;
  }

  return Object.entries(groups).map(([norm, g]) => {
    const display = Object.entries(g.spellings)
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
    return {
      brand: norm || null,
      brandDisplay: display,
      avg: g.sum / g.count,
      min: g.min,
      max: g.max,
      count: g.count,
      currency: g.currency,
    };
  }).sort((a, b) => a.avg - b.avg);
}

// ── CROSS-LIST USER PURCHASE HISTORY ───────────────────────────────────
// Returns every priced/auto-logged purchase the given user has logged for
// this canonical product, across ALL their lists. Feeds the "global" tab
// of the item detail stats panel.

export async function getUserProductPurchases(
  pkey: string,
  userId: string,
): Promise<ItemPrice[]> {
  if (IS_DEMO || !supabase || !pkey || !userId) return [];

  // Two queries instead of a PostgREST inner-join — the embedded relation
  // syntax was returning empty results in this project (custom auth, RLS
  // off on items but on for item_prices: the relationship was not getting
  // resolved server-side). Splitting into prices + items lookup is more
  // predictable and lets us filter by the canonical product key locally.
  const { data: rows, error } = await supabase
    .from("item_prices")
    .select("*")
    .eq("added_by", userId);
  if (error || !rows || rows.length === 0) return [];

  const itemIds = Array.from(new Set(rows.map(r => (r as ItemPrice).item_id)));
  const { data: items } = await supabase
    .from("items")
    .select("id, original")
    .in("id", itemIds);

  const matchingItemIds = new Set(
    (items ?? [])
      .filter(it => productKey((it as { original: string }).original) === pkey)
      .map(it => (it as { id: string }).id),
  );
  return (rows as ItemPrice[]).filter(r => matchingItemIds.has(r.item_id));
}

// ── DEDUP EXISTING LIST ────────────────────────────────────────────────
// One-shot helper that retroactively applies the addItem() dedup rule to
// every duplicate already in a list. For each group of items that share
// the same canonical product_key, the oldest row becomes the canonical
// one and the rest are merged into it (item_prices/comments/history are
// repointed via item_id update; receipt_items.matched_item_id has ON
// DELETE SET NULL so it self-cleans). Returns how many rows were merged.

export interface MergeDuplicatesResult {
  groupsMerged: number;
  itemsRemoved: number;
}

export async function mergeListDuplicates(listId: string): Promise<MergeDuplicatesResult> {
  if (IS_DEMO || !supabase) return { groupsMerged: 0, itemsRemoved: 0 };

  const { data: items, error } = await supabase
    .from("items")
    .select("id, original, brand, qty, unit, checked, checked_at, created_at")
    .eq("list_id", listId)
    .order("created_at", { ascending: true });
  if (error || !items) return { groupsMerged: 0, itemsRemoved: 0 };

  type Row = {
    id: string; original: string; brand: string | null;
    qty: string | null; unit: string | null;
    checked: boolean; checked_at: string | null; created_at: string;
  };
  const groups = new Map<string, Row[]>();
  for (const it of items as Row[]) {
    const k = productKey(it.original);
    if (!k) continue;
    const arr = groups.get(k) ?? [];
    arr.push(it);
    groups.set(k, arr);
  }

  let groupsMerged = 0;
  let itemsRemoved = 0;
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const [canonical, ...rest] = group;

    // Sum quantities only when units match across the whole group.
    const baseQty = parseFloat(canonical.qty ?? "");
    const targetUnit = canonical.unit ?? "";
    let mergedQty = isNaN(baseQty) ? 0 : baseQty;
    let canMergeQty = !isNaN(baseQty) || canonical.qty == null || canonical.qty === "";
    for (const r of rest) {
      const v = parseFloat(r.qty ?? "");
      const sameUnit = (r.unit ?? "") === targetUnit;
      if (sameUnit && !isNaN(v)) mergedQty += v;
      else canMergeQty = false;
    }

    const inheritedBrand = canonical.brand
      ? canonical.brand
      : rest.find(r => r.brand)?.brand ?? null;
    const anyChecked = group.some(g => g.checked);
    const earliestCheckedAt = group
      .map(g => g.checked_at)
      .filter((x): x is string => !!x)
      .sort()[0] ?? null;

    // Repoint child rows BEFORE deleting the orphan items, otherwise
    // their item_prices/comments/history get cascade-deleted.
    const orphanIds = rest.map(r => r.id);
    if (orphanIds.length > 0) {
      await supabase.from("item_prices").update({ item_id: canonical.id }).in("item_id", orphanIds);
      await supabase.from("item_comments").update({ item_id: canonical.id }).in("item_id", orphanIds);
      await supabase.from("item_history").update({ item_id: canonical.id }).in("item_id", orphanIds);
    }

    const updates: Record<string, unknown> = {};
    if (canMergeQty && mergedQty > 0) updates.qty = String(mergedQty);
    if (!canonical.brand && inheritedBrand) updates.brand = inheritedBrand;
    if (anyChecked && !canonical.checked) {
      updates.checked = true;
      if (earliestCheckedAt) updates.checked_at = earliestCheckedAt;
    }
    if (Object.keys(updates).length > 0) {
      await supabase.from("items").update(updates).eq("id", canonical.id);
    }

    if (orphanIds.length > 0) {
      await supabase.from("items").delete().in("id", orphanIds);
      itemsRemoved += orphanIds.length;
    }
    groupsMerged += 1;
  }

  return { groupsMerged, itemsRemoved };
}

// Helper to format currency
export function formatPrice(value: number, currency: string): string {
  const symbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : currency === "PLN" ? "zł" : currency === "GBP" ? "£" : currency;
  return `${value.toFixed(2)}${symbol}`;
}

// Map country code → default currency
const COUNTRY_CURRENCY: Record<string, string> = {
  // Eurozone
  ES: "EUR", FR: "EUR", DE: "EUR", IT: "EUR", PT: "EUR", NL: "EUR", BE: "EUR",
  AT: "EUR", IE: "EUR", FI: "EUR", GR: "EUR", LU: "EUR", MT: "EUR", CY: "EUR",
  SK: "EUR", SI: "EUR", EE: "EUR", LV: "EUR", LT: "EUR", HR: "EUR",
  // Non-euro EU
  PL: "PLN", CZ: "CZK", HU: "HUF", RO: "RON", BG: "BGN", DK: "DKK", SE: "SEK",
  // Others
  GB: "GBP", US: "USD", CA: "CAD", MX: "MXN", AR: "ARS", BR: "BRL", CL: "CLP",
  CO: "COP", PE: "PEN", JP: "JPY", CN: "CNY", KR: "KRW", IN: "INR", AU: "AUD",
  NZ: "NZD", CH: "CHF", NO: "NOK", TR: "TRY", RU: "RUB", UA: "UAH", ZA: "ZAR",
};

export function getCountryCurrency(countryCode: string | undefined): string {
  if (!countryCode) return "EUR";
  return COUNTRY_CURRENCY[countryCode.toUpperCase()] ?? "EUR";
}

// Most popular grocery store per country — used as placeholder example
const COUNTRY_POPULAR_STORE: Record<string, string> = {
  ES: "Mercadona", FR: "Carrefour", DE: "Edeka", IT: "Conad", PT: "Continente",
  NL: "Albert Heijn", BE: "Colruyt", AT: "Billa", IE: "Tesco", FI: "K-Market",
  GR: "Sklavenitis", LU: "Cactus", SE: "ICA", DK: "Netto", NO: "Rema 1000",
  PL: "Biedronka", CZ: "Albert", HU: "Tesco", RO: "Lidl", BG: "Billa",
  SK: "Tesco", SI: "Mercator", HR: "Konzum", EE: "Selver", LV: "Rimi", LT: "Maxima",
  GB: "Tesco", US: "Walmart", CA: "Loblaws", MX: "Walmart", AR: "Carrefour",
  BR: "Carrefour", CL: "Jumbo", CO: "Éxito", PE: "Plaza Vea",
  JP: "Aeon", CN: "Walmart", KR: "E-Mart", IN: "Big Bazaar",
  AU: "Woolworths", NZ: "Countdown", CH: "Migros", TR: "Migros",
  RU: "Pyaterochka", UA: "Silpo", ZA: "Pick n Pay",
};

export function getCountryPopularStore(countryCode: string | undefined): string {
  if (!countryCode) return "Supermercado";
  return COUNTRY_POPULAR_STORE[countryCode.toUpperCase()] ?? "Supermercado";
}
