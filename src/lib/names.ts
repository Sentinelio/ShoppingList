// Global language rule: the PRIMARY name (big, gold) is in the language of the
// list's country; the SECONDARY name (small, grey) is in the language the
// person speaks. The secondary is empty when both would read the same.

import { getCountryLang } from "../data/countries";
import { getCategoryName } from "../data/categories";

export const PRIMARY_COLOR = "var(--color-primary-name)";
export const SECONDARY_COLOR = "var(--color-secondary-name)";

export function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Language of the list's country. Lists created before `lists.country`
 *  existed have it empty: fall back to the viewer's country. */
export function listLangOf(list: { country?: string } | null | undefined, userCountry: string | undefined): string {
  return getCountryLang(list?.country || userCountry || "");
}

type Named = { original: string; translations?: Record<string, string> | null };

export function primaryName(item: Named, listLang: string): string {
  return capitalize(item.translations?.[listLang] || item.original);
}

export function secondaryName(item: Named, listLang: string, userLang: string): string {
  if (userLang === listLang) return "";
  const mine = capitalize(item.translations?.[userLang] || item.original);
  return mine.toLowerCase() === primaryName(item, listLang).toLowerCase() ? "" : mine;
}

export function categoryNames(cat: string, listLang: string, userLang: string): { primary: string; secondary: string } {
  const primary = getCategoryName(cat, listLang);
  const mine = getCategoryName(cat, userLang);
  return { primary, secondary: mine === primary ? "" : mine };
}
