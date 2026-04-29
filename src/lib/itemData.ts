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
}): Promise<ItemPrice | null> {
  if (IS_DEMO || !supabase) return null;
  const { data, error } = await supabase
    .from("item_prices")
    .insert({
      item_id: params.itemId,
      store: params.store,
      price_value: params.price,
      currency: params.currency,
      added_by: params.addedBy,
      added_by_name: params.addedByName,
    })
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

  // Money stats from priced rows only
  const total = pricedRows.reduce((s, p) => s + Number(p.price_value), 0);
  const avg = pricedRows.length > 0 ? total / pricedRows.length : 0;

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

// Must stay in sync with compute_product_key() in 018_product_prices.sql.
export function productKey(name: string, brand?: string | null): string {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const base = norm(name ?? "");
  const b = brand ? norm(brand) : "";
  return b ? `${base}|${b}` : base;
}

export interface ProductAvg {
  avg: number;
  currency: string;
  count: number;
}

export async function getProductAvgsByKeys(
  keys: string[],
): Promise<Record<string, ProductAvg>> {
  if (IS_DEMO || !supabase || keys.length === 0) return {};
  const unique = Array.from(new Set(keys.filter(Boolean)));
  if (unique.length === 0) return {};
  const { data, error } = await supabase
    .from("product_prices")
    .select("product_key, price_value, currency")
    .in("product_key", unique);
  if (error || !data) return {};
  const groups: Record<string, { sum: number; count: number; currency: string }> = {};
  for (const row of data as Array<{ product_key: string; price_value: number; currency: string }>) {
    const g = groups[row.product_key] || { sum: 0, count: 0, currency: row.currency };
    g.sum += Number(row.price_value);
    g.count += 1;
    // Prefer the most common currency seen — first wins is fine for now.
    if (!g.currency) g.currency = row.currency;
    groups[row.product_key] = g;
  }
  const out: Record<string, ProductAvg> = {};
  for (const [key, g] of Object.entries(groups)) {
    out[key] = { avg: g.sum / g.count, currency: g.currency, count: g.count };
  }
  return out;
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
