import { getActiveLangs } from "../lib/langConfig";

// Dynamic — reads from enabled languages config
export const LANGS = getActiveLangs();

export type LangCode = string;

export function getLangName(code: string): string {
  return getActiveLangs().find(l => l.code === code)?.name ?? code;
}

export function getLangFlag(code: string): string {
  return getActiveLangs().find(l => l.code === code)?.flag ?? "";
}
