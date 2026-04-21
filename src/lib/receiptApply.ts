// Persists a parsed receipt: creates the receipt row, updates or creates
// items for each included line, logs item_prices (so price history is
// populated with the ticket's store + price), and writes receipt_items
// linking everything for traceability.

import { supabase, IS_DEMO, type ParsedReceipt, type Receipt } from "./supabase";
import { addItem, toggleItem, updateItem } from "../hooks/useItems";
import { addItemPrice } from "./itemData";

export interface ReviewedLine {
  include: boolean;
  raw_name: string;
  expanded_name: string | null;
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

export interface ApplyReceiptParams {
  listId: string;
  parsed: ParsedReceipt;
  reviewed: ReviewedLine[];
  photoUrl: string | null;
  userId: string;
  userName: string;
}

export async function applyReceipt(params: ApplyReceiptParams): Promise<Receipt | null> {
  if (IS_DEMO || !supabase) return null;

  const { listId, parsed, reviewed, photoUrl, userId, userName } = params;

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

  if (receiptErr) throw receiptErr;
  const receipt = receiptRow as Receipt;

  const store = parsed.store ?? "";
  const currency = parsed.currency ?? "EUR";
  const checkedAt = parsed.date ?? new Date().toISOString();

  // 2. Walk each reviewed line.
  for (const line of reviewed) {
    if (!line.include) continue;

    let itemId = line.matched_item_id;

    if (!itemId) {
      // Create a new item, pre-checked, so the user sees it in HECHOS.
      const name = line.expanded_name || line.raw_name;
      const created = await addItem({
        listId,
        original: name,
        translations: { en: name },
        category: "other",
        qty: line.qty != null ? String(line.qty) : "",
        unit: line.unit ?? "",
        note: "",
        brand: line.brand ?? undefined,
        addedBy: userId,
        addedByName: userName,
      });
      itemId = created.id;
    } else if (line.brand) {
      // Update brand if the existing item didn't have one.
      try {
        await updateItem(itemId, { brand: line.brand });
      } catch (err) {
        console.warn("[applyReceipt] brand update failed", err);
      }
    }

    // Mark as done (or re-mark; toggleItem sets checked_at to now, so
    // overwrite afterwards with the receipt date to preserve history).
    try {
      await toggleItem(itemId, true);
      await updateItem(itemId, { checked_at: checkedAt });
    } catch (err) {
      console.warn("[applyReceipt] toggle failed", err);
    }

    // Log the price at this store.
    if (line.unit_price != null || line.total_price != null) {
      const price = line.total_price ?? line.unit_price ?? 0;
      try {
        await addItemPrice({
          itemId,
          store,
          price,
          currency,
          addedBy: userId,
          addedByName: userName,
        });
      } catch (err) {
        console.warn("[applyReceipt] price insert failed", err);
      }
    }

    // Write the traceability row.
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
  }

  return receipt;
}
