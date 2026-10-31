import { useSyncExternalStore } from "react";

// Admin desktop layout from 1024 px; below that the mobile admin stays.
const QUERY = "(min-width: 1024px)";

function subscribe(fn: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", fn);
  return () => mq.removeEventListener("change", fn);
}

export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}
