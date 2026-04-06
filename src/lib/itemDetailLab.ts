// Reads the admin's Item Detail Lab selections from localStorage.
// The lab (public/item-detail-lab.html) writes to the same key whenever
// the admin picks a variant, so both the iframe and React stay in sync.
// Changes are also synced to Supabase so all users see the same config.

import { saveConfig } from "./appConfigStore";

const STORAGE_KEY = "babelcart_item_detail_lab_v1";

export interface LabSelection {
  show: number;  // 0-9  → StoreMode variant
  edit: number;  // 0-4  → ItemDetail variant
  price: number; // 0-4
  trans: number; // 0-4
  stats: number; // 0-4
  comm: number;  // 0-4
  hist: number;  // 0-4
}

const DEFAULTS: LabSelection = {
  show: 0,
  edit: 0,
  price: 0,
  trans: 0,
  stats: 0,
  comm: 0,
  hist: 0,
};

// ── Subscriber pattern (mirrors themeStore) so React can re-render ─────
let current: LabSelection | null = null;
const listeners = new Set<() => void>();

function readFromStorage(): LabSelection {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LabSelection>;
      return { ...DEFAULTS, ...parsed };
    }
  } catch { /* ignore */ }
  return { ...DEFAULTS };
}

export function getLabSelection(): LabSelection {
  if (!current) current = readFromStorage();
  return current;
}

/** Re-read from localStorage and notify subscribers (called after remote config update). */
export function reloadLabSelection() {
  current = readFromStorage();
  listeners.forEach(fn => fn());
}

export function subscribeLabSelection(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// ── Cross-tab sync: listen for localStorage writes from other tabs ─────
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      reloadLabSelection();
    }
  });
}

/** Sync current lab selection to Supabase (called from AdminPage after iframe changes). */
export function syncLabSelectionToRemote() {
  // Re-read from localStorage since the iframe just wrote new values
  reloadLabSelection();
  saveConfig("lab_selection", current!);
}

// ── Show-in-store variant style configs ──────────────────────────────────
// Each variant maps to a set of inline styles applied to StoreMode.
// Derived from the 10 "show" variants in the lab HTML.

export interface ShowVariantStyles {
  shelfFontSize: number;
  shelfFontWeight: number;
  shelfLetterSpacing?: string;
  shelfTextShadow?: string;
  mineFontSize: number;
  mineColor: string;
  mineBg?: string;
  mineBorderRadius?: string;
  emojiFontSize: number;
  emojiFilter?: string;
  emojiOpacity?: number;
  toggleBorderTop?: string;
  toggleBg?: string;
  toggleBorderRadius?: string;
  toggleBorder?: string;
  toggleLabelColor: string;
  toggleLabelSize: number;
  toggleLabelWeight: number;
  bodyBg?: string;
  listBorderRadius?: string;
  listBorder?: string;
  listMargin?: string;
}

