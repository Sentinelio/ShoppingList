import { getActiveCountries } from "../lib/langConfig";

// Countries of the enabled languages. A function, not a constant: the enabled
// languages come from the admin (app_config) and can change while the app runs.
export const getCountries = getActiveCountries;

export type CountryCode = string;

export function getCountryLang(code: string): string {
  return getActiveCountries().find(c => c.code === code)?.lang ?? "en";
}

export function getCountryFlag(code: string): string {
  return getActiveCountries().find(c => c.code === code)?.flag ?? "";
}
