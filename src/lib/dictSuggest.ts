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

// The catalog is ~2,500 entries (~600 KB): downloading it on every start or
// every return from standby cost a phone on mobile data many seconds. It is
// kept on the device and refreshed in the background (at most every few
// hours, or when the admin changes it — realtime); the copy in use is only
// swapped once the new one has arrived, so names never flicker.

type RemoteRow = { key: string; translations: Record<string, string>; category: string; store_type?: string };
const DEVICE_KEY = "bc_dictionary_v1";
const STALE_MS = 6 * 60 * 60 * 1000;

let CACHE: SuggestEntry[] | null = null;
/** English name (normalized) → entry, for the regional-word lookups. */
let BY_EN = new Map<string, SuggestEntry>();
let loadedAt = 0;
let remoteOk = false;
let loadingPromise: Promise<SuggestEntry[]> | null = null;
const listeners = new Set<() => void>();

function setCache(rows: RemoteRow[] | null) {
  CACHE = mergeEntries(LOCAL_DICTIONARY.map(localToEntry), (rows ?? []).map(remoteToEntry));
  BY_EN = new Map();
  for (const e of CACHE) {
    for (const k of [normalize(e.key).trim(), normalize(e.translations.en ?? "").trim()]) if (k && !BY_EN.has(k)) BY_EN.set(k, e);
  }
  listeners.forEach(fn => fn());
}

function readDevice(): { at: number; rows: RemoteRow[] } | null {
  try {
    const raw = localStorage.getItem(DEVICE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function fetchRemoteDict(): Promise<RemoteRow[] | null> {
  if (IS_DEMO) return [];
  try {
    const rows = await pb.collection("dictionary").getFullList<RemoteRow>({
      batch: 1000,
      fields: "key,translations,category,store_type",
      requestKey: "dictionary-full",
    });
    try { localStorage.setItem(DEVICE_KEY, JSON.stringify({ at: Date.now(), rows })); } catch { /* full: memory only */ }
    return rows;
  } catch {
    return null; // offline: keep what we have, try again later
  }
}

/** Downloads the catalog again and swaps it in when it arrives. */
async function refreshRemote(): Promise<void> {
  const rows = await fetchRemoteDict();
  if (rows) { remoteOk = true; loadedAt = Date.now(); setCache(rows); }
}

async function ensureLoaded(): Promise<SuggestEntry[]> {
  if (CACHE && (remoteOk || Date.now() - loadedAt < 60000)) return CACHE;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    // 1. The copy on this device, at once (no network).
    const saved = !CACHE ? readDevice() : null;
    if (saved?.rows?.length) {
      remoteOk = true;
      loadedAt = saved.at;
      setCache(saved.rows);
      if (Date.now() - saved.at > STALE_MS) void refreshRemote();
      return CACHE!;
    }
    // 2. First time on this device (or after an offline start): download.
    const rows = await fetchRemoteDict();
    remoteOk = !!rows;
    loadedAt = Date.now();
    setCache(rows);
    return CACHE!;
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

/** The admin changed the catalog (realtime): download it again in the
 *  background; the current copy stays in use until then. */
export function invalidateDictionaryCache(): void {
  void refreshRemote();
}

/** Back from standby: refresh only when the copy is old. */
export function refreshDictionaryIfStale(): void {
  if (!CACHE) { preloadDictionary(); return; }
  if (Date.now() - loadedAt > STALE_MS || !remoteOk) void refreshRemote();
}

/** Called whenever a (new) catalog copy is in use. */
export function onDictionaryUpdated(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// Plural of a regional word, for languages that add an ending: Spanish /
// Portuguese / French (+s, or +es after a consonant in Spanish) and English
// (+s, +es after s/x/z/ch/sh, -y → -ies). Other languages: unchanged.
function pluralize(word: string, lang: string): string {
  const w = word.trim();
  if (!w) return w;
  const parts = w.split(" ");
  const last = parts[parts.length - 1];
  let p = last;
  if (lang === "en") {
    if (/(s|x|z|ch|sh)$/i.test(last)) p = last + "es";
    else if (/[^aeiou]y$/i.test(last)) p = last.slice(0, -1) + "ies";
    else p = last + "s";
  } else if (lang === "es") {
    p = /[aeiouáéó]$/i.test(last) ? last + "s" : /z$/i.test(last) ? last.slice(0, -1) + "ces" : last + "es";
  } else if (lang === "pt" || lang === "fr") {
    p = /s$/i.test(last) ? last : last + "s";
  } else return w;
  parts[parts.length - 1] = p;
  return parts.join(" ");
}
// The product's name in `lang` is the dictionary's plus a plural ending.
const isPluralOf = (mine: string, dict: string) => {
  const a = normalize(mine).trim(), b = normalize(dict).trim();
  return !!b && a !== b && (a === b + "s" || a === b + "es" || (b.endsWith("y") && a === b.slice(0, -1) + "ies"));
};

/** Regional names ("en-GB": "sweets", "es-AR": "palta") the dictionary has
 *  for a product, found by its English name. Items copied their names from
 *  the dictionary before it had these, so they are looked up here. When the
 *  product is named in the plural ("patatas", dictionary "patata"), the
 *  regional word comes in the plural too ("papas"). */
export async function dictionaryVariants(translations: Record<string, string> | null | undefined): Promise<Record<string, string>> {
  return variantsFrom(await ensureLoaded(), translations);
}

/** Same, synchronous: empty until the dictionary has loaded. */
export function dictionaryVariantsSync(translations: Record<string, string> | null | undefined): Record<string, string> {
  return CACHE ? variantsFrom(CACHE, translations) : {};
}

/** Resolves once the dictionary is loaded (for screens that then re-read it). */
export function dictionaryReady(): Promise<void> {
  return ensureLoaded().then(() => undefined);
}

function variantsFrom(entries: SuggestEntry[], translations: Record<string, string> | null | undefined): Record<string, string> {
  const en = normalize(translations?.en ?? "").trim();
  if (!en) return {};
  const entry = entries === CACHE ? BY_EN.get(en) : entries.find(e => normalize(e.key).trim() === en || normalize(e.translations.en ?? "").trim() === en);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(entry?.translations ?? {})) {
    if (!k.includes("-") || !v) continue;
    const lang = k.split("-")[0];
    const mine = translations?.[lang] ?? "";
    out[k] = mine && isPluralOf(mine, entry!.translations[lang] ?? "") ? pluralize(v, lang) : v;
  }
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
