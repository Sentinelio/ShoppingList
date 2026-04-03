export const LANGS = [
  { code: "en", name: "English",    flag: "\u{1F1EC}\u{1F1E7}" },
  { code: "es", name: "Español",    flag: "\u{1F1EA}\u{1F1F8}" },
  { code: "fr", name: "Français",   flag: "\u{1F1EB}\u{1F1F7}" },
  { code: "pt", name: "Português",  flag: "\u{1F1F5}\u{1F1F9}" },
  { code: "ru", name: "Русский",    flag: "\u{1F1F7}\u{1F1FA}" },
  { code: "pl", name: "Polski",     flag: "\u{1F1F5}\u{1F1F1}" },
  { code: "de", name: "Deutsch",    flag: "\u{1F1E9}\u{1F1EA}" },
  { code: "it", name: "Italiano",   flag: "\u{1F1EE}\u{1F1F9}" },
  { code: "zh", name: "中文",        flag: "\u{1F1E8}\u{1F1F3}" },
  { code: "hi", name: "हिन्दी",      flag: "\u{1F1EE}\u{1F1F3}" },
  { code: "ar", name: "العربية",     flag: "\u{1F1F8}\u{1F1E6}" },
  { code: "bn", name: "বাংলা",      flag: "\u{1F1E7}\u{1F1E9}" },
  { code: "ja", name: "日本語",      flag: "\u{1F1EF}\u{1F1F5}" },
] as const;

export type LangCode = (typeof LANGS)[number]["code"];

export function getLangName(code: string): string {
  return LANGS.find(l => l.code === code)?.name ?? code;
}

export function getLangFlag(code: string): string {
  return LANGS.find(l => l.code === code)?.flag ?? "";
}
