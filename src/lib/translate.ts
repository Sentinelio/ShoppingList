import { supabase, IS_DEMO, type DictEntry as DbDictEntry } from './supabase';
import { LOCAL_DICTIONARY, type DictEntry } from '../data/localDictionary';

export interface TranslateResult {
  translations: Record<string, string>;
  category: string;
  isBrand?: boolean;
}

// Collapse brand spelling variants down to the same key: strip spaces,
// hyphens, underscores, dots and punctuation, then lowercase. This makes
// "coca-cola", "Coca Cola", "cocacola", "COCA-COLA" and "coca.cola" all
// resolve to the same dictionary entry.
function normalizeKey(s: string): string {
  return s.toLowerCase().trim().replace(/[\s\-_.·'"]+/g, "");
}

// Build reverse lookup index: normalized word → dict entry
const DICT_INDEX: Record<string, DictEntry> = {};
const LANG_KEYS: (keyof DictEntry)[] = ['en', 'es', 'pl', 'de', 'fr', 'it', 'pt'];

// Initialize index — store both the lowercased form AND the fully-normalized
// form (punctuation-stripped) so we can match brand variants.
LOCAL_DICTIONARY.forEach(entry => {
  for (const k of LANG_KEYS) {
    const v = entry[k];
    if (typeof v === 'string') {
      DICT_INDEX[v.toLowerCase()] = entry;
      DICT_INDEX[normalizeKey(v)] = entry;
    }
  }
});

export function addToDictIndex(entry: DictEntry) {
  for (const k of LANG_KEYS) {
    const v = entry[k];
    if (typeof v === 'string') {
      DICT_INDEX[v.toLowerCase()] = entry;
      DICT_INDEX[normalizeKey(v)] = entry;
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
  // Try punctuation-stripped form ("coca-cola" → "cocacola")
  const collapsed = normalizeKey(w);
  if (collapsed !== w && DICT_INDEX[collapsed]) return DICT_INDEX[collapsed];
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
    // Preserve the user's input for their language if it differs from the
    // dict entry (e.g. they typed "pimientos" but the dict has "pimiento").
    // This keeps plurals and typos-as-typed visible to the user.
    const userInput = text.trim();
    const dictUserLang = local.translations[userLang];
    if (dictUserLang && dictUserLang.toLowerCase() !== userInput.toLowerCase()) {
      local.translations[userLang] = userInput;
    }
    // Check if local dict covers ALL requested languages
    const missingLangs = targetLangs.filter(l => !local.translations![l]);
    if (missingLangs.length === 0) {
      return { translations: local.translations, category: local.category };
    }
    // Local dict has partial coverage — continue to API for missing langs
    // but keep the local translations as a base
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

  // 2. Supabase dictionary table. Brands live there under their canonical
  // form, but the user may type any variant ("coca cola", "COCA-COLA") —
  // we query by the punctuation-stripped key.
  const normalizedKey = normalizeKey(text);
  try {
    // First try the exact (lowercased) key for back-compat with older rows.
    let dbEntry: DbDictEntry | null = null;
    const { data: exactHit } = await supabase
      .from('dictionary')
      .select('*')
      .eq('key', text.toLowerCase().trim())
      .single();
    if (exactHit) dbEntry = exactHit as DbDictEntry;

    // If nothing, look for any row whose `en` translation collapses to the
    // same normalized key (typical for brands stored as "Coca-Cola").
    if (!dbEntry) {
      const { data: candidates } = await supabase
        .from('dictionary')
        .select('*')
        .eq('is_brand', true);
      if (candidates) {
        for (const row of candidates as DbDictEntry[]) {
          const canonical = row.translations?.en ?? row.key;
          if (canonical && normalizeKey(canonical) === normalizedKey) {
            dbEntry = row;
            break;
          }
        }
      }
    }

    if (dbEntry?.translations) {
      const translations: Record<string, string> = {};
      for (const lang of targetLangs) {
        if (dbEntry.translations[lang]) {
          translations[lang] = dbEntry.translations[lang];
        }
      }
      // For brands, fill any missing language with the canonical string —
      // brand names don't translate.
      if (dbEntry.is_brand) {
        const canonical = dbEntry.translations.en ?? Object.values(dbEntry.translations)[0] ?? text;
        for (const lang of targetLangs) {
          if (!translations[lang]) translations[lang] = canonical;
        }
      }
      const missingLangs = targetLangs.filter(l => !translations[l]);
      if (missingLangs.length === 0) {
        return {
          translations,
          category: dbEntry.category ?? 'other',
          isBrand: dbEntry.is_brand ?? false,
        };
      }
      // Partial coverage — continue to API but merge with what we have
    }
  } catch { /* continue to API */ }

  // 3. Supabase Edge Function (Claude API) — using direct fetch for reliability
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const fnUrl = `${supabaseUrl}/functions/v1/translate`;

  try {
    const response = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
      body: JSON.stringify({ text, langs: targetLangs }),
    });

    const fnData = await response.json();

    if (!response.ok) {
      throw new Error(`Edge Function ${response.status}: ${JSON.stringify(fnData)}`);
    }

    // Handle both formats: {translations, category, isBrand} or {t, c, b}
    const apiTranslations = fnData.translations ?? fnData.t ?? {};
    const category = fnData.category ?? fnData.c ?? local?.category ?? 'other';
    const isBrand: boolean = fnData.isBrand ?? fnData.b ?? false;

    // Merge: local dict + DB + API (API wins for conflicts)
    const translations: Record<string, string> = {
      ...(local?.translations ?? {}),
      ...apiTranslations,
    };

    // For brands, backfill any missing language with the canonical string —
    // brand names are identical in every language.
    if (isBrand) {
      const canonical = translations.en ?? Object.values(translations)[0] ?? text;
      for (const lang of targetLangs) {
        if (!translations[lang]) translations[lang] = canonical;
      }
    }

    const result: TranslateResult = { translations, category, isBrand };

    // Save to dictionary for future lookups. Brands use their canonical
    // english form as the key (lowercase, normalized) so duplicate variants
    // resolve to the same row.
    try {
      const dictKey = isBrand
        ? normalizeKey(translations.en ?? text)
        : text.toLowerCase().trim();
      await supabase.from('dictionary').upsert({
        key: dictKey,
        translations: result.translations,
        category: result.category,
        is_brand: isBrand,
      });
    } catch {
      // ignore upsert errors
    }

    return result;
  } catch {
    const translations: Record<string, string> = { [userLang]: text, en: text };
    return { translations, category: local?.category ?? 'other' };
  }
}
