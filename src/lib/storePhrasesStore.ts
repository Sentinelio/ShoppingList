// Store-mode phrases — persisted in the existing `dictionary` table under
// the reserved category "_phrase", so we don't need a new migration.
//
// Schema reuse:
//   - dictionary.key          → phrase key ("thanks", "price", …)
//   - dictionary.translations → per-language text
//   - dictionary.category     → always "_phrase" for these rows
//
// Usage counts live in localStorage (per-device) because adding a column
// to dictionary would require a migration we want to avoid.

import { supabase, IS_DEMO } from "./supabase";
import { STORE_PHRASES as FALLBACK_PHRASES, type StorePhrase as LegacyStorePhrase } from "../data/storePhrases";

export const PHRASE_CATEGORY = "_phrase";
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

let cache: StorePhrase[] | null = null;
let loadingPromise: Promise<StorePhrase[]> | null = null;
const listeners = new Set<(phrases: StorePhrase[]) => void>();

function mergeUsage(phrases: StorePhrase[]): StorePhrase[] {
  const usage = readUsage();
  return phrases.map(p => ({
    ...p,
    usage_count: usage[p.key]?.count ?? 0,
    last_used_at: usage[p.key]?.last ?? null,
  }));
}

function notify() {
  listeners.forEach(fn => fn(cache ?? FALLBACK));
}

// ── Remote fetch (dictionary rows with category = _phrase) ────────────────

// Serialise sort_order + emoji into the translations JSON because dictionary
// doesn't have dedicated columns for them. Uses underscore keys that can't
// collide with real language codes.
function packRow(p: StorePhrase): { key: string; translations: Record<string, string>; category: string } {
  return {
    key: p.key,
    translations: {
      ...p.translations,
      _emoji: p.emoji,
      _sort: String(p.sort_order),
    },
    category: PHRASE_CATEGORY,
  };
}

interface DictRow {
  key: string;
  translations: Record<string, string> | null;
  category: string;
}

function unpackRow(row: DictRow, fallbackOrder: number): StorePhrase {
  const t = row.translations ?? {};
  const emoji = t._emoji ?? "💬";
  const sort = parseInt(t._sort ?? "", 10);
  const translations: Record<string, string> = {};
  for (const [k, v] of Object.entries(t)) {
    if (k.startsWith("_")) continue;
    if (typeof v === "string") translations[k] = v;
  }
  return {
    key: row.key,
    emoji,
    sort_order: Number.isFinite(sort) ? sort : fallbackOrder * 10,
    translations,
  };
}

// Track whether the dictionary is reachable at all. Distinguishes "offline /
// table missing" from "simply no phrases yet" so the admin can detect real
// failures.
let remoteOk = false;

async function seedFallbackIntoDictionary(): Promise<void> {
  if (IS_DEMO) return;
  try {
    const payload = FALLBACK.map(p => packRow(p));
    await supabase.from("dictionary").upsert(payload, { onConflict: "key" });
  } catch { /* ignore */ }
}

