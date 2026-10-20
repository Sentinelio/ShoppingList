// Store-mode phrases — persisted in the `store_phrases` collection
// (key, emoji, sort_order, translations). Seeded server-side by migration;
// editable only by admins.
//
// Usage counts are shown per device (localStorage); every tap is also
// reported to the server (POST /api/babelcart/phrase-used) for global stats.

import { pb, IS_DEMO, upsertByKey, pbFirst, callRoute } from "./pocketbase";
import { STORE_PHRASES as FALLBACK_PHRASES, type StorePhrase as LegacyStorePhrase } from "../data/storePhrases";
import { ALL_LANGUAGES } from "../data/allLanguages";

const USAGE_STORAGE_KEY = "babelcart_phrase_usage_v1";

export interface StorePhrase {
  key: string;
  emoji: string;
  sort_order: number;
  translations: Record<string, string>;
  usage_count?: number;
  last_used_at?: string | null;
}

// ── Legacy → new shape ────────────────────────────────────────────────────

function legacyToNew(p: LegacyStorePhrase, i: number): StorePhrase {
  const translations: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) {
    if (k === "key" || k === "emoji") continue;
    if (typeof v === "string") translations[k] = v;
  }
  return {
    key: p.key,
    emoji: p.emoji,
    sort_order: (i + 1) * 10,
    translations,
  };
}

const FALLBACK: StorePhrase[] = FALLBACK_PHRASES.map(legacyToNew);

// ── Usage counters in localStorage (per-device) ───────────────────────────

interface UsageRecord {
  count: number;
  last: string; // ISO timestamp
}
type UsageMap = Record<string, UsageRecord>;

function readUsage(): UsageMap {
  try {
    const raw = localStorage.getItem(USAGE_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as UsageMap;
  } catch { /* ignore */ }
  return {};
}

function writeUsage(u: UsageMap) {
  try {
    localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(u));
  } catch { /* ignore quota */ }
}

// ── Cache + pub/sub ───────────────────────────────────────────────────────
// `cache` MUST be a stable reference between consecutive getStorePhrases()
// calls, otherwise useSyncExternalStore (used by the useStorePhrases hook)
// will enter an infinite re-render loop (React error #185). We replace the
// reference only when the data actually changes (remote refetch, optimistic
// mutation, usage bump) and call notify() to announce the change.

function mergeUsage(phrases: StorePhrase[]): StorePhrase[] {
  const usage = readUsage();
  return phrases.map(p => ({
    ...p,
    usage_count: usage[p.key]?.count ?? 0,
    last_used_at: usage[p.key]?.last ?? null,
  }));
}

// Initialise the cache synchronously with the fallback+usage snapshot so the
// very first getStorePhrases() call already returns a stable reference. The
// remote fetch replaces this reference once the network round-trip completes.
let cache: StorePhrase[] = mergeUsage(FALLBACK);
let loadingPromise: Promise<StorePhrase[]> | null = null;
const listeners = new Set<(phrases: StorePhrase[]) => void>();

function notify() {
  listeners.forEach(fn => fn(cache));
}

// ── Remote fetch ──────────────────────────────────────────────────────────

interface PhraseRow {
  key: string;
  emoji: string;
  sort_order: number;
  translations: Record<string, string> | null;
}

function fromRow(row: PhraseRow, fallbackOrder: number): StorePhrase {
  const translations: Record<string, string> = {};
  for (const [k, v] of Object.entries(row.translations ?? {})) {
    if (typeof v === "string") translations[k] = v;
  }
  return {
    key: row.key,
    emoji: row.emoji || "💬",
    sort_order: Number.isFinite(row.sort_order) ? row.sort_order : fallbackOrder * 10,
    translations,
  };
}

function toRow(p: StorePhrase): Omit<PhraseRow, "key"> {
  return { emoji: p.emoji, sort_order: p.sort_order, translations: p.translations };
}

// Track whether the server is reachable at all. Distinguishes "offline"
// from "simply no phrases yet" so the admin can detect real failures.
let remoteOk = false;

async function fetchFromRemote(): Promise<StorePhrase[]> {
  if (IS_DEMO) return FALLBACK;
  try {
    const data = await pb.collection("store_phrases").getFullList<PhraseRow>({ sort: "sort_order" });
    remoteOk = true;
    if (data.length === 0) return FALLBACK;
    return data
      .map((r, i) => fromRow(r, i))
      .sort((a, b) => a.sort_order - b.sort_order);
  } catch {
    remoteOk = false;
    return FALLBACK;
  }
}

// Legacy flag kept for UI compatibility — the new design never requires a
// migration, so this always returns false once the dictionary is reachable.
export function isMigrationMissing(): boolean {
  return false;
}

// ── Public API ────────────────────────────────────────────────────────────

/** Bump the per-device usage counter. Fire-and-forget from StoreMode.
 *  Creates a NEW cache reference so subscribers re-render. */
export async function incrementPhraseUsage(key: string): Promise<void> {
  const usage = readUsage();
  const prev = usage[key]?.count ?? 0;
  usage[key] = { count: prev + 1, last: new Date().toISOString() };
  writeUsage(usage);
  cache = cache.map(p =>
    p.key === key
      ? { ...p, usage_count: usage[key].count, last_used_at: usage[key].last }
      : p,
  );
  notify();
  if (!IS_DEMO) callRoute("phrase-used", { key }).catch(() => { /* fire-and-forget */ });
}

