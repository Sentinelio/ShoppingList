import { supabase, IS_DEMO } from './supabase';
import { LOCAL_DICTIONARY, type DictEntry as LocalDictEntry } from '../data/localDictionary';

export interface TranslateResult {
  translations: Record<string, string>;
  category: string;
}

const LANG_KEYS: (keyof LocalDictEntry)[] = ['en', 'es', 'pl', 'de', 'fr', 'it', 'pt'];

/**
 * Search the local dictionary matching against all language fields (case-insensitive).
 */
export function findInLocalDict(text: string): LocalDictEntry | undefined {
  const normalized = text.toLowerCase().trim();
  return LOCAL_DICTIONARY.find((entry) =>
    LANG_KEYS.some((lang) => {
      const val = entry[lang];
      return typeof val === 'string' && val.toLowerCase() === normalized;
    })
  );
}

/**
 * Translate a product name through a three-level pipeline:
 * 1. Local dictionary
 * 2. Supabase dictionary table (skipped in demo mode)
 * 3. Supabase Edge Function (skipped in demo mode — returns original text)
 */
export async function translateProduct(
  text: string,
  targetLangs: string[]
): Promise<TranslateResult> {
  const normalized = text.toLowerCase().trim();

  // ── 1. Local dictionary ────────────────────────────────
  const localMatch = findInLocalDict(normalized);
  if (localMatch) {
    const translations: Record<string, string> = {};
    for (const lang of targetLangs) {
      const val = localMatch[lang as keyof LocalDictEntry];
      if (typeof val === 'string') {
        translations[lang] = val;
      }
    }
    // Ensure en is always present
    if (!translations.en && localMatch.en) translations.en = localMatch.en;
    return { translations, category: localMatch.cat };
  }

  // In demo mode, skip Supabase calls — return original text for all langs
  if (IS_DEMO) {
    const translations: Record<string, string> = {};
    for (const lang of targetLangs) {
      translations[lang] = text;
    }
    if (!translations.en) translations.en = text;
    return { translations, category: 'other' };
  }

  // ── 2. Supabase dictionary table ───────────────────────
  const { data: dbEntry } = await supabase
    .from('dictionary')
    .select('*')
    .eq('key', normalized)
    .single();

  if (dbEntry) {
    const translations: Record<string, string> = {};
    for (const lang of targetLangs) {
      if (dbEntry.translations?.[lang]) {
        translations[lang] = dbEntry.translations[lang];
      }
    }
    return { translations, category: dbEntry.category ?? '' };
  }

  // ── 3. Supabase Edge Function ──────────────────────────
  const { data: fnData, error } = await supabase.functions.invoke('translate', {
    body: { text, langs: targetLangs },
  });

  if (error) {
    throw new Error(`Translation failed: ${error.message}`);
  }

  const result: TranslateResult = {
    translations: fnData.translations ?? {},
    category: fnData.category ?? '',
  };

  // Save to dictionary table for future lookups
  await supabase.from('dictionary').upsert({
    key: normalized,
    translations: result.translations,
    category: result.category,
  });

  return result;
}
