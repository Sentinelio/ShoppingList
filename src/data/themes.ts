// Theme system — 20 dark themes per view.
//
// Each theme is a set of CSS variables applied to document root. Components
// consume the vars directly (e.g. `style={{ background: "var(--item-card-bg)" }}`).
// All four views have independent themes that can be mixed and matched.

export type ThemeView = "lists" | "items" | "details" | "store";

export interface Theme {
  id: string;
  name: string;
  vars: Record<string, string>;
}

// ── Palette used to generate variants ──────────────────────────────────────
// Each palette entry: [name, accent, cardTint, borderTint]
const PALETTES: Array<[string, string, string, string]> = [
  ["Classic Orange",  "#f0883e", "rgba(240,136,62,0.14)", "rgba(240,136,62,0.35)"],
  ["Neon Green",      "#3dd68c", "rgba(61,214,140,0.14)", "rgba(61,214,140,0.35)"],
  ["Electric Blue",   "#4ac3d9", "rgba(74,195,217,0.14)", "rgba(74,195,217,0.35)"],
  ["Royal Purple",    "#a78bfa", "rgba(167,139,250,0.14)", "rgba(167,139,250,0.35)"],
  ["Hot Pink",        "#ec4899", "rgba(236,72,153,0.14)",  "rgba(236,72,153,0.35)"],
  ["Gold",            "#e8c364", "rgba(232,195,100,0.14)", "rgba(232,195,100,0.35)"],
  ["Crimson",         "#ef4444", "rgba(239,68,68,0.14)",   "rgba(239,68,68,0.35)"],
  ["Teal",            "#14b8a6", "rgba(20,184,166,0.14)",  "rgba(20,184,166,0.35)"],
  ["Indigo",          "#6366f1", "rgba(99,102,241,0.14)",  "rgba(99,102,241,0.35)"],
  ["Emerald",         "#10b981", "rgba(16,185,129,0.14)",  "rgba(16,185,129,0.35)"],
  ["Rose Gold",       "#fb7185", "rgba(251,113,133,0.14)", "rgba(251,113,133,0.35)"],
  ["Arctic",          "#7dd3fc", "rgba(125,211,252,0.14)", "rgba(125,211,252,0.35)"],
  ["Volcano",         "#f97316", "rgba(249,115,22,0.14)",  "rgba(249,115,22,0.35)"],
  ["Forest",          "#65a30d", "rgba(101,163,13,0.14)",  "rgba(101,163,13,0.35)"],
  ["Ocean",           "#0ea5e9", "rgba(14,165,233,0.14)",  "rgba(14,165,233,0.35)"],
  ["Sunset",          "#fb923c", "rgba(251,146,60,0.14)",  "rgba(251,146,60,0.35)"],
  ["Midnight",        "#818cf8", "rgba(129,140,248,0.14)", "rgba(129,140,248,0.35)"],
  ["Slate",           "#94a3b8", "rgba(148,163,184,0.14)", "rgba(148,163,184,0.35)"],
  ["Plum",            "#c084fc", "rgba(192,132,252,0.14)", "rgba(192,132,252,0.35)"],
  ["Copper",          "#d97706", "rgba(217,119,6,0.14)",   "rgba(217,119,6,0.35)"],
];

// ── ITEMS (grid card): 20 themes ───────────────────────────────────────────
// Vary: card bg tone, border style, radius, emoji treatment, qty badge shape
export const ITEMS_THEMES: Theme[] = PALETTES.map(([name, accent, tint, border], i) => {
  // Cycle through 5 card style groups so adjacent themes don't look identical
  const group = i % 5;
  const radius = [20, 12, 28, 8, 16][group];
  const borderWidth = [1, 2, 0, 1, 1][group];
  const borderStyle = [`${borderWidth}px solid ${border}`, `${borderWidth}px solid ${border}`, "none", `${borderWidth}px dashed ${border}`, `${borderWidth}px solid ${border}`][group];
  const cardBg = [tint, tint, `linear-gradient(135deg, ${tint}, rgba(255,255,255,0.02))`, "rgba(255,255,255,0.025)", tint][group];
  const shadow = ["none", `0 0 0 1px ${border}, 0 4px 12px rgba(0,0,0,0.3)`, "0 4px 20px rgba(0,0,0,0.4)", "none", `0 0 24px ${border}`][group];
  return {
    id: `items-${i + 1}`,
    name: `${name}`,
    vars: {
      "--item-card-bg": cardBg,
      "--item-card-border": borderStyle,
      "--item-card-radius": `${radius}px`,
      "--item-card-shadow": shadow,
      "--item-accent": accent,
      "--item-qty-bg": `${accent}4D`,
      "--item-qty-color": "#ffffff",
      "--item-shelf-color": accent,
      "--item-name-color": "#e6e8ee",
      "--item-name-weight": group === 2 ? "800" : "700",
      "--item-emoji-size": group === 3 ? "40px" : "48px",
    },
  };
});

