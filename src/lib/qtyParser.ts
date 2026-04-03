export interface ParsedQty {
  qty: string | null;
  unit: string | null;
  text: string;
}

const QTY_RX = /^(\d+(?:[.,]\d+)?)(?:\s*(kg|g|l|ml|un|x|pcs|packs?|uds?|szt)\b)?\s*[.\-–]?\s*(.+)$/i;
const QTY_TRAIL = /^(.+?)\s+(\d+(?:[.,]\d+)?)(?:\s*(kg|g|l|ml|un|x|pcs|packs?|uds?|szt)\b)?$/i;
const QTY_X = /^(.+?)\s*[x×]\s*(\d+(?:[.,]\d+)?)$/i;

export function parseQty(text: string): ParsedQty {
  let m = QTY_RX.exec(text.trim());
  if (m) return {
    qty: m[1].replace(",", "."),
    unit: normalizeUnit(m[2] || "x"),
    text: m[3].trim()
  };
  m = QTY_X.exec(text.trim());
  if (m) return { qty: m[2].replace(",", "."), unit: "x", text: m[1].trim() };
  m = QTY_TRAIL.exec(text.trim());
  if (m) return {
    qty: m[2].replace(",", "."),
    unit: normalizeUnit(m[3] || "x"),
    text: m[1].trim()
  };
  return { qty: null, unit: null, text: text.trim() };
}

function normalizeUnit(u: string): string {
  return u.toLowerCase()
    .replace("packs", "pack")
    .replace("uds", "un")
    .replace("pcs", "x")
    .replace("szt", "x");
}
