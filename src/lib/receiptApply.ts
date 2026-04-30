// Persists a parsed receipt: creates the receipt row, updates or creates
// items for each included line, logs item_prices (so price history is
// populated with the ticket's store + price), and writes receipt_items
// linking everything for traceability.
//
// The apply is tolerant to per-line failures: each line is tried
// independently, failures are collected in the result, and the caller
// can decide whether to rollback (delete the receipt + newly-created
// items) or keep what succeeded.

import { supabase, IS_DEMO, type ParsedReceipt, type Receipt } from "./supabase";
import { addItem, toggleItem, updateItem, deleteItem } from "../hooks/useItems";
import { addItemPrice, logItemHistory } from "./itemData";

export interface ReviewedLine {
  include: boolean;
  raw_name: string;
  expanded_name: string | null;
  translations: Record<string, string>;
  category: string;
  brand: string | null;
  qty: number | null;
  unit: string | null;
  unit_price: number | null;
  total_price: number | null;
  discount: number;
  tax_category: string | null;
  confidence: string | null;
  // Which existing item (if any) this line applies to. null → create new.
  matched_item_id: string | null;
}

export interface LineOutcome {
  index: number;
  line: ReviewedLine;
  itemId: string | null;
  createdNew: boolean;
  error: string | null;
}

export interface ApplyReceiptParams {
  listId: string;
  parsed: ParsedReceipt;
  reviewed: ReviewedLine[];
  photoUrl: string | null;
  userId: string;
  userName: string;
  onProgress?: (done: number, total: number) => void;
  concurrency?: number;
}

export interface ApplyReceiptResult {
  receipt: Receipt | null;
  outcomes: LineOutcome[];
  errors: LineOutcome[];
}

function formatSbError(err: unknown): string {
  if (!err) return "unknown";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object") {
    const e = err as Record<string, unknown>;
    const parts = [e.message, e.details, e.hint, e.code].filter(Boolean);
    if (parts.length > 0) return parts.join(" · ");
  }
  try { return JSON.stringify(err); } catch { return "unknown"; }
}

// Run an async mapper on an array with a concurrency limit.
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers: Promise<void>[] = [];
  for (let w = 0; w < Math.max(1, limit); w++) {
    workers.push((async () => {
      while (true) {
        const i = cursor++;
        if (i >= items.length) return;
        results[i] = await fn(items[i], i);
      }
    })());
  }
  await Promise.all(workers);
  return results;
}

