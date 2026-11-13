import { useEffect, useState } from "react";
import { IS_DEMO, subscribe, type ItemPrice, type ItemComment, type ItemHistoryEvent } from "../lib/pocketbase";
import { getItemPrices, getItemComments, getItemHistory, scopeFilter, type ProductScope } from "../lib/itemData";

// Each hook loads the rows of one product in its list (every time it was
// added, see ProductScope) and reloads them on any realtime change there.
// The subscription is closed on unmount.

// ── PRICES ─────────────────────────────────────────────────────────────

export function useItemPrices(itemId: string | undefined, listId?: string, productKey?: string): ItemPrice[] {
  const [prices, setPrices] = useState<ItemPrice[]>([]);

  useEffect(() => {
    if (!itemId) { setPrices([]); return; }
    let cancelled = false;
    const scope: ProductScope = { itemId, listId, productKey };
    getItemPrices(scope).then(p => { if (!cancelled) setPrices(p); });

    if (IS_DEMO) return () => { cancelled = true; };

    const unsubscribe = subscribe<ItemPrice>(
      "item_prices",
      scopeFilter(scope),
      () => { getItemPrices(scope).then(p => { if (!cancelled) setPrices(p); }); },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [itemId, listId, productKey]);

  return prices;
}

// ── COMMENTS ───────────────────────────────────────────────────────────

export function useItemComments(itemId: string | undefined, listId?: string, productKey?: string): ItemComment[] {
  const [comments, setComments] = useState<ItemComment[]>([]);

  useEffect(() => {
    if (!itemId) { setComments([]); return; }
    let cancelled = false;
    const scope: ProductScope = { itemId, listId, productKey };
    getItemComments(scope).then(c => { if (!cancelled) setComments(c); });

    if (IS_DEMO) return () => { cancelled = true; };

    const unsubscribe = subscribe<ItemComment>(
      "item_comments",
      scopeFilter(scope),
      () => { getItemComments(scope).then(c => { if (!cancelled) setComments(c); }); },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [itemId, listId, productKey]);

  return comments;
}

// ── HISTORY ────────────────────────────────────────────────────────────

export function useItemHistory(itemId: string | undefined, listId?: string, productKey?: string): ItemHistoryEvent[] {
  const [history, setHistory] = useState<ItemHistoryEvent[]>([]);

  useEffect(() => {
    if (!itemId) { setHistory([]); return; }
    let cancelled = false;
    const scope: ProductScope = { itemId, listId, productKey };
    getItemHistory(scope).then(h => { if (!cancelled) setHistory(h); });

    if (IS_DEMO) return () => { cancelled = true; };

    const unsubscribe = subscribe<ItemHistoryEvent>(
      "item_history",
      scopeFilter(scope),
      () => { getItemHistory(scope).then(h => { if (!cancelled) setHistory(h); }); },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [itemId, listId, productKey]);

  return history;
}
