import { supabase, IS_DEMO, type Item } from "../lib/supabase";
import { demoAddItem, demoUpdateItem, demoDeleteItem, demoCheckDuplicate } from "../lib/demoStore";

export interface AddItemParams {
  listId: string;
  original: string;
  translations: Record<string, string>;
  category: string;
  qty: string;
  unit: string;
  note: string;
  addedBy: string;
  addedByName: string;
}

export async function addItem(params: AddItemParams): Promise<Item> {
  if (IS_DEMO) {
    return demoAddItem(params);
  }

  const { data, error } = await supabase
    .from("items")
    .insert({
      list_id: params.listId,
      original: params.original,
      translations: params.translations,
      category: params.category,
      qty: params.qty,
      unit: params.unit,
      note: params.note,
      added_by: params.addedBy,
      added_by_name: params.addedByName,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Item;
}

export async function updateItem(
  itemId: string,
  updates: Partial<Pick<Item, "original" | "translations" | "category" | "qty" | "unit" | "note" | "checked">>,
): Promise<Item> {
  if (IS_DEMO) {
    const result = demoUpdateItem(itemId, updates);
    if (!result) throw new Error("Item not found");
    return result;
  }

  const { data, error } = await supabase
    .from("items")
    .update(updates)
    .eq("id", itemId)
    .select()
    .single();

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
    .update({ checked })
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

export function useItems() {
  return {
    addItem,
    updateItem,
    toggleItem,
    deleteItem,
    checkDuplicate,
  };
}
