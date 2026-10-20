import { pb, IS_DEMO } from "./pocketbase";

// Item photos live in the `item_photos` collection (replaces the
// `item-photos` storage bucket); items.photo keeps the public file URL.
export async function uploadItemPhoto(file: File): Promise<string | null> {
  if (IS_DEMO) return null;

  const form = new FormData();
  form.append("file", file);
  form.append("uploaded_by", pb.authStore.record?.id ?? "");

  try {
    const rec = await pb.collection("item_photos").create(form);
    return pb.files.getURL(rec, rec.file as string);
  } catch (error) {
    console.error("[uploadItemPhoto]", error);
    throw error;
  }
}
