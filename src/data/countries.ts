import { getActiveCountries } from "../lib/langConfig";

// Dynamic — derived from enabled languages
export const COUNTRIES = getActiveCountries();

export type CountryCode = string;

export function getCountryLang(code: string): string {
  return getActiveCountries().find(c => c.code === code)?.lang ?? "en";
}

export function getCountryFlag(code: string): string {
  return getActiveCountries().find(c => c.code === code)?.flag ?? "";
}
