import { supabase, IS_DEMO, type ParsedReceipt } from "./supabase";

const BUCKET = "receipt-photos";

export async function uploadReceiptPhoto(file: File): Promise<string | null> {
  if (IS_DEMO || !supabase) return null;

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) {
    console.error("[uploadReceiptPhoto]", error);
    throw error;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// Reads a File as base64 without the `data:...;base64,` prefix.
function fileToBase64(file: File): Promise<{ data: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [header, b64] = result.split(",");
      const m = header.match(/data:([^;]+);base64/);
      resolve({ data: b64, mediaType: m?.[1] ?? file.type ?? "image/jpeg" });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function parseReceipt(
  input: { file?: File; imageUrl?: string; targetLangs?: string[] },
): Promise<ParsedReceipt> {
  if (IS_DEMO || !supabase) {
    throw new Error("Receipt parsing requires Supabase connection");
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  let body: Record<string, unknown>;
  if (input.file) {
    const { data, mediaType } = await fileToBase64(input.file);
    body = { imageBase64: data, mediaType };
  } else if (input.imageUrl) {
    body = { imageUrl: input.imageUrl };
  } else {
    throw new Error("parseReceipt: file or imageUrl required");
  }
  if (input.targetLangs && input.targetLangs.length > 0) {
    body.targetLangs = input.targetLangs;
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/parse-receipt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "parse failed" }));
    throw new Error(err.error ?? `parse-receipt failed (${res.status})`);
  }

  return res.json() as Promise<ParsedReceipt>;
}
