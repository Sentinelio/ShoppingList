import { useEffect, useState } from "react";
import { supabase, IS_DEMO, type ItemPrice, type ItemComment, type ItemHistoryEvent } from "../lib/supabase";
import { getItemPrices, getItemComments, getItemHistory } from "../lib/itemData";

// ── PRICES ─────────────────────────────────────────────────────────────

export function useItemPrices(itemId: string | undefined): ItemPrice[] {
  const [prices, setPrices] = useState<ItemPrice[]>([]);

  useEffect(() => {
    if (!itemId) { setPrices([]); return; }
    let cancelled = false;
    getItemPrices(itemId).then(p => { if (!cancelled) setPrices(p); });

    if (IS_DEMO || !supabase) return () => { cancelled = true; };

    const channel = supabase
      .channel(`item_prices:${itemId}`)
      .on(
        "postgres_changes" as "system",
        { event: "*", schema: "public", table: "item_prices", filter: `item_id=eq.${itemId}` } as unknown as { event: "system" },
        () => { getItemPrices(itemId).then(p => { if (!cancelled) setPrices(p); }); }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
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

    if (IS_DEMO || !supabase) return () => { cancelled = true; };

    const channel = supabase
      .channel(`item_comments:${itemId}`)
      .on(
        "postgres_changes" as "system",
        { event: "*", schema: "public", table: "item_comments", filter: `item_id=eq.${itemId}` } as unknown as { event: "system" },
        () => { getItemComments(itemId).then(c => { if (!cancelled) setComments(c); }); }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
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

    if (IS_DEMO || !supabase) return () => { cancelled = true; };

    const channel = supabase
      .channel(`item_history:${itemId}`)
      .on(
        "postgres_changes" as "system",
        { event: "*", schema: "public", table: "item_history", filter: `item_id=eq.${itemId}` } as unknown as { event: "system" },
        () => { getItemHistory(itemId).then(h => { if (!cancelled) setHistory(h); }); }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [itemId]);

  return history;
}
