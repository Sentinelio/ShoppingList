import { useEffect, useState } from "react";
import { pb, IS_DEMO, subscribe, type ItemPrice, type ItemComment, type ItemHistoryEvent } from "../lib/pocketbase";
import { getItemPrices, getItemComments, getItemHistory } from "../lib/itemData";

// Each hook loads the rows of one item and reloads them on any realtime
// change for that item. The subscription is closed on unmount.

// ── PRICES ─────────────────────────────────────────────────────────────

export function useItemPrices(itemId: string | undefined): ItemPrice[] {
  const [prices, setPrices] = useState<ItemPrice[]>([]);

  useEffect(() => {
    if (!itemId) { setPrices([]); return; }
    let cancelled = false;
    getItemPrices(itemId).then(p => { if (!cancelled) setPrices(p); });

    if (IS_DEMO) return () => { cancelled = true; };

    const unsubscribe = subscribe<ItemPrice>(
      "item_prices",
      pb.filter("item_id = {:itemId}", { itemId }),
      () => { getItemPrices(itemId).then(p => { if (!cancelled) setPrices(p); }); },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [itemId]);

  return prices;
}

// ── COMMENTS ───────────────────────────────────────────────────────────

export function useItemComments(itemId: string | undefined): ItemComment[] {
  const [comments, setComments] = useState<ItemComment[]>([]);

  useEffect(() => {
    if (!itemId) { setComments([]); return; }
    let cancelled = false;
    getItemComments(itemId).then(c => { if (!cancelled) setComments(c); });

    if (IS_DEMO) return () => { cancelled = true; };

    const unsubscribe = subscribe<ItemComment>(
      "item_comments",
      pb.filter("item_id = {:itemId}", { itemId }),
      () => { getItemComments(itemId).then(c => { if (!cancelled) setComments(c); }); },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [itemId]);

  return comments;
}

// ── HISTORY ────────────────────────────────────────────────────────────

export function useItemHistory(itemId: string | undefined): ItemHistoryEvent[] {
  const [history, setHistory] = useState<ItemHistoryEvent[]>([]);

  useEffect(() => {
    if (!itemId) { setHistory([]); return; }
    let cancelled = false;
    getItemHistory(itemId).then(h => { if (!cancelled) setHistory(h); });

    if (IS_DEMO) return () => { cancelled = true; };

    const unsubscribe = subscribe<ItemHistoryEvent>(
      "item_history",
      pb.filter("item_id = {:itemId}", { itemId }),
      () => { getItemHistory(itemId).then(h => { if (!cancelled) setHistory(h); }); },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [itemId]);

  return history;
}
