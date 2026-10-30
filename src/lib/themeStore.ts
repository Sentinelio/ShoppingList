// Per-screen theme selection: persistence and CSS injection.
//
// One palette id per screen (src/data/themes.ts). The selection lives in
// localStorage (babelcart_themes_v1, mirrored from app_config "themes") and
// is turned into one <style> rule per screen:
//
//   [data-theme-view="store"] { --color-bg: …; --color-accent: …; }
//
// Screens mark themselves with useThemeView() (on <html>, so the page
// background, sheets and the iOS overscroll area follow) or with a
// data-theme-view attribute on a container (the product detail).

import { useEffect, useSyncExternalStore } from "react";
import {
  DEFAULT_THEME_IDS,
  THEME_VIEWS,
  getPalette,
  paletteVars,
  type ThemeView,
} from "../data/themes";
import { saveConfig } from "./appConfigStore";

const STORAGE_KEY = "babelcart_themes_v1";
const STYLE_ID = "babelcart-themes";

export interface Selection {
  version: 2;
  themes: Record<ThemeView, string>;
}

const DEFAULT_SELECTION: Selection = { version: 2, themes: { ...DEFAULT_THEME_IDS } };

// Older selections (the per-view themes of the old screens) are ignored:
// their ids don't exist any more.
function readSelection(): Selection {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Selection>;
      if (parsed.version === 2 && parsed.themes) {
        return { version: 2, themes: { ...DEFAULT_THEME_IDS, ...parsed.themes } };
      }
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_SELECTION, themes: { ...DEFAULT_THEME_IDS } };
}

let current: Selection = readSelection();
const listeners = new Set<() => void>();

export function themeCss(view: ThemeView, paletteId: string): string {
  const vars = Object.entries(paletteVars(getPalette(paletteId)))
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
  return `[data-theme-view="${view}"]{${vars}}`;
}

function applyCss(selection: Selection) {
  if (typeof document === "undefined") return;
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = THEME_VIEWS.map(v => themeCss(v, selection.themes[v])).join("\n");
}

function changed() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(current)); } catch { /* ignore quota */ }
  applyCss(current);
  listeners.forEach(fn => fn());
}

// main.tsx calls this after applying the server's app_config, so it reads
// the fresh copy rather than the one read at import time.
export function initThemes() {
  current = readSelection();
  applyCss(current);
}

export function reloadThemes() {
  current = readSelection();
  applyCss(current);
  listeners.forEach(fn => fn());
}

export function getSelection(): Selection {
  return current;
}

export function setThemeId(view: ThemeView, id: string) {
  current = { version: 2, themes: { ...current.themes, [view]: id } };
  changed();
  void saveConfig("themes", current);
}

export function resetThemes() {
  current = { version: 2, themes: { ...DEFAULT_THEME_IDS } };
  changed();
  void saveConfig("themes", current);
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function useThemeSelection(): Selection {
  return useSyncExternalStore(subscribe, getSelection, getSelection);
}

// Marks the whole page (on <html>) as `view` while the calling screen is mounted.
export function useThemeView(view: ThemeView) {
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme-view", view);
    return () => {
      if (root.getAttribute("data-theme-view") === view) root.removeAttribute("data-theme-view");
    };
  }, [view]);
}
