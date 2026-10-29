// Dictionary suggestion engine for the Add-item autocomplete.
//
// Loads the full dictionary from Supabase once (cached in module scope),
// merges it with LOCAL_DICTIONARY, pre-normalizes all translations into a
// single searchable string per entry, and exposes a fast substring matcher.

import { pb, IS_DEMO } from "./pocketbase";
import { LOCAL_DICTIONARY, type DictEntry } from "../data/localDictionary";

export interface DictSuggestion {
  key: string;                         // canonical english/original text
  translations: Record<string, string>; // language code → localized name
  category: string;
  /** Lowercased, accent-stripped concatenation of all language values — used
   *  for the substring match. Never shown to the user. */
  haystack: string;
}

const LANG_KEYS = ["en", "es", "pl", "de", "fr", "it", "pt"] as const;

let CACHE: DictSuggestion[] | null = null;
let loadingPromise: Promise<DictSuggestion[]> | null = null;

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function buildHaystack(translations: Record<string, string>): string {
  return Object.values(translations).map(normalize).join(" | ");
}

function localEntryToSuggestion(e: DictEntry): DictSuggestion {
  const tr: Record<string, string> = {};
  for (const k of LANG_KEYS) {
    const v = e[k];
    if (typeof v === "string" && v.trim()) tr[k] = v;
  }
  const key = e.en || Object.values(tr)[0] || "";
  return {
    key,
    translations: tr,
    category: e.cat,
    haystack: buildHaystack(tr),
  };
}

async function fetchRemoteDict(): Promise<DictSuggestion[]> {
  if (IS_DEMO) return [];
  const all: DictSuggestion[] = [];
  try {
    const data = await pb.collection("dictionary").getFullList<{ key: string; translations: Record<string, string>; category: string }>({
      batch: 1000,
      fields: "key,translations,category",
    });
    for (const row of data) {
      const translations = row.translations || {};
      all.push({
        key: row.key,
        translations,
        category: row.category,
        haystack: buildHaystack(translations),
      });
    }
  } catch { /* offline: no remote suggestions */ }
  return all;
}

async function ensureLoaded(): Promise<DictSuggestion[]> {
  if (CACHE) return CACHE;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    const remote = await fetchRemoteDict();
    // Seed with LOCAL_DICTIONARY so autocomplete works even before the
    // remote load completes on slow networks. Deduplicate by lowercased key.
    const byKey = new Map<string, DictSuggestion>();
    for (const entry of LOCAL_DICTIONARY) {
      const s = localEntryToSuggestion(entry);
      if (s.key) byKey.set(s.key.toLowerCase(), s);
    }
    for (const s of remote) {
      if (s.key) byKey.set(s.key.toLowerCase(), s);
    }
    CACHE = Array.from(byKey.values());
    return CACHE;
  })();
  try {
    return await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}

/** Preload the dictionary cache. Safe to call multiple times. */
export function preloadDictionary(): void {
  void ensureLoaded();
}

/** Drop the cache so the next suggestion call re-fetches. */
export function invalidateDictionaryCache(): void {
  CACHE = null;
}

/** Tier of `entry` for the normalized query `q` (lower is better), or -1
 *  when it doesn't match at all:
 *    0. exact match in any language
 *    1. the name in `userLang` starts with the query
 *    2. a name in any language, or one of its words, starts with the query
 *    3. the name in `userLang` contains the query
 *    4. any translation contains the query
 *  e.g. "por" → leek (pl "por", exact) before pork (fr "porc", prefix). */
function matchTier(entry: DictSuggestion, q: string, userLang: string): number {
  if (!entry.haystack.includes(q)) return -1;
  const names = Object.values(entry.translations).map(normalize);
  if (names.some(n => n === q)) return 0;
  const mine = entry.translations[userLang] ? normalize(entry.translations[userLang]) : "";
  if (mine.startsWith(q)) return 1;
  if (names.some(n => n.startsWith(q) || n.split(/[^\p{L}\p{N}]+/u).some(w => w.startsWith(q)))) return 2;
  if (mine.includes(q)) return 3;
  return 4;
}

function rank(entries: DictSuggestion[], query: string, userLang: string, limit: number): DictSuggestion[] {
  const q = normalize(query).trim();
  if (q.length < 2) return [];
  const tiers: DictSuggestion[][] = [[], [], [], [], []];
  for (const entry of entries) {
    const tier = matchTier(entry, q, userLang);
    if (tier >= 0) tiers[tier].push(entry);
  }
  return tiers.flat().slice(0, limit);
}

/** Return up to `limit` suggestions matching `query`, best tier first
 *  (see matchTier). */
export async function suggest(
  query: string,
  userLang: string,
  limit = 8,
): Promise<DictSuggestion[]> {
  if (normalize(query).trim().length < 2) return [];
  return rank(await ensureLoaded(), query, userLang, limit);
}

/** Synchronous variant for when the dictionary is already preloaded.
 *  Returns an empty list if the cache isn't ready yet. */
export function suggestSync(
  query: string,
  userLang: string,
  limit = 8,
): DictSuggestion[] {
  if (!CACHE) return [];
  return rank(CACHE, query, userLang, limit);
}
