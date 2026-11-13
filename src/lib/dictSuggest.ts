// Dictionary suggestion engine for the Add-item autocomplete.
//
// Loads the full dictionary from Supabase once (cached in module scope),
// merges it with LOCAL_DICTIONARY, pre-normalizes all translations into a
// single searchable string per entry, and exposes a fast substring matcher.

import { pb, IS_DEMO } from "./pocketbase";
import { LOCAL_DICTIONARY } from "../data/localDictionary";

import { localToEntry, mergeEntries, normalize, rankSuggestions, remoteToEntry, type RankedSuggestion, type SuggestEntry } from "./suggestRank";

/** A ranked suggestion (see suggestRank.ts). */
export type DictSuggestion = RankedSuggestion;

let CACHE: SuggestEntry[] | null = null;
let loadingPromise: Promise<SuggestEntry[]> | null = null;

async function fetchRemoteDict(): Promise<SuggestEntry[]> {
  if (IS_DEMO) return [];
  try {
    const data = await pb.collection("dictionary").getFullList<{ key: string; translations: Record<string, string>; category: string; store_type?: string }>({
      batch: 1000,
      fields: "key,translations,category,store_type",
    });
    return data.map(remoteToEntry);
  } catch {
    return []; // offline: no remote suggestions
  }
}

async function ensureLoaded(): Promise<SuggestEntry[]> {
  if (CACHE) return CACHE;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    // LOCAL_DICTIONARY seeds autocomplete even before the remote load
    // completes on slow networks (see mergeEntries).
    CACHE = mergeEntries(LOCAL_DICTIONARY.map(localToEntry), await fetchRemoteDict());
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

/** Regional names ("en-GB": "sweets", "es-AR": "palta") the dictionary has
 *  for a product, found by its English name. Items copied their names from
 *  the dictionary before it had these, so the product page asks here. */
export async function dictionaryVariants(translations: Record<string, string> | null | undefined): Promise<Record<string, string>> {
  const en = normalize(translations?.en ?? "").trim();
  if (!en) return {};
  const entry = (await ensureLoaded()).find(e => normalize(e.key).trim() === en || normalize(e.translations.en ?? "").trim() === en);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(entry?.translations ?? {})) if (k.includes("-") && v) out[k] = v;
  return out;
}

/** Return up to `limit` suggestions matching `query`, best tier first
 *  (see matchTier). */
export async function suggest(
  query: string,
  userLang: string,
  limit = 8,
): Promise<DictSuggestion[]> {
  if (normalize(query).trim().length < 2) return [];
  return rankSuggestions(await ensureLoaded(), query, userLang, limit);
}

/** Synchronous variant for when the dictionary is already preloaded.
 *  Returns an empty list if the cache isn't ready yet. */
export function suggestSync(
  query: string,
  userLang: string,
  limit = 8,
): DictSuggestion[] {
  if (!CACHE) return [];
  return rankSuggestions(CACHE, query, userLang, limit);
}
