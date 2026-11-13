// Screens live in the URL hash and in the browser history, so the phone's
// Back (button, gesture or browser) goes to the previous screen or closes
// the open sheet instead of leaving the app.
//
//   #/                         Mis listas
//   #/archived                 archived lists
//   #/notifications            notifications
//   #/settings                 my profile
//   #/list/ID[/store|/members] a list (tab)
//   #/list/ID/item/ITEM        a product's detail
//   #admin[/section]           admin (AdminPage handles the section)
//   #join=CODE                 invite link (ListsPage opens the join dialog)
//
// Every entry the app pushes carries history.state.bcDepth (1, 2, …), so
// goBack() knows whether the previous entry is still inside the app.

import { useEffect, useRef, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

export type ListTab = "list" | "store" | "members";
export type HomeView = "home" | "archived" | "notifications" | "settings";

export type AppRoute =
  | { page: "lists"; view: HomeView }
  | { page: "list"; listId: string; tab: ListTab; itemId?: string }
  | { page: "admin" };

export function parseHash(hash: string): AppRoute {
  if (hash.startsWith("#admin")) return { page: "admin" };
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  if (parts[0] === "list" && parts[1]) {
    if (parts[2] === "item" && parts[3]) return { page: "list", listId: parts[1], tab: "list", itemId: parts[3] };
    const tab: ListTab = parts[2] === "store" || parts[2] === "members" ? parts[2] : "list";
    return { page: "list", listId: parts[1], tab };
  }
  if (parts[0] === "archived" || parts[0] === "notifications" || parts[0] === "settings") return { page: "lists", view: parts[0] };
  return { page: "lists", view: "home" };
}

export function routeToHash(r: AppRoute): string {
  if (r.page === "admin") return "#admin";
  if (r.page === "list") {
    const id = encodeURIComponent(r.listId);
    if (r.itemId) return `#/list/${id}/item/${encodeURIComponent(r.itemId)}`;
    return r.tab === "list" ? `#/list/${id}` : `#/list/${id}/${r.tab}`;
  }
  return r.view === "home" ? "#/" : `#/${r.view}`;
}

// ── History bookkeeping ─────────────────────────────────────────────────

const depth = () => (history.state && typeof history.state.bcDepth === "number" ? history.state.bcDepth : 0);

// Backs the app triggered itself (closing a sheet from its ✕) are pending
// until their popstate arrives; pushes wait for them, otherwise the late
// popstate would undo the new entry.
let pendingBacks = 0;
const afterBacks: (() => void)[] = [];
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    if (pendingBacks > 0 && --pendingBacks === 0) afterBacks.splice(0).forEach(fn => fn());
    listeners.forEach(fn => fn());
  });
  window.addEventListener("hashchange", () => listeners.forEach(fn => fn()));
}

function whenSettled(fn: () => void) {
  if (pendingBacks === 0) fn();
  else afterBacks.push(fn);
}

function programmaticBack() {
  pendingBacks++;
  history.back();
}

/** Opens a screen (a new history entry). replace: swap the current one. */
export function go(route: AppRoute, opts: { replace?: boolean } = {}) {
  whenSettled(() => {
    const hash = routeToHash(route);
    if (opts.replace) history.replaceState({ ...history.state, bcDepth: depth() }, "", hash);
    else history.pushState({ bcDepth: depth() + 1 }, "", hash);
    listeners.forEach(fn => fn());
  });
}

/** To close a sheet / the search AND navigate in the same tap, close it
 *  with closeThenGo(() => close(), () => go(...)): the sheet's own back
 *  (useBackToClose cleanup) must be registered before navigating, or that
 *  back lands after the navigation and undoes it. flushSync commits the
 *  close (and runs that cleanup) right away; go()/goBack() then wait for
 *  the back to land. */
export function closeThenGo(close: () => void, navigate: () => void) {
  flushSync(close);
  navigate();
}

/** Back `steps` entries at once (e.g. a product opened from the search). */
export function backSteps(steps: number) {
  if (steps <= 0) return;
  pendingBacks++;
  history.go(-steps);
}

/** The app's own ← : back in history when the previous entry is ours,
 *  else (opened from a link or a reload) straight to `parent`. */
export function goBack(parent: AppRoute) {
  // Waits for a back already on its way (e.g. a sheet just closed), so it
  // goes back from where that one lands instead of racing it.
  whenSettled(() => {
    if (depth() > 0) programmaticBack();
    else go(parent, { replace: true });
  });
}

/** Leaves a screen that no longer exists for me (a list just left or
 *  deleted): back until the route is no longer `stillHere`, skipping any
 *  other entries of it on the way (a tab, a product, a stale overlay); with
 *  no app entry left, replaces it with `parent`. A single goBack() could
 *  land on another entry of the same list and leave the user inside it. */
export function goBackOut(stillHere: (r: AppRoute) => boolean, parent: AppRoute) {
  const step = () => {
    if (!stillHere(snapshot())) return;
    if (depth() > 0) { programmaticBack(); afterBacks.push(step); }
    else go(parent, { replace: true });
  };
  whenSettled(step);
}

let cached: { hash: string; route: AppRoute } | null = null;
function snapshot(): AppRoute {
  const hash = window.location.hash;
  if (!cached || cached.hash !== hash) cached = { hash, route: parseHash(hash) };
  return cached.route;
}

export function useRoute(): AppRoute {
  return useSyncExternalStore(
    fn => { listeners.add(fn); return () => { listeners.delete(fn); }; },
    snapshot,
    () => ({ page: "lists", view: "home" }) as AppRoute,
  );
}

/** While `open`, the sheet / dialog owns a history entry: Back closes it
 *  (calls onClose) and closing it any other way removes the entry. */
export function useBackToClose(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    let mine = 0;            // depth of our entry once pushed
    let poppedByBack = false;
    let cancelled = false;
    whenSettled(() => {
      if (cancelled) return;
      mine = depth() + 1;
      history.pushState({ ...history.state, bcDepth: mine, bcOverlay: true }, "");
    });
    const onPop = () => {
      if (mine && depth() < mine && !poppedByBack) {
        poppedByBack = true;
        onCloseRef.current();
      }
    };
    window.addEventListener("popstate", onPop);
    return () => {
      cancelled = true;
      window.removeEventListener("popstate", onPop);
      if (mine && !poppedByBack && depth() === mine) programmaticBack();
    };
  }, [open]);
}
