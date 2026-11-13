import { useCallback, useEffect, useState } from "react";
import { pb, IS_DEMO } from "../lib/pocketbase";
import { useRefreshOnReturn } from "./useRefreshOnReturn";

// The purchase log (collection "purchases"): one row each time something was
// ticked as bought, kept when the list clears its bought items. Written only
// by the server; see pocketbase/pb_hooks/babelcart_purchases.pb.js.
export interface Purchase {
  id: string;
  list_id: string;
  user_id: string;
  item_id: string;
  product_key: string;
  original: string;
  translations: Record<string, string>;
  category: string;
  qty: string;
  unit: string;
  price: number;
  currency: string;
  bought_at: string;
  expand?: { user_id?: { name?: string } };
}

export interface PurchaseQuery {
  /** One list; omitted = all my lists (mine, or of lists I'm a member of). */
  listId?: string;
  /** One product (its product_key). */
  productKey?: string;
  /** Only the last N days. */
  days?: number;
  /** Me (for "all my lists"). */
  userId?: string;
  enabled?: boolean;
}

/** The product a purchase or an item is about: its English name, lower-cased. */
export function productKeyOf(x: { original?: string; translations?: Record<string, string> | null }): string {
  return String(x.translations?.en || x.original || "").trim().toLowerCase();
}

export function usePurchases({ listId, productKey, days, userId, enabled = true }: PurchaseQuery) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!enabled || IS_DEMO) { setPurchases([]); setLoading(false); return; }
    const parts: string[] = [];
    const params: Record<string, string> = {};
    if (listId) { parts.push("list_id = {:list}"); params.list = listId; }
    else if (userId) { parts.push("(user_id = {:me} || list_id.active_members.id ?= {:me})"); params.me = userId; }
    if (productKey) { parts.push("product_key = {:key}"); params.key = productKey; }
    if (days) { parts.push("bought_at >= {:since}"); params.since = new Date(Date.now() - days * 86400000).toISOString().replace("T", " "); }
    try {
      const rows = await pb.collection("purchases").getFullList<Purchase>({
        filter: parts.length ? pb.filter(parts.join(" && "), params) : "",
        sort: "-bought_at",
        expand: "user_id",
        fields: "id,list_id,user_id,item_id,product_key,original,translations,category,qty,unit,price,currency,bought_at,expand.user_id.name",
        batch: 1000,
      });
      setPurchases(rows);
    } catch (err) {
      console.error("[usePurchases]", err);
    }
    setLoading(false);
  }, [listId, productKey, days, userId, enabled]);

  useEffect(() => { void load(); }, [load]);
  useRefreshOnReturn(load);

  return { purchases, loading, reload: load };
}

export interface ProductTally {
  key: string;
  last: Purchase;
  count: number;
  /** Average days between purchases (null with a single one). */
  everyDays: number | null;
}

/** Purchases grouped by product, most bought first. */
export function tallyByProduct(purchases: Purchase[]): ProductTally[] {
  const map = new Map<string, Purchase[]>();
  for (const p of purchases) (map.get(p.product_key) ?? map.set(p.product_key, []).get(p.product_key)!).push(p);
  return [...map.entries()].map(([key, rows]) => {
    const times = rows.map(r => new Date(r.bought_at.replace(" ", "T")).getTime()).sort((a, b) => a - b);
    const span = times.length > 1 ? (times[times.length - 1] - times[0]) / 86400000 : 0;
    return { key, last: rows[0], count: rows.length, everyDays: times.length > 1 ? Math.max(1, Math.round(span / (times.length - 1))) : null };
  }).sort((a, b) => b.count - a.count || b.last.bought_at.localeCompare(a.last.bought_at));
}
