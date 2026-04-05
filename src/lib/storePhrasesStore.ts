// Store-mode phrases fetched from the `store_phrases` Supabase table,
// cached in module scope and exposed via a tiny pub/sub so StoreMode and
// the Admin page stay in sync when the admin edits them.
//
// Falls back to the hardcoded list in src/data/storePhrases.ts when the
// remote fetch fails or we're in demo mode — the shopper never sees an
// empty phrase bar.

import { supabase, IS_DEMO } from "./supabase";
import { STORE_PHRASES as FALLBACK_PHRASES, type StorePhrase as LegacyStorePhrase } from "../data/storePhrases";

export interface StorePhrase {
  id?: string;
  key: string;
  emoji: string;
  sort_order: number;
  translations: Record<string, string>;
  usage_count?: number;
  last_used_at?: string | null;
}

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

let cache: StorePhrase[] | null = null;
let loadingPromise: Promise<StorePhrase[]> | null = null;
const listeners = new Set<(phrases: StorePhrase[]) => void>();

function notify() {
  listeners.forEach(fn => fn(cache ?? FALLBACK));
}

// Bulk insert the fallback phrases into an empty table so subsequent edits
// (upsert, delete, usage tracking) actually hit real rows. We go through
// upsert with onConflict:"key" so running this twice is a no-op.
async function seedFallbackIntoDb(): Promise<void> {
  try {
    const payload = FALLBACK.map(p => ({
      key: p.key,
      emoji: p.emoji,
      sort_order: p.sort_order,
      translations: p.translations,
    }));
    await supabase.from("store_phrases").upsert(payload, { onConflict: "key" });
  } catch { /* ignore — the caller will still return the in-memory fallback */ }
}

async function fetchFromRemote(): Promise<StorePhrase[]> {
  if (IS_DEMO) return FALLBACK;
  try {
    const { data, error } = await supabase
      .from("store_phrases")
      .select("id, key, emoji, translations, sort_order, usage_count, last_used_at")
      .order("sort_order", { ascending: true });
    // Actual error (missing table, permission denied, network) — fall back
    // to the hardcoded list so StoreMode still shows phrases to shoppers.
    if (error) return FALLBACK;
    // Table exists but has no rows — seed it from the fallback once so the
    // admin's CRUD actions land on real rows. Without this, deletes and
    // edits silently do nothing because the admin is editing in-memory data.
    if (!data || data.length === 0) {
      await seedFallbackIntoDb();
      const { data: seeded } = await supabase
        .from("store_phrases")
        .select("id, key, emoji, translations, sort_order, usage_count, last_used_at")
        .order("sort_order", { ascending: true });
      return (seeded as StorePhrase[] | null) ?? FALLBACK;
    }
    return data as StorePhrase[];
  } catch {
    return FALLBACK;
  }
}

// Local optimistic counter bumps so the Admin reflects usage instantly after
// a shopper taps a phrase, without waiting for a round-trip refetch.
const localBumps: Record<string, number> = {};

/** Fire-and-forget increment when a shopper taps a phrase in StoreMode.
 *  Uses the SQL RPC defined in migration 005 so the increment is atomic. */
export async function incrementPhraseUsage(key: string): Promise<void> {
  localBumps[key] = (localBumps[key] ?? 0) + 1;
  if (cache) {
    const row = cache.find(p => p.key === key);
    if (row) {
      row.usage_count = (row.usage_count ?? 0) + 1;
      row.last_used_at = new Date().toISOString();
      notify();
    }
  }
  if (IS_DEMO) return;
  try {
    await supabase.rpc("increment_store_phrase_usage", { p_key: key });
  } catch { /* ignore — local bump still applied */ }
}

/** Ensure the cache is populated. Safe to call repeatedly. */
export async function ensureStorePhrasesLoaded(): Promise<StorePhrase[]> {
  if (cache) return cache;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    cache = await fetchFromRemote();
    notify();
    return cache;
  })();
  try {
    return await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}

/** Synchronous snapshot for React subscribers. Returns fallback until the
 *  first remote fetch resolves. */
export function getStorePhrases(): StorePhrase[] {
  return cache ?? FALLBACK;
}

export function subscribeStorePhrases(fn: (phrases: StorePhrase[]) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Force a fresh re-fetch from Supabase after the admin edits something. */
export async function refreshStorePhrases(): Promise<StorePhrase[]> {
  cache = await fetchFromRemote();
  notify();
  return cache;
}

// ── mutations (admin only) ─────────────────────────────────────────────────

export async function upsertStorePhrase(p: StorePhrase): Promise<void> {
  if (IS_DEMO) throw new Error("Demo mode — phrases are read-only");
  // If the cache is still showing the in-memory fallback (because the DB
  // was empty on first load), seed it now so subsequent edits of OTHER
  // default phrases also land on real rows.
  if (cache && cache.length > 0 && !cache[0].id) {
    await seedFallbackIntoDb();
  }
  // Strip `id` from the payload — keying on `key` via onConflict is enough,
  // and omitting id lets Supabase generate one for brand new phrases.
  const payload = {
    key: p.key,
    emoji: p.emoji,
    sort_order: p.sort_order,
    translations: p.translations,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("store_phrases").upsert(payload, { onConflict: "key" });
  if (error) throw error;
  await refreshStorePhrases();
}

export async function deleteStorePhrase(key: string): Promise<void> {
  if (IS_DEMO) throw new Error("Demo mode — phrases are read-only");
  // Ask Supabase to return the deleted row(s) so we can tell apart a
  // successful deletion from a silent no-op (when the row never existed in
  // the DB — typical when the admin sees fallback-only data).
  const { data, error } = await supabase
    .from("store_phrases")
    .delete()
    .eq("key", key)
    .select();
  if (error) throw error;
  if (!data || data.length === 0) {
    // The row wasn't in the DB. Seed the fallback and retry so the admin
    // can actually remove defaults they don't want.
    await seedFallbackIntoDb();
    const { data: second, error: retryErr } = await supabase
      .from("store_phrases")
      .delete()
      .eq("key", key)
      .select();
    if (retryErr) throw retryErr;
    if (!second || second.length === 0) {
      throw new Error(`Phrase '${key}' not found`);
    }
  }
  await refreshStorePhrases();
}

/** Returns how many phrases are missing a translation for the given lang. */
export function countMissingForLang(lang: string, phrases: StorePhrase[] = cache ?? FALLBACK): number {
  return phrases.filter(p => !p.translations[lang]?.trim()).length;
}

/** Call the translate Edge Function for every phrase that lacks `lang`
 *  and upsert the result. Fills the admin's new language with minimal
 *  effort. */
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
        const nextTranslations = { ...phrase.translations, [lang]: translated };
        await supabase
          .from("store_phrases")
          .update({ translations: nextTranslations, updated_at: new Date().toISOString() })
          .eq("key", phrase.key);
        filled++;
      } catch { /* skip */ }
    }));
    onProgress?.(Math.min(i + CONCURRENCY, missing.length), missing.length);
  }
  await refreshStorePhrases();
  return { filled };
}
