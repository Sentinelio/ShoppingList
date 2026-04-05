import { useSyncExternalStore } from "react";
import { getSelection, subscribeThemes, getThemeFor, getItemsLayoutId } from "../lib/themeStore";
import type { Theme, ThemeView } from "../data/themes";

export function useSelection() {
  return useSyncExternalStore(subscribeThemes, getSelection, getSelection);
}

export function useTheme(view: ThemeView): Theme {
  useSelection(); // triggers re-render on change
  return getThemeFor(view);
}

export function useItemsLayoutId(): string {
  useSelection();
  return getItemsLayoutId();
}