export const SHOW_VARIANTS: ShowVariantStyles[] = [
  // 0: Clean Standard
  { shelfFontSize: 32, shelfFontWeight: 900, mineFontSize: 13, mineColor: "var(--color-text-muted, #555d74)", emojiFontSize: 72, toggleBorderTop: "1px solid rgba(255,255,255,0.06)", toggleLabelColor: "#555d74", toggleLabelSize: 11, toggleLabelWeight: 700 },
  // 1: Soft Glow
  { shelfFontSize: 30, shelfFontWeight: 900, mineFontSize: 12, mineColor: "#555d74", emojiFontSize: 68, emojiFilter: "drop-shadow(0 6px 20px rgba(0,0,0,0.4))", toggleBg: "var(--color-card, #161b26)", toggleBorderRadius: "12px", toggleBorder: "1px solid rgba(255,255,255,0.10)", toggleLabelColor: "#8b92a8", toggleLabelSize: 11, toggleLabelWeight: 700, listBorderRadius: "0 0 12px 12px", listBorder: "1px solid rgba(255,255,255,0.10)", listMargin: "0 12px" },
  // 2: Minimal Line
  { shelfFontSize: 34, shelfFontWeight: 800, shelfLetterSpacing: "-1px", mineFontSize: 13, mineColor: "#555d74", emojiFontSize: 64, emojiOpacity: 0.9, toggleBorderTop: "1px solid rgba(255,255,255,0.04)", toggleLabelColor: "#555d74", toggleLabelSize: 10, toggleLabelWeight: 600 },
  // 3: Bold Impact
  { shelfFontSize: 38, shelfFontWeight: 900, shelfLetterSpacing: "-1px", mineFontSize: 12, mineColor: "#555d74", emojiFontSize: 80, emojiOpacity: 0.2, toggleBorderTop: "2px solid var(--color-accent, #f0883e)", toggleLabelColor: "var(--color-accent, #f0883e)", toggleLabelSize: 12, toggleLabelWeight: 800 },
  // 4: Card Elevated
  { shelfFontSize: 28, shelfFontWeight: 900, mineFontSize: 12, mineColor: "#555d74", emojiFontSize: 64, toggleBg: "var(--color-card, #161b26)", toggleBorderRadius: "12px", toggleBorder: "1px solid rgba(255,255,255,0.10)", toggleLabelColor: "#8b92a8", toggleLabelSize: 11, toggleLabelWeight: 700, bodyBg: "var(--color-card, #161b26)" },
  // 5: Shelf Spotlight
  { shelfFontSize: 34, shelfFontWeight: 900, shelfTextShadow: "0 0 24px rgba(232,195,100,0.2)", mineFontSize: 12, mineColor: "rgba(255,255,255,0.2)", emojiFontSize: 68, emojiFilter: "drop-shadow(0 0 16px rgba(232,195,100,0.15))", toggleBorderTop: "1px solid rgba(232,195,100,0.1)", toggleLabelColor: "rgba(232,195,100,0.4)", toggleLabelSize: 11, toggleLabelWeight: 700, bodyBg: "#060608" },
  // 6: Rounded Bubble
  { shelfFontSize: 28, shelfFontWeight: 900, mineFontSize: 11, mineColor: "#555d74", mineBg: "var(--color-card, #161b26)", mineBorderRadius: "8px", emojiFontSize: 72, toggleBg: "var(--color-card, #161b26)", toggleBorderRadius: "20px", toggleBorder: "1px solid rgba(255,255,255,0.10)", toggleLabelColor: "#8b92a8", toggleLabelSize: 11, toggleLabelWeight: 700, listBorderRadius: "16px", listBorder: "1px solid rgba(255,255,255,0.10)", listMargin: "0 12px" },
  // 7: Split Accent
  { shelfFontSize: 32, shelfFontWeight: 900, mineFontSize: 12, mineColor: "#555d74", emojiFontSize: 72, toggleBorderTop: "1px solid rgba(255,255,255,0.06)", toggleLabelColor: "#555d74", toggleLabelSize: 11, toggleLabelWeight: 700 },
  // 8: Compact Dense
  { shelfFontSize: 24, shelfFontWeight: 900, mineFontSize: 11, mineColor: "#555d74", emojiFontSize: 52, toggleBorderTop: "1px solid rgba(255,255,255,0.06)", toggleLabelColor: "#555d74", toggleLabelSize: 10, toggleLabelWeight: 700 },
  // 9: Gradient Warm
  { shelfFontSize: 32, shelfFontWeight: 900, mineFontSize: 12, mineColor: "#555d74", emojiFontSize: 72, emojiFilter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))", toggleBg: "var(--color-card, #161b26)", toggleBorderRadius: "14px 14px 0 0", toggleBorder: "1px solid rgba(255,255,255,0.10)", toggleLabelColor: "#8b92a8", toggleLabelSize: 11, toggleLabelWeight: 700, bodyBg: "radial-gradient(ellipse at top, rgba(240,136,62,0.06), transparent 60%)" },
];
