import { pb, IS_DEMO } from "./pocketbase";

// Item photos live in the `item_photos` collection (replaces the
// `item-photos` storage bucket); items.photo keeps the public file URL.
export async function uploadItemPhoto(file: File): Promise<string | null> {
  if (IS_DEMO) return null;

  const form = new FormData();
  form.append("file", await shrinkPhoto(file));
  form.append("uploaded_by", pb.authStore.record?.id ?? "");

  try {
    const rec = await pb.collection("item_photos").create(form);
    return pb.files.getURL(rec, rec.file as string);
  } catch (error) {
    console.error("[uploadItemPhoto]", error);
    throw error;
  }
}

// A phone photo is 3–15 MB; a product picture needs far less. Scales it to
// at most 1280 px on its long side and saves it as WebP (JPEG where the
// browser can't write WebP). GIFs (may be animated), small files and images
// the browser can't decode (HEIC on most browsers) go up unchanged.
const MAX_SIDE = 1280;
export async function shrinkPhoto(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.size < 300_000) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const toBlob = (type: string) => new Promise<Blob | null>(ok => canvas.toBlob(ok, type, 0.85));
    let blob = await toBlob("image/webp");
    if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg");
    if (!blob || blob.size >= file.size) return file;
    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    return new File([blob], `${file.name.replace(/\.[^.]*$/, "") || "photo"}.${ext}`, { type: blob.type });
  } catch {
    return file;
  }
}