async function fetchFromRemote(): Promise<StorePhrase[]> {
  if (IS_DEMO) return FALLBACK;
  try {
    const { data, error } = await supabase
      .from("dictionary")
      .select("key, translations, category")
      .eq("category", PHRASE_CATEGORY);
    if (error) {
      remoteOk = false;
      return FALLBACK;
    }
    remoteOk = true;
    if (!data || data.length === 0) {
      // First time ever — seed the fallback phrases into dictionary so the
      // admin has something to edit.
      await seedFallbackIntoDictionary();
      const { data: seeded } = await supabase
        .from("dictionary")
        .select("key, translations, category")
        .eq("category", PHRASE_CATEGORY);
      if (!seeded || seeded.length === 0) return FALLBACK;
      return (seeded as DictRow[])
        .map((r, i) => unpackRow(r, i))
        .sort((a, b) => a.sort_order - b.sort_order);
    }
    return (data as DictRow[])
      .map((r, i) => unpackRow(r, i))
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

/** Bump the per-device usage counter. Fire-and-forget from StoreMode. */
export async function incrementPhraseUsage(key: string): Promise<void> {
  const usage = readUsage();
  const prev = usage[key]?.count ?? 0;
  usage[key] = { count: prev + 1, last: new Date().toISOString() };
  writeUsage(usage);
  if (cache) {
    const row = cache.find(p => p.key === key);
    if (row) {
      row.usage_count = usage[key].count;
      row.last_used_at = usage[key].last;
      notify();
    }
  }
}

export async function ensureStorePhrasesLoaded(): Promise<StorePhrase[]> {
  if (cache) return cache;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    const remote = await fetchFromRemote();
    cache = mergeUsage(remote);
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
  return cache ?? mergeUsage(FALLBACK);
}

export function subscribeStorePhrases(fn: (phrases: StorePhrase[]) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export async function refreshStorePhrases(): Promise<StorePhrase[]> {
  const remote = await fetchFromRemote();
  cache = mergeUsage(remote);
  notify();
  return cache;
}

// ── Mutations ─────────────────────────────────────────────────────────────

export async function upsertStorePhrase(p: StorePhrase): Promise<void> {
  if (IS_DEMO) throw new Error("Demo mode — phrases are read-only");
  const payload = packRow(p);
  const { error } = await supabase.from("dictionary").upsert(payload, { onConflict: "key" });
  if (error) throw error;
  await refreshStorePhrases();
}

export async function deleteStorePhrase(key: string): Promise<void> {
  if (IS_DEMO) throw new Error("Demo mode — phrases are read-only");
  const { data, error } = await supabase
    .from("dictionary")
    .delete()
    .eq("key", key)
    .eq("category", PHRASE_CATEGORY)
    .select();
  if (error) throw error;
  if (!data || data.length === 0) {
    // Row wasn't in the dictionary yet (came from fallback). Seed and retry.
    await seedFallbackIntoDictionary();
    const { data: second, error: retryErr } = await supabase
      .from("dictionary")
      .delete()
      .eq("key", key)
      .eq("category", PHRASE_CATEGORY)
      .select();
    if (retryErr) throw retryErr;
    if (!second || second.length === 0) {
      throw new Error(`Phrase '${key}' not found`);
    }
  }
  await refreshStorePhrases();
}

export function countMissingForLang(lang: string, phrases: StorePhrase[] = cache ?? FALLBACK): number {
  return phrases.filter(p => !p.translations[lang]?.trim()).length;
}

export async function fillPhrasesForLang(
  lang: string,
  onProgress?: (done: number, total: number) => void,
): Promise<{ filled: number }> {
  if (IS_DEMO) throw new Error("Demo mode — phrases are read-only");
  const phrases = await ensureStorePhrasesLoaded();
  const missing = phrases.filter(p => !p.translations[lang]?.trim());
  if (missing.length === 0) return { filled: 0 };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  let filled = 0;
  const CONCURRENCY = 3;
  for (let i = 0; i < missing.length; i += CONCURRENCY) {
    const slice = missing.slice(i, i + CONCURRENCY);
    await Promise.all(slice.map(async phrase => {
      const source = phrase.translations.en ?? Object.values(phrase.translations)[0];
      if (!source) return;
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/translate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
            "apikey": supabaseKey,
          },
          body: JSON.stringify({ text: source, langs: [lang] }),
        });
        const data = await res.json();
        const translated = data?.t?.[lang] ?? data?.translations?.[lang];
        if (!translated) return;
        const next: StorePhrase = {
          ...phrase,
          translations: { ...phrase.translations, [lang]: translated },
        };
        await upsertStorePhrase(next);
        filled++;
      } catch { /* skip */ }
    }));
    onProgress?.(Math.min(i + CONCURRENCY, missing.length), missing.length);
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
