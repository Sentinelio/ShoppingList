import { useEffect, useSyncExternalStore } from "react";
import {
  ensureStorePhrasesLoaded,
  getStorePhrases,
  subscribeStorePhrases,
  type StorePhrase,
} from "../lib/storePhrasesStore";

export function useStorePhrases(): StorePhrase[] {
  // Trigger a one-shot load the first time any consumer mounts.
  useEffect(() => { void ensureStorePhrasesLoaded(); }, []);
  return useSyncExternalStore(subscribeStorePhrases, getStorePhrases, getStorePhrases);
}