export async function applyReceipt(params: ApplyReceiptParams): Promise<ApplyReceiptResult> {
  if (IS_DEMO || !supabase) {
    return { receipt: null, outcomes: [], errors: [] };
  }

  const {
    listId, parsed, reviewed, photoUrl, userId, userName,
    onProgress, concurrency = 4,
  } = params;

  // 1. Create the receipt row.
  const { data: receiptRow, error: receiptErr } = await supabase
    .from("receipts")
    .insert({
      list_id: listId,
      store: parsed.store,
      store_address: parsed.store_address,
      nip: parsed.nip,
      receipt_date: parsed.date,
      currency: parsed.currency,
      total: parsed.total,
      photo_url: photoUrl,
      raw_json: parsed,
      added_by: userId,
      added_by_name: userName,
    })
    .select()
    .single();

  if (receiptErr) {
    throw new Error(`Receipt row insert failed: ${formatSbError(receiptErr)}`);
  }
  const receipt = receiptRow as Receipt;

  const store = parsed.store ?? "";
  const currency = parsed.currency ?? "EUR";
  const checkedAt = parsed.date ?? new Date().toISOString();

  const includedIndices = reviewed
    .map((r, i) => (r.include ? i : -1))
    .filter((i) => i >= 0);

  let done = 0;
  if (onProgress) onProgress(0, includedIndices.length);

  const outcomes = await mapLimit(includedIndices, concurrency, async (idx) => {
    const line = reviewed[idx];
    const outcome: LineOutcome = {
      index: idx,
      line,
      itemId: line.matched_item_id,
      createdNew: false,
      error: null,
    };

    try {
      let itemId = line.matched_item_id;

      if (!itemId) {
        const translations = { ...line.translations };
        const fallback = line.expanded_name || line.raw_name;
        if (!translations.en) translations.en = fallback;
        const original = translations.en;
        const created = await addItem({
          listId,
          original,
          translations,
          category: line.category || "other",
          qty: line.qty != null ? String(line.qty) : "",
          unit: line.unit ?? "",
          note: "",
          brand: line.brand ?? undefined,
          addedBy: userId,
          addedByName: userName,
        });
        itemId = created.id;
        outcome.createdNew = true;
        // Log creation so the history pane reflects receipt-imported items
        // the same way it does manually-added ones.
        logItemHistory({
          itemId, eventType: "created", icon: "🧾",
          description: `${userName} importó ${original} desde un ticket`,
          byUserId: userId, byUserName: userName,
        }).catch(err => console.warn("[applyReceipt] history:created failed", err));
      } else if (line.brand) {
        try { await updateItem(itemId, { brand: line.brand }); } catch { /* non-fatal */ }
      }

      outcome.itemId = itemId;

      await toggleItem(itemId, true);
      try { await updateItem(itemId, { checked_at: checkedAt }); } catch { /* non-fatal */ }
      logItemHistory({
        itemId, eventType: "purchased", icon: "✅",
        description: `${userName} marcó como comprado (ticket)`,
        byUserId: userId, byUserName: userName,
      }).catch(err => console.warn("[applyReceipt] history:purchased failed", err));

      // Store the unit price so the price book stays comparable across
      // purchases of different weights ("13.99 zł/kg" — not "8.76 zł
      // for this 0.634 kg tray"). Fall back to deriving it from
      // total_price ÷ qty when the receipt only gives the total. For
      // piece-counted items (qty 1, no unit), unit_price ≡ total_price.
      let priceToStore: number | null = null;
      let qtyToStore: number | null = null;
      let unitToStore: string | null = null;

      if (line.unit_price != null) {
        priceToStore = line.unit_price;
        qtyToStore = line.qty ?? null;
        unitToStore = line.unit ?? null;
      } else if (line.total_price != null) {
        if (line.qty != null && line.qty > 0) {
          priceToStore = line.total_price / line.qty;
          qtyToStore = line.qty;
          unitToStore = line.unit ?? null;
        } else {
          priceToStore = line.total_price;
        }
      }

      if (priceToStore != null) {
        try {
          await addItemPrice({
            itemId, store, price: priceToStore, currency,
            qty: qtyToStore, unit: unitToStore,
            addedBy: userId, addedByName: userName,
          });
        } catch (err) {
          console.warn("[applyReceipt] price insert failed", err);
        }
      }

      try {
        await supabase.from("receipt_items").insert({
          receipt_id: receipt.id,
          matched_item_id: itemId,
          raw_name: line.raw_name,
          expanded_name: line.expanded_name,
          brand: line.brand,
          qty: line.qty,
          unit: line.unit,
          unit_price: line.unit_price,
          total_price: line.total_price,
          discount: line.discount,
          tax_category: line.tax_category,
          confidence: line.confidence,
        });
      } catch (err) {
        console.warn("[applyReceipt] receipt_items insert failed", err);
      }
    } catch (err) {
      outcome.error = formatSbError(err);
      console.error("[applyReceipt] line failed", idx, line.raw_name, err);
    } finally {
      done++;
      if (onProgress) onProgress(done, includedIndices.length);
    }
    return outcome;
  });

  const errors = outcomes.filter((o) => o.error);
  return { receipt, outcomes, errors };
}

// Best-effort rollback when the user aborts a partial import. Deletes the
// newly-created items and the receipt row (which cascades receipt_items +
// item_prices via FK). Does NOT touch matched items — their brand / toggle
// / checked_at already existed and may have changed organically.
export async function rollbackReceipt(
  result: ApplyReceiptResult,
): Promise<void> {
  if (IS_DEMO || !supabase || !result.receipt) return;

  const newItemIds = result.outcomes
    .filter((o) => o.createdNew && o.itemId)
    .map((o) => o.itemId as string);

  for (const id of newItemIds) {
    try { await deleteItem(id); } catch (err) { console.warn("[rollback] deleteItem", err); }
  }

  try {
    await supabase.from("receipts").delete().eq("id", result.receipt.id);
  } catch (err) {
    console.warn("[rollback] delete receipt", err);
  }
}
