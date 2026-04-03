export const COUNTRIES = [
  { code: "PL", name: "Poland",       flag: "\u{1F1F5}\u{1F1F1}", lang: "pl" },
  { code: "ES", name: "Spain",        flag: "\u{1F1EA}\u{1F1F8}", lang: "es" },
  { code: "GB", name: "UK",           flag: "\u{1F1EC}\u{1F1E7}", lang: "en" },
  { code: "US", name: "USA",          flag: "\u{1F1FA}\u{1F1F8}", lang: "en" },
  { code: "DE", name: "Germany",      flag: "\u{1F1E9}\u{1F1EA}", lang: "de" },
  { code: "FR", name: "France",       flag: "\u{1F1EB}\u{1F1F7}", lang: "fr" },
  { code: "IT", name: "Italy",        flag: "\u{1F1EE}\u{1F1F9}", lang: "it" },
  { code: "PT", name: "Portugal",     flag: "\u{1F1F5}\u{1F1F9}", lang: "pt" },
  { code: "NL", name: "Netherlands",  flag: "\u{1F1F3}\u{1F1F1}", lang: "nl" },
  { code: "BE", name: "Belgium",      flag: "\u{1F1E7}\u{1F1EA}", lang: "fr" },
  { code: "AT", name: "Austria",      flag: "\u{1F1E6}\u{1F1F9}", lang: "de" },
  { code: "CH", name: "Switzerland",  flag: "\u{1F1E8}\u{1F1ED}", lang: "de" },
  { code: "SE", name: "Sweden",       flag: "\u{1F1F8}\u{1F1EA}", lang: "sv" },
  { code: "CZ", name: "Czech Rep.",   flag: "\u{1F1E8}\u{1F1FF}", lang: "cs" },
  { code: "HU", name: "Hungary",      flag: "\u{1F1ED}\u{1F1FA}", lang: "hu" },
  { code: "RO", name: "Romania",      flag: "\u{1F1F7}\u{1F1F4}", lang: "ro" },
  { code: "UA", name: "Ukraine",      flag: "\u{1F1FA}\u{1F1E6}", lang: "uk" },
  { code: "RU", name: "Russia",       flag: "\u{1F1F7}\u{1F1FA}", lang: "ru" },
  { code: "JP", name: "Japan",        flag: "\u{1F1EF}\u{1F1F5}", lang: "ja" },
  { code: "KR", name: "S. Korea",     flag: "\u{1F1F0}\u{1F1F7}", lang: "ko" },
  { code: "CN", name: "China",        flag: "\u{1F1E8}\u{1F1F3}", lang: "zh" },
  { code: "IN", name: "India",        flag: "\u{1F1EE}\u{1F1F3}", lang: "hi" },
  { code: "BD", name: "Bangladesh",   flag: "\u{1F1E7}\u{1F1E9}", lang: "bn" },
  { code: "SA", name: "Saudi Arabia", flag: "\u{1F1F8}\u{1F1E6}", lang: "ar" },
  { code: "EG", name: "Egypt",        flag: "\u{1F1EA}\u{1F1EC}", lang: "ar" },
  { code: "BR", name: "Brazil",       flag: "\u{1F1E7}\u{1F1F7}", lang: "pt" },
  { code: "MX", name: "Mexico",       flag: "\u{1F1F2}\u{1F1FD}", lang: "es" },
  { code: "AR", name: "Argentina",    flag: "\u{1F1E6}\u{1F1F7}", lang: "es" },
  { code: "AU", name: "Australia",    flag: "\u{1F1E6}\u{1F1FA}", lang: "en" },
  { code: "CA", name: "Canada",       flag: "\u{1F1E8}\u{1F1E6}", lang: "en" },
  { code: "TR", name: "Turkey",       flag: "\u{1F1F9}\u{1F1F7}", lang: "tr" },
  { code: "IE", name: "Ireland",      flag: "\u{1F1EE}\u{1F1EA}", lang: "en" },
  { code: "NO", name: "Norway",       flag: "\u{1F1F3}\u{1F1F4}", lang: "no" },
  { code: "DK", name: "Denmark",      flag: "\u{1F1E9}\u{1F1F0}", lang: "da" },
  { code: "FI", name: "Finland",      flag: "\u{1F1EB}\u{1F1EE}", lang: "fi" },
  { code: "GR", name: "Greece",       flag: "\u{1F1EC}\u{1F1F7}", lang: "el" },
  { code: "HR", name: "Croatia",      flag: "\u{1F1ED}\u{1F1F7}", lang: "hr" },
  { code: "SK", name: "Slovakia",     flag: "\u{1F1F8}\u{1F1F0}", lang: "sk" },
] as const;

export type CountryCode = (typeof COUNTRIES)[number]["code"];

export function getCountryLang(code: string): string {
  return COUNTRIES.find(c => c.code === code)?.lang ?? "en";
}

export function getCountryFlag(code: string): string {
  return COUNTRIES.find(c => c.code === code)?.flag ?? "";
}
