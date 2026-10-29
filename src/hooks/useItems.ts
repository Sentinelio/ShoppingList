import { pb, IS_DEMO, type Item } from "../lib/pocketbase";
import { demoAddItem, demoUpdateItem, demoDeleteItem, demoCheckDuplicate } from "../lib/demoStore";

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

  return pb.collection("items").create<Item>(row);
}

export async function updateItem(
  itemId: string,
  updates: Partial<Pick<Item, "original" | "translations" | "category" | "qty" | "unit" | "note" | "photo" | "important" | "checked" | "brand" | "checked_at" | "unavailable">>,
): Promise<Item> {
  if (IS_DEMO) {
    const result = demoUpdateItem(itemId, updates);
    if (!result) throw new Error("Item not found");
    return result;
  }

  return pb.collection("items").update<Item>(itemId, updates);
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

  return pb.collection("items").update<Item>(itemId, {
    checked,
    checked_at: checked ? new Date().toISOString() : null,
  });
}

export async function deleteItem(itemId: string): Promise<void> {
  if (IS_DEMO) {
    demoDeleteItem(itemId);
    return;
  }
  await pb.collection("items").delete(itemId);
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

  let data: Item[];
  try {
    data = await pb.collection("items").getFullList<Item>({
      filter: pb.filter("list_id = {:listId}", { listId }),
    });
  } catch {
    return null;
  }

  const match = data.find(
    (item) => item.translations?.en?.toLowerCase() === enName,
  );

  return match ?? null;
}
