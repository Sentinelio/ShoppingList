// Per-view theme + items-layout persistence and live CSS variable injection.
//
// State we track:
//   - One `themeId` per view (items/lists/details/store) → CSS var palette
//   - One `itemsLayout` id → which React layout component renders the items
//     view (20 completely different designs, see src/layouts/items/layouts.tsx)
//
// Persisted in localStorage, pushed onto document.documentElement on init,
// and announced through a subscriber list so hooks can re-render.

import {
  ALL_THEMES,
  DEFAULT_THEME_IDS,
  getThemeById,
  type Theme,
  type ThemeView,
} from "../data/themes";
import { DEFAULT_ITEMS_LAYOUT_ID } from "../layouts/items/layouts";

const STORAGE_KEY = "babelcart_themes_v1";

interface Selection {
  themes: Record<ThemeView, string>;
  itemsLayout: string;
}

const DEFAULT_SELECTION: Selection = {
  themes: { ...DEFAULT_THEME_IDS },
  itemsLayout: DEFAULT_ITEMS_LAYOUT_ID,
};

function readSelection(): Selection {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Selection> & Partial<Record<ThemeView, string>>;
      // Back-compat with v0.34 shape where the root object WAS the themes map.
      if (parsed.themes || parsed.itemsLayout) {
        return {
          themes: { ...DEFAULT_THEME_IDS, ...(parsed.themes ?? {}) },
          itemsLayout: parsed.itemsLayout ?? DEFAULT_ITEMS_LAYOUT_ID,
        };
      }
      return {
        themes: { ...DEFAULT_THEME_IDS, ...(parsed as Record<ThemeView, string>) },
        itemsLayout: DEFAULT_ITEMS_LAYOUT_ID,
      };
    }
  } catch { /* ignore */ }
  return {
    themes: { ...DEFAULT_THEME_IDS },
    itemsLayout: DEFAULT_ITEMS_LAYOUT_ID,
  };
}

let current: Selection = readSelection();
const listeners = new Set<(s: Selection) => void>();

function applyCssVars(selection: Selection) {
  const root = document.documentElement;
  for (const view of Object.keys(ALL_THEMES) as ThemeView[]) {
    const theme = getThemeById(view, selection.themes[view]);
    for (const [key, value] of Object.entries(theme.vars)) {
      root.style.setProperty(key, value);
    }
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch { /* ignore quota */ }
}

export function initThemes() {
  if (typeof document === "undefined") return;
  applyCssVars(current);
}

// Must return a stable reference for useSyncExternalStore. We only create a
// new object inside setters when the selection actually changes.
export function getSelection(): Selection {
  return current;
}

export function getThemeFor(view: ThemeView): Theme {
  return getThemeById(view, current.themes[view]);
}

export function getItemsLayoutId(): string {
  return current.itemsLayout;
}

export function setThemeId(view: ThemeView, id: string) {
  current = { ...current, themes: { ...current.themes, [view]: id } };
  persist();
  applyCssVars(current);
  listeners.forEach(fn => fn(current));
}

export function setItemsLayoutId(id: string) {
  current = { ...current, itemsLayout: id };
  persist();
  listeners.forEach(fn => fn(current));
}

export function resetThemes() {
  current = { ...DEFAULT_SELECTION };
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
