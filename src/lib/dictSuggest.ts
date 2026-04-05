// Dictionary suggestion engine for the Add-item autocomplete.
//
// Loads the full dictionary from Supabase once (cached in module scope),
// merges it with LOCAL_DICTIONARY, pre-normalizes all translations into a
// single searchable string per entry, and exposes a fast substring matcher.

import { supabase, IS_DEMO } from "./supabase";
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
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("dictionary")
      .select("key, translations, category")
      .range(from, from + pageSize - 1);
    if (error || !data) break;
    for (const row of data as Array<{ key: string; translations: Record<string, string>; category: string }>) {
      const translations = row.translations || {};
      all.push({
        key: row.key,
        translations,
        category: row.category,
        haystack: buildHaystack(translations),
      });
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
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

/** Return up to `limit` suggestions matching `query`.
 *  Matches are prioritized:
 *    1. Items whose localized name in `userLang` starts with the query
 *    2. Items whose localized name in `userLang` contains the query
 *    3. Items whose any translation contains the query
 */
export async function suggest(
  query: string,
  userLang: string,
  limit = 8,
): Promise<DictSuggestion[]> {
  const q = normalize(query).trim();
  if (q.length < 2) return [];
  const entries = await ensureLoaded();
  const starts: DictSuggestion[] = [];
  const contains: DictSuggestion[] = [];
  const others: DictSuggestion[] = [];
  for (const entry of entries) {
    const localized = entry.translations[userLang];
    if (localized) {
      const n = normalize(localized);
      if (n.startsWith(q)) { starts.push(entry); continue; }
      if (n.includes(q)) { contains.push(entry); continue; }
    }
    if (entry.haystack.includes(q)) others.push(entry);
  }
  return [...starts, ...contains, ...others].slice(0, limit);
}

/** Synchronous variant for when the dictionary is already preloaded.
 *  Returns an empty list if the cache isn't ready yet. */
export function suggestSync(
  query: string,
  userLang: string,
  limit = 8,
): DictSuggestion[] {
  if (!CACHE) return [];
  const q = normalize(query).trim();
  if (q.length < 2) return [];
  const starts: DictSuggestion[] = [];
  const contains: DictSuggestion[] = [];
  const others: DictSuggestion[] = [];
  for (const entry of CACHE) {
    const localized = entry.translations[userLang];
    if (localized) {
      const n = normalize(localized);
      if (n.startsWith(q)) { starts.push(entry); continue; }
      if (n.includes(q)) { contains.push(entry); continue; }
    }
    if (entry.haystack.includes(q)) others.push(entry);
  }
  return [...starts, ...contains, ...others].slice(0, limit);
}
