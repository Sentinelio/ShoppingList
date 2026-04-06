import { useSyncExternalStore } from "react";
import { getLabSelection, subscribeLabSelection } from "../lib/itemDetailLab";

export function useLabSelection() {
  return useSyncExternalStore(subscribeLabSelection, getLabSelection, getLabSelection);
}
