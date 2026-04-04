// Core translation languages — these have full dictionary support
// Additional languages can be managed from the Admin panel
export const LANGS = [
  { code: "en", name: "English",    flag: "\u{1F1EC}\u{1F1E7}" },
  { code: "es", name: "Español",    flag: "\u{1F1EA}\u{1F1F8}" },
  { code: "pl", name: "Polski",     flag: "\u{1F1F5}\u{1F1F1}" },
  { code: "de", name: "Deutsch",    flag: "\u{1F1E9}\u{1F1EA}" },
  { code: "fr", name: "Français",   flag: "\u{1F1EB}\u{1F1F7}" },
  { code: "it", name: "Italiano",   flag: "\u{1F1EE}\u{1F1F9}" },
  { code: "pt", name: "Português",  flag: "\u{1F1F5}\u{1F1F9}" },
] as const;

export type LangCode = (typeof LANGS)[number]["code"];

export function getLangName(code: string): string {
  return LANGS.find(l => l.code === code)?.name ?? code;
}

export function getLangFlag(code: string): string {
  return LANGS.find(l => l.code === code)?.flag ?? "";
}
