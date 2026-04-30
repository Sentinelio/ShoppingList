import { supabase, IS_DEMO, type Item } from "../lib/supabase";
import { demoAddItem, demoUpdateItem, demoDeleteItem, demoCheckDuplicate } from "../lib/demoStore";
import { productKey } from "../lib/itemData";

export interface AddItemParams {
  listId: string;
  original: string;
  translations: Record<string, string>;
  category: string;
  qty: string;
  unit: string;
  note: string;
  brand?: string;
  photo?: string | null;
  important?: boolean;
  addedBy: string;
  addedByName: string;
}

export async function addItem(params: AddItemParams): Promise<Item> {
  if (IS_DEMO) {
    return demoAddItem(params);
  }

  // De-dup: if a non-checked item with the same canonical product_key
  // (name only, brand-agnostic) already exists in this list, sum quantities
  // instead of creating a second row. The existing item's brand wins;
  // empty brand gets filled from the new add. If units differ or qty isn't
  // numeric, the existing qty is left untouched (no risky string concat).
  const targetKey = productKey(params.original);
  if (targetKey) {
    const { data: candidates } = await supabase
      .from("items")
      .select("id, original, brand, qty, unit")
      .eq("list_id", params.listId)
      .eq("checked", false);

    const existing = (candidates ?? []).find(
      c => productKey(c.original as string) === targetKey,
    );
    if (existing) {
      const oldQty = parseFloat((existing.qty as string) || "");
      const newQty = parseFloat(params.qty || "");
      const sameUnit = ((existing.unit as string) || "") === (params.unit || "");
      const updates: Record<string, unknown> = {};

      if (sameUnit && !isNaN(newQty)) {
        const sum = (isNaN(oldQty) ? 0 : oldQty) + newQty;
        updates.qty = String(sum);
      }
      if (!existing.brand && params.brand) {
        updates.brand = params.brand;
      }

      if (Object.keys(updates).length > 0) {
        const { data: merged, error: mergeErr } = await supabase
          .from("items")
          .update(updates)
          .eq("id", existing.id as string)
          .select()
          .single();
        if (mergeErr) throw mergeErr;
        return merged as Item;
      }
      // Nothing to update — return the existing item as-is so the UI just
      // surfaces it instead of creating a duplicate.
      const { data: asIs } = await supabase
        .from("items").select("*").eq("id", existing.id as string).single();
      if (asIs) return asIs as Item;
    }
  }

  const row: Record<string, unknown> = {
    list_id: params.listId,
    original: params.original,
    translations: params.translations,
    category: params.category,
    qty: params.qty,
    unit: params.unit,
    note: params.note,
    added_by: params.addedBy,
    added_by_name: params.addedByName,
  };
  if (params.photo) row.photo = params.photo;
  if (params.important) row.important = params.important;
  if (params.brand) row.brand = params.brand;

  let { data, error } = await supabase.from("items").insert(row).select().single();

  // If insert fails with photo/important, retry without optional columns
  if (error && (params.photo || params.important)) {
    delete row.photo;
    delete row.important;
    const retry = await supabase.from("items").insert(row).select().single();
    data = retry.data;
    error = retry.error;
  }

  if (error) throw error;
  return data as Item;
}

export async function updateItem(
  itemId: string,
  updates: Partial<Pick<Item, "original" | "translations" | "category" | "qty" | "unit" | "note" | "photo" | "important" | "checked" | "brand" | "checked_at">>,
): Promise<Item> {
  if (IS_DEMO) {
    const result = demoUpdateItem(itemId, updates);
    if (!result) throw new Error("Item not found");
    return result;
  }

  let { data, error } = await supabase
    .from("items")
    .update(updates)
    .eq("id", itemId)
    .select()
    .single();

  // If update fails because of unknown columns (photo/important), retry without them
  if (error && ("important" in updates || "photo" in updates)) {
    const safe: Record<string, unknown> = { ...updates };
    delete safe.important;
    delete safe.photo;
    if (Object.keys(safe).length > 0) {
      const retry = await supabase.from("items").update(safe).eq("id", itemId).select().single();
      data = retry.data;
      error = retry.error;
    } else {
      // Nothing to update on the server — return the item as-is
      const get = await supabase.from("items").select("*").eq("id", itemId).single();
      data = get.data;
      error = get.error;
    }
  }

  if (error) throw error;
  return data as Item;
}

export async function toggleItem(itemId: string, checked: boolean): Promise<Item> {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(10);
  }

  if (IS_DEMO) {
    const result = demoUpdateItem(itemId, { checked });
    if (!result) throw new Error("Item not found");
    return result;
  }

  const { data, error } = await supabase
    .from("items")
    .update({ checked, checked_at: checked ? new Date().toISOString() : null })
    .eq("id", itemId)
    .select()
    .single();

  if (error) throw error;
  return data as Item;
}

export async function deleteItem(itemId: string): Promise<void> {
  if (IS_DEMO) {
    demoDeleteItem(itemId);
    return;
  }
  const { error } = await supabase.from("items").delete().eq("id", itemId);
  if (error) throw error;
}

export async function checkDuplicate(
  listId: string,
  translations: Record<string, string>,
): Promise<Item | null> {
  if (IS_DEMO) {
    return demoCheckDuplicate(listId, translations);
  }

  const enName = translations.en?.toLowerCase();
  if (!enName) return null;

  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("list_id", listId);

  if (error || !data) return null;

  const match = (data as Item[]).find(
    (item) => item.translations.en?.toLowerCase() === enName,
  );

  return match ?? null;
}
