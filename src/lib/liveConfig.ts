// Keeps admin-edited data fresh in every open app:
//   · app_config (themes, enabled languages, UI translations, detail lab,
//     custom store types/categories) → realtime + re-read when the tab
//     comes back. Changes bump `configVersion`, which re-renders the app.
//   · dictionary → realtime: the suggestion cache is dropped and reloaded.
//   · store_phrases → realtime: the phrase list is refetched.
// See pocketbase/README.md, "Configuración editada desde el admin".

import { IS_DEMO, subscribe } from "./pocketbase";
import { applyConfigRow, loadRemoteConfig } from "./appConfigStore";
import { reloadThemes } from "./themeStore";
import { invalidateDictionaryCache, preloadDictionary } from "./dictSuggest";
import { refreshStorePhrases } from "./storePhrasesStore";

let version = 0;
const listeners = new Set<() => void>();

export function getConfigVersion(): number {
  return version;
}

export function subscribeConfigVersion(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function configChanged() {
  reloadThemes();
  version++;
  listeners.forEach(fn => fn());
}

let dictTimer: ReturnType<typeof setTimeout> | null = null;
function dictionaryChanged() {
  // A seed run sends dozens of events: reload once they calm down.
  invalidateDictionaryCache();
  if (dictTimer) clearTimeout(dictTimer);
  dictTimer = setTimeout(() => { dictTimer = null; preloadDictionary(); }, 1500);
}

let started = false;

/** Call once after the first render. */
export function startLiveConfig(): void {
  if (started || IS_DEMO) return;
  started = true;

  subscribe<{ key: string; value: unknown }>("app_config", "", (action, rec) => {
    if (action !== "delete" && applyConfigRow(rec.key, rec.value)) configChanged();
  });
  subscribe("dictionary", "", () => dictionaryChanged());
  subscribe("store_phrases", "", () => { void refreshStorePhrases(); });

  // Realtime can miss events while the phone sleeps: re-read on return.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    loadRemoteConfig().then(changed => { if (changed) configChanged(); });
    void refreshStorePhrases();
    dictionaryChanged();
  });
}
