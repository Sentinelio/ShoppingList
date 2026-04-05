import { useSyncExternalStore } from "react";
import { getSelection, subscribeThemes, getThemeFor } from "../lib/themeStore";
import type { Theme, ThemeView } from "../data/themes";

export function useSelectedThemeIds() {
  return useSyncExternalStore(subscribeThemes, getSelection, getSelection);
}

export function useTheme(view: ThemeView): Theme {
  useSelectedThemeIds(); // triggers re-render on change
  return getThemeFor(view);
}
