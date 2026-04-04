import { ALL_LANGUAGES, type LangDef } from "../data/allLanguages";

const STORAGE_KEY = "babelcart_enabled_langs";
const UI_TRANSLATIONS_KEY = "babelcart_ui_translations";

// Default enabled languages
const DEFAULT_ENABLED = ["en", "es", "pl", "de", "fr", "it", "pt"];

// Get enabled language codes
export function getEnabledLangs(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return DEFAULT_ENABLED;
}

export function setEnabledLangs(codes: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
}

export function enableLang(code: string) {
  const current = getEnabledLangs();
  if (!current.includes(code)) {
    setEnabledLangs([...current, code]);
  }
}

export function disableLang(code: string) {
  // Can't disable English — it's the fallback
  if (code === "en") return;
  setEnabledLangs(getEnabledLangs().filter(c => c !== code));
}

// Get active language definitions (only enabled ones)
export function getActiveLangs(): { code: string; name: string; flag: string }[] {
  const enabled = getEnabledLangs();
  return enabled
    .map(code => {
      const lang = ALL_LANGUAGES.find(l => l.code === code);
      if (!lang) return null;
      return { code: lang.code, name: lang.name, flag: lang.flag };
    })
    .filter(Boolean) as { code: string; name: string; flag: string }[];
}

// Get active countries (from enabled languages only)
export function getActiveCountries(): { code: string; name: string; flag: string; lang: string }[] {
  const enabled = getEnabledLangs();
  const seen = new Set<string>();
  const countries: { code: string; name: string; flag: string; lang: string }[] = [];

  for (const langCode of enabled) {
    const lang = ALL_LANGUAGES.find(l => l.code === langCode);
    if (!lang) continue;
    for (const c of lang.countries) {
      if (!seen.has(c.code)) {
        seen.add(c.code);
        countries.push({ code: c.code, name: c.name, flag: c.flag, lang: langCode });
      }
    }
  }

  return countries;
}

// Get a language definition by code (from ALL languages, not just enabled)
export function getLangDef(code: string): LangDef | undefined {
  return ALL_LANGUAGES.find(l => l.code === code);
}

// ── Dynamic UI Translations ──

interface StoredTranslations {
  [langCode: string]: Record<string, string>;
}

export function getStoredUITranslations(): StoredTranslations {
  try {
    const stored = localStorage.getItem(UI_TRANSLATIONS_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return {};
}

export function saveUITranslations(langCode: string, translations: Record<string, string>) {
  const all = getStoredUITranslations();
  all[langCode] = translations;
  localStorage.setItem(UI_TRANSLATIONS_KEY, JSON.stringify(all));
}

export function getUITranslation(langCode: string, key: string): string | null {
  const all = getStoredUITranslations();
  return all[langCode]?.[key] ?? null;
}
