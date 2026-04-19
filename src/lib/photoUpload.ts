import { supabase, IS_DEMO } from "./supabase";

const BUCKET = "item-photos";

export async function uploadItemPhoto(file: File): Promise<string | null> {
  if (IS_DEMO || !supabase) return null;

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) {
    console.error("[uploadItemPhoto]", error);
    throw error;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
