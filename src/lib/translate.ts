import { supabase, IS_DEMO } from './supabase';
import { LOCAL_DICTIONARY, type DictEntry } from '../data/localDictionary';

export interface TranslateResult {
  translations: Record<string, string>;
  category: string;
}

// Build reverse lookup index: normalized word → dict entry
const DICT_INDEX: Record<string, DictEntry> = {};
const LANG_KEYS: (keyof DictEntry)[] = ['en', 'es', 'pl', 'de', 'fr', 'it', 'pt'];

// Initialize index
LOCAL_DICTIONARY.forEach(entry => {
  for (const k of LANG_KEYS) {
    const v = entry[k];
    if (typeof v === 'string') {
      DICT_INDEX[v.toLowerCase()] = entry;
    }
  }
});

export function addToDictIndex(entry: DictEntry) {
  for (const k of LANG_KEYS) {
    const v = entry[k];
    if (typeof v === 'string') {
      DICT_INDEX[v.toLowerCase()] = entry;
    }
  }
}

interface LocalMatch {
  translations?: Record<string, string>;
  category: string;
  exact: boolean;
}

function depluralForms(w: string): string[] {
  const forms: string[] = [];
  if (w.endsWith("ies")) forms.push(w.slice(0, -3) + "y");
  if (w.endsWith("ves")) forms.push(w.slice(0, -3) + "f");
  if (w.endsWith("es")) forms.push(w.slice(0, -2));
  if (w.endsWith("s") && !w.endsWith("ss")) forms.push(w.slice(0, -1));
  return forms;
}

function tryMatch(w: string): DictEntry | null {
  if (DICT_INDEX[w]) return DICT_INDEX[w];
  for (const d of depluralForms(w)) {
    if (DICT_INDEX[d]) return DICT_INDEX[d];
  }
  return null;
}

function dictToTranslations(entry: DictEntry): Record<string, string> {
  const tr: Record<string, string> = {};
  for (const k of LANG_KEYS) {
    const v = entry[k];
    if (typeof v === 'string') tr[k] = v;
  }
  return tr;
}

export function findInLocalDict(text: string): LocalMatch | null {
  const s = text.toLowerCase().trim();

  // 1. Exact or deplural match → full translation + category
  const exact = tryMatch(s);
  if (exact) return { translations: dictToTranslations(exact), category: exact.cat, exact: true };

  // 2. Strip prefixes → category ONLY
  const stripped = s
    .replace(/^(one|two|three|a |an |the |some |un |una |dos |tres |big |small |large |fresh |natural |organic |green |red |white |brown |raw |baked |powder |whole |half |sliced |maybe )/gi, "")
    .replace(/^(box of |bag of |pack of |bottle of |can of |jar of |piece of |slice of |bunch of |head of |for )/gi, "")
    .trim();
  if (stripped !== s) {
    const strippedMatch = tryMatch(stripped);
    if (strippedMatch) return { category: strippedMatch.cat, exact: false };
  }

  // 3. Word subsequence → category ONLY
  const words = s.split(/\s+/);
  for (let len = words.length; len >= 1; len--) {
    for (let start = 0; start <= words.length - len; start++) {
      const sub = words.slice(start, start + len).join(" ");
      const subMatch = tryMatch(sub);
      if (subMatch) return { category: subMatch.cat, exact: false };
    }
  }

  return null;
}

export async function translateProduct(
  text: string,
  targetLangs: string[],
  userLang: string = 'en'
): Promise<TranslateResult> {
  // 1. Local dictionary — only use if exact match
  const local = findInLocalDict(text);
  if (local?.exact && local.translations) {
    return { translations: local.translations, category: local.category };
  }

  // In demo mode without Supabase, skip API calls
  if (IS_DEMO) {
    const translations: Record<string, string> = {};
    for (const lang of targetLangs) {
      translations[lang] = text;
    }
    if (!translations.en) translations.en = text;
    return { translations, category: local?.category ?? 'other' };
  }

  // 2. Supabase dictionary table
  try {
    const { data: dbEntry } = await supabase
      .from('dictionary')
      .select('*')
      .eq('key', text.toLowerCase().trim())
      .single();

    if (dbEntry?.translations) {
      const translations: Record<string, string> = {};
      for (const lang of targetLangs) {
        if (dbEntry.translations[lang]) {
          translations[lang] = dbEntry.translations[lang];
        }
      }
      return { translations, category: dbEntry.category ?? 'other' };
    }
  } catch { /* continue to API */ }

  // 3. Supabase Edge Function (Claude API) — using direct fetch for reliability
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const fnUrl = `${supabaseUrl}/functions/v1/translate`;

  try {
    console.log('[BabelCart] Calling Edge Function:', fnUrl);
    const response = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
      body: JSON.stringify({ text, langs: targetLangs }),
    });

    console.log('[BabelCart] Response status:', response.status);
    const fnData = await response.json();
    console.log('[BabelCart] Response data:', JSON.stringify(fnData));

    if (!response.ok) {
      throw new Error(`Edge Function ${response.status}: ${JSON.stringify(fnData)}`);
    }

    // Handle both formats: {translations, category} or {t, c}
    const translations = fnData.translations ?? fnData.t ?? {};
    const category = fnData.category ?? fnData.c ?? local?.category ?? 'other';

    const result: TranslateResult = { translations, category };

    // Save to dictionary for future lookups
    try {
      await supabase.from('dictionary').upsert({
        key: text.toLowerCase().trim(),
        translations: result.translations,
        category: result.category,
      });
    } catch {
      // ignore upsert errors
    }

    return result;
  } catch (err) {
    console.error('[BabelCart] Translation failed:', err);
    const translations: Record<string, string> = { [userLang]: text, en: text };
    return { translations, category: local?.category ?? 'other' };
  }
}