// Tracks whether we've started the first remote load. Prevents every
// subsequent useStorePhrases() mount from triggering a refetch.
let hasLoadedRemote = false;

export async function ensureStorePhrasesLoaded(): Promise<StorePhrase[]> {
  if (hasLoadedRemote) return cache;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    const remote = await fetchFromRemote();
    cache = mergeUsage(remote);
    hasLoadedRemote = true;
    notify();
    return cache;
  })();
  try {
    return await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}

export function getStorePhrases(): StorePhrase[] {
  return cache;
}

export function subscribeStorePhrases(fn: (phrases: StorePhrase[]) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export async function refreshStorePhrases(): Promise<StorePhrase[]> {
  const remote = await fetchFromRemote();
  cache = mergeUsage(remote);
  hasLoadedRemote = true;
  notify();
  return cache;
}

// ── Mutations ─────────────────────────────────────────────────────────────

export async function upsertStorePhrase(p: StorePhrase): Promise<void> {
  if (IS_DEMO) throw new Error("Demo mode — phrases are read-only");
  await upsertByKey("store_phrases", p.key, toRow(p));
  await refreshStorePhrases();
}

export async function deleteStorePhrase(key: string): Promise<void> {
  if (IS_DEMO) throw new Error("Demo mode — phrases are read-only");
  const row = await pbFirst<{ id: string }>("store_phrases", "key = {:key}", { key });
  if (!row) throw new Error(`Phrase '${key}' not found`);
  await pb.collection("store_phrases").delete(row.id);
  await refreshStorePhrases();
}

/** Persist a new order for the entire phrase list. Assigns sort_order values
 *  as (index + 1) * 10 so future manual inserts can slot in between without
 *  touching every row. */
export async function reorderStorePhrases(orderedKeys: string[]): Promise<void> {
  if (IS_DEMO) throw new Error("Demo mode — phrases are read-only");
  const current = await ensureStorePhrasesLoaded();
  const byKey = new Map(current.map(p => [p.key, p]));
  // Optimistic local update so the admin sees the new order instantly even
  // before the server roundtrips complete.
  const next: StorePhrase[] = [];
  orderedKeys.forEach((key, i) => {
    const p = byKey.get(key);
    if (p) next.push({ ...p, sort_order: (i + 1) * 10 });
  });
  cache = mergeUsage(next);
  notify();
  // Persist each phrase's new sort_order by upserting the packed row.
  try {
    await Promise.all(
      next.map(p => upsertByKey("store_phrases", p.key, toRow(p))),
    );
  } catch {
    // If persistence fails we'll still have the optimistic local order.
    // Refresh to reconcile with whatever actually landed.
    await refreshStorePhrases();
    throw new Error("Failed to persist new order");
  }
}

export function countMissingForLang(lang: string, phrases: StorePhrase[] = cache): number {
  return phrases.filter(p => !p.translations[lang]?.trim()).length;
}

// Translate all missing phrases for a given language in a SINGLE API call by
// piggybacking on the translate-ui route (designed
// for natural UI sentences — not the product-oriented `translate` function
// which would misinterpret phrases like "Do you have more of this?" as a
// shopping query).
export async function fillPhrasesForLang(
  lang: string,
  onProgress?: (done: number, total: number) => void,
): Promise<{ filled: number }> {
  if (IS_DEMO) throw new Error("Demo mode — phrases are read-only");
  const phrases = await ensureStorePhrasesLoaded();
  const missing = phrases.filter(p => !p.translations[lang]?.trim());
  if (missing.length === 0) return { filled: 0 };

  const targetLangName = ALL_LANGUAGES.find(l => l.code === lang)?.name ?? lang;

  // Build a strings bag keyed by phrase key → English source. translate-ui
  // preserves the keys and translates only the values.
  const stringsToTranslate: Record<string, string> = {};
  for (const p of missing) {
    const source = p.translations.en ?? Object.values(p.translations).find(v => typeof v === "string");
    if (source) stringsToTranslate[p.key] = source;
  }
  if (Object.keys(stringsToTranslate).length === 0) return { filled: 0 };

  let translatedMap: Record<string, string> = {};
  try {
    const data = await callRoute<{ translations?: Record<string, string> }>("translate-ui", {
      strings: stringsToTranslate,
      targetLang: lang,
      targetLangName,
    });
    translatedMap = data?.translations ?? {};
  } catch (err) {
    throw new Error(`Translation request failed: ${(err as Error).message}`);
  }

  // Persist each translated phrase. We upsert one at a time rather than in
  // parallel so the optimistic cache sync via refreshStorePhrases at the end
  // reflects the final state without races.
  let filled = 0;
  const keys = Object.keys(stringsToTranslate);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const translation = translatedMap[key];
    if (!translation || typeof translation !== "string" || !translation.trim()) continue;
    const phrase = missing.find(p => p.key === key);
    if (!phrase) continue;
    try {
      await upsertStorePhrase({
        ...phrase,
        translations: { ...phrase.translations, [lang]: translation.trim() },
      });
      filled++;
    } catch { /* skip individual failures */ }
    onProgress?.(i + 1, keys.length);
  }
  await refreshStorePhrases();
  return { filled };
}

// Legacy helper kept for back-compat with the admin — now a no-op that
// resolves immediately because no migration is needed anymore.
export async function applyMigration005(): Promise<{ applied: number; failed: number; error?: string }> {
  await refreshStorePhrases();
  return { applied: 0, failed: 0 };
}

// Back-compat export for old import sites.
export function isRemoteReachable(): boolean {
  return remoteOk;
}
