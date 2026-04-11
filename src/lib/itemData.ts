// CRUD + computed stats for per-item data: prices, comments, history.
// All operations use Supabase directly. RLS ensures only list members
// can read/write data for items in their lists.

import { supabase, IS_DEMO, type ItemPrice, type ItemComment, type ItemHistoryEvent } from "./supabase";

// ── PRICES ─────────────────────────────────────────────────────────────

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
  await supabase.from("item_history").insert({
    item_id: params.itemId,
    event_type: params.eventType,
    description: params.description,
    icon: params.icon ?? null,
    by_user_id: params.byUserId,
    by_user_name: params.byUserName,
  });
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
  if (prices.length === 0) {
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

  const total = prices.reduce((s, p) => s + Number(p.price_value), 0);
  const avg = total / prices.length;

  const sorted = [...prices].sort((a, b) => Number(a.price_value) - Number(b.price_value));
  const cheapest = sorted[0];
  const most_expensive = sorted[sorted.length - 1];

  // Frequency: average days between consecutive purchases
  let frequencyDays: number | null = null;
  if (prices.length > 1) {
    const sortedByDate = [...prices].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const totalDays = (new Date(sortedByDate[sortedByDate.length - 1].created_at).getTime()
      - new Date(sortedByDate[0].created_at).getTime()) / (1000 * 60 * 60 * 24);
    frequencyDays = Math.round(totalDays / (prices.length - 1));
  }

  // Group by store
  const byStoreMap: Record<string, number> = {};
  for (const p of prices) byStoreMap[p.store] = (byStoreMap[p.store] || 0) + 1;
  const byStore = Object.entries(byStoreMap)
    .map(([store, count]) => ({ store, count }))
    .sort((a, b) => b.count - a.count);
  const favoriteStore = byStore[0]?.store ?? null;
  const favoriteStoreCount = byStore[0]?.count ?? 0;

  // Group by user
  const byUserMap: Record<string, number> = {};
  for (const p of prices) {
    const name = p.added_by_name || "Unknown";
    byUserMap[name] = (byUserMap[name] || 0) + 1;
  }
  const byUser = Object.entries(byUserMap)
    .map(([name, count]) => ({ name, count, pct: Math.round((count / prices.length) * 100) }))
    .sort((a, b) => b.count - a.count);

  return {
    totalPurchases: prices.length,
    totalSpent: total,
    averagePrice: avg,
    bestPrice: Number(cheapest.price_value),
    bestStore: cheapest.store,
    worstPrice: Number(most_expensive.price_value),
    worstStore: most_expensive.store,
    currency: prices[0].currency,
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

// Helper to format currency
export function formatPrice(value: number, currency: string): string {
  const symbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : currency === "PLN" ? "zł" : currency;
  return `${value.toFixed(2)}${symbol}`;
}
