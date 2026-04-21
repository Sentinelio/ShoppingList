import type { Item, ParsedReceiptLine } from "./supabase";

// Strip accents, lowercase, and remove numeric tails like "500g", "1l",
// "x6", "2x", "pack" — anything that is typically size/packaging noise so
// the same product doesn't miss a match because of "500g" vs "1kg".
const SIZE_TAIL_RE = /\b(\d+(?:[.,]\d+)?\s?(?:g|kg|ml|l|cl|pcs|pack|szt|opak|uds|ud)|x\s?\d+|\d+x)\b/gi;

export function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(SIZE_TAIL_RE, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): string[] {
  return normalizeForMatch(s).split(" ").filter((t) => t.length >= 3);
}

// Returns a similarity score in [0, 1]. Token-based Jaccard on meaningful
// (>=3 char) tokens, with a small boost when the shortest token of one
// side is a prefix of any token on the other side (catches "pomi" ↔
// "pomidor" style receipt abbreviations).
function similarity(a: string, b: string): number {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let intersect = 0;
  for (const t of ta) if (tb.has(t)) intersect++;
  const union = ta.size + tb.size - intersect;
  let score = intersect / union;
  // Prefix boost
  for (const x of ta) {
    for (const y of tb) {
      if (x === y) continue;
      const short = x.length <= y.length ? x : y;
      const long = x.length <= y.length ? y : x;
      if (short.length >= 4 && long.startsWith(short)) {
        score += 0.15;
        break;
      }
    }
  }
  return Math.min(1, score);
}

export interface MatchCandidate {
  item: Item;
  score: number;
}

// Pick the best existing item for a parsed receipt line. Checks the
// item's `original` plus all `translations` values, returning the
// highest-scoring candidate above the threshold, or null.
export function matchLineToItem(
  line: ParsedReceiptLine,
  items: Item[],
  threshold = 0.35,
): MatchCandidate | null {
  const query = line.expanded_name || line.raw_name;
  if (!query) return null;
  let best: MatchCandidate | null = null;
  for (const item of items) {
    const candidates = [item.original, ...Object.values(item.translations ?? {})];
    let topScore = 0;
    for (const c of candidates) {
      if (typeof c !== "string" || !c) continue;
      const s = similarity(query, c);
      if (s > topScore) topScore = s;
    }
    // Brand match gives a small boost (helps "Nestlé" ↔ "Nestle NAN")
    if (line.brand && item.brand && normalizeForMatch(line.brand) === normalizeForMatch(item.brand)) {
      topScore += 0.2;
    }
    if (!best || topScore > best.score) best = { item, score: topScore };
  }
  if (best && best.score >= threshold) return best;
  return null;
}
