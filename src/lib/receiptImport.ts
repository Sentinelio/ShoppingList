import { IS_DEMO, callRoute, type ParsedReceipt } from "./pocketbase";

// The receipt photo is no longer uploaded up front: it is attached to the
// `photo` file field when the receipt row is created (see receiptApply.ts).

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
  if (IS_DEMO) {
    throw new Error("Receipt parsing requires a backend connection");
  }

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

  // Errors carry the server message, e.g. "not_a_receipt" (HTTP 422).
  return callRoute<ParsedReceipt>("parse-receipt", body);
}