// ── LISTS (homepage card): 20 themes ──────────────────────────────────────
export const LISTS_THEMES: Theme[] = PALETTES.map(([name, accent, tint, border], i) => {
  const group = i % 5;
  const radius = [16, 24, 8, 32, 12][group];
  const bgStyle = [
    `linear-gradient(135deg, ${tint}, rgba(255,255,255,0.03))`,
    tint,
    "rgba(255,255,255,0.04)",
    `linear-gradient(180deg, ${tint}, transparent)`,
    tint,
  ][group];
  const borderStyle = [`1px solid ${border}`, "none", `1px solid rgba(255,255,255,0.08)`, `2px solid ${border}`, `1px solid ${border}`][group];
  const shadow = ["none", `0 8px 24px rgba(0,0,0,0.4)`, "none", `0 0 32px ${border}`, "0 2px 12px rgba(0,0,0,0.3)"][group];
  return {
    id: `lists-${i + 1}`,
    name: `${name}`,
    vars: {
      "--list-card-bg": bgStyle,
      "--list-card-border": borderStyle,
      "--list-card-radius": `${radius}px`,
      "--list-card-shadow": shadow,
      "--list-accent": accent,
      "--list-badge-bg": `${accent}26`,
      "--list-badge-color": accent,
    },
  };
});

// ── DETAILS (item modal): 20 themes ───────────────────────────────────────
export const DETAILS_THEMES: Theme[] = PALETTES.map(([name, accent, tint, border], i) => {
  const group = i % 5;
  const radius = [24, 16, 32, 8, 20][group];
  const headerBg = [
    `linear-gradient(180deg, ${tint}, transparent)`,
    tint,
    "rgba(255,255,255,0.04)",
    tint,
    `linear-gradient(135deg, ${tint}, rgba(0,0,0,0.2))`,
  ][group];
  return {
    id: `details-${i + 1}`,
    name: `${name}`,
    vars: {
      "--details-modal-bg": "#151922",
      "--details-modal-radius": `${radius}px`,
      "--details-header-bg": headerBg,
      "--details-border": `1px solid ${border}`,
      "--details-accent": accent,
      "--details-field-bg": "rgba(255,255,255,0.04)",
      "--details-field-focus": border,
      "--details-button-bg": `linear-gradient(135deg, ${accent}, ${accent}dd)`,
    },
  };
});

// ── STORE MODE (show in shop): 20 themes ──────────────────────────────────
export const STORE_THEMES: Theme[] = PALETTES.map(([name, accent, tint, border], i) => {
  const group = i % 5;
  // Big centered card — vary background intensity and text emphasis
  const bgStyle = [
    `radial-gradient(circle at center, ${tint}, #0d1017)`,
    `linear-gradient(180deg, ${tint}, #0d1017)`,
    "#0d1017",
    `linear-gradient(135deg, ${tint}, rgba(0,0,0,0.6))`,
    `radial-gradient(ellipse at top, ${tint}, #0d1017)`,
  ][group];
  const cardBg = [
    "rgba(255,255,255,0.04)",
    tint,
    `linear-gradient(135deg, ${tint}, rgba(255,255,255,0.02))`,
    "rgba(0,0,0,0.35)",
    tint,
  ][group];
  return {
    id: `store-${i + 1}`,
    name: `${name}`,
    vars: {
      "--store-bg": bgStyle,
      "--store-card-bg": cardBg,
      "--store-card-border": `2px solid ${border}`,
      "--store-card-radius": `${[24, 16, 32, 12, 28][group]}px`,
      "--store-title-color": accent,
      "--store-title-weight": group === 2 ? "900" : "800",
      "--store-subtitle-color": "#e6e8ee",
      "--store-accent": accent,
    },
  };
});

export const ALL_THEMES: Record<ThemeView, Theme[]> = {
  items: ITEMS_THEMES,
  lists: LISTS_THEMES,
  details: DETAILS_THEMES,
  store: STORE_THEMES,
};

export const DEFAULT_THEME_IDS: Record<ThemeView, string> = {
  items: "items-1",
  lists: "lists-1",
  details: "details-1",
  store: "store-1",
};

export function getThemeById(view: ThemeView, id: string): Theme {
  const themes = ALL_THEMES[view];
  return themes.find(t => t.id === id) ?? themes[0];
}

export const VIEW_LABELS: Record<ThemeView, string> = {
  lists: "Lists",
  items: "Items",
  details: "Details",
  store: "Show in store",
};
