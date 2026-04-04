// Only countries whose shelf language is in LANGS (has dictionary support)
// When a new language is added to LANGS, add its countries here too
export const COUNTRIES = [
  // English
  { code: "GB", name: "UK",           flag: "\u{1F1EC}\u{1F1E7}", lang: "en" },
  { code: "US", name: "USA",          flag: "\u{1F1FA}\u{1F1F8}", lang: "en" },
  { code: "IE", name: "Ireland",      flag: "\u{1F1EE}\u{1F1EA}", lang: "en" },
  { code: "AU", name: "Australia",    flag: "\u{1F1E6}\u{1F1FA}", lang: "en" },
  { code: "CA", name: "Canada",       flag: "\u{1F1E8}\u{1F1E6}", lang: "en" },
  // Spanish
  { code: "ES", name: "Spain",        flag: "\u{1F1EA}\u{1F1F8}", lang: "es" },
  { code: "MX", name: "Mexico",       flag: "\u{1F1F2}\u{1F1FD}", lang: "es" },
  { code: "AR", name: "Argentina",    flag: "\u{1F1E6}\u{1F1F7}", lang: "es" },
  // Polish
  { code: "PL", name: "Poland",       flag: "\u{1F1F5}\u{1F1F1}", lang: "pl" },
  // German
  { code: "DE", name: "Germany",      flag: "\u{1F1E9}\u{1F1EA}", lang: "de" },
  { code: "AT", name: "Austria",      flag: "\u{1F1E6}\u{1F1F9}", lang: "de" },
  { code: "CH", name: "Switzerland",  flag: "\u{1F1E8}\u{1F1ED}", lang: "de" },
  // French
  { code: "FR", name: "France",       flag: "\u{1F1EB}\u{1F1F7}", lang: "fr" },
  { code: "BE", name: "Belgium",      flag: "\u{1F1E7}\u{1F1EA}", lang: "fr" },
  // Italian
  { code: "IT", name: "Italy",        flag: "\u{1F1EE}\u{1F1F9}", lang: "it" },
  // Portuguese
  { code: "PT", name: "Portugal",     flag: "\u{1F1F5}\u{1F1F9}", lang: "pt" },
  { code: "BR", name: "Brazil",       flag: "\u{1F1E7}\u{1F1F7}", lang: "pt" },
] as const;

export type CountryCode = (typeof COUNTRIES)[number]["code"];

export function getCountryLang(code: string): string {
  return COUNTRIES.find(c => c.code === code)?.lang ?? "en";
}

export function getCountryFlag(code: string): string {
  return COUNTRIES.find(c => c.code === code)?.flag ?? "";
}
