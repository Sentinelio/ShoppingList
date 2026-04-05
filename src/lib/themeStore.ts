// Per-view theme persistence + live CSS variable injection.
//
// The admin picks one theme per view (items/lists/details/store). We persist
// the selection in localStorage, merge all four themes' CSS variables onto
// document.documentElement, and notify subscribers so React components re-render.

import {
  ALL_THEMES,
  DEFAULT_THEME_IDS,
  getThemeById,
  type Theme,
  type ThemeView,
} from "../data/themes";

const STORAGE_KEY = "babelcart_themes_v1";

type Selection = Record<ThemeView, string>;

function readSelection(): Selection {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Selection>;
      return { ...DEFAULT_THEME_IDS, ...parsed };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_THEME_IDS };
}

let current: Selection = readSelection();
const listeners = new Set<(s: Selection) => void>();

function applyCssVars(selection: Selection) {
  const root = document.documentElement;
  for (const view of Object.keys(ALL_THEMES) as ThemeView[]) {
    const theme = getThemeById(view, selection[view]);
    for (const [key, value] of Object.entries(theme.vars)) {
      root.style.setProperty(key, value);
    }
  }
}

export function initThemes() {
  if (typeof document === "undefined") return;
  applyCssVars(current);
}

// Must return a stable reference for useSyncExternalStore. We only create a
// new object inside setThemeId/resetThemes when the selection actually changes.
export function getSelection(): Selection {
  return current;
}

export function getThemeFor(view: ThemeView): Theme {
  return getThemeById(view, current[view]);
}

export function setThemeId(view: ThemeView, id: string) {
  current = { ...current, [view]: id };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch { /* ignore quota */ }
  applyCssVars(current);
  listeners.forEach(fn => fn(current));
}

export function resetThemes() {
  current = { ...DEFAULT_THEME_IDS };
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
  applyCssVars(current);
  listeners.forEach(fn => fn(current));
}

export function subscribeThemes(fn: (s: Selection) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
