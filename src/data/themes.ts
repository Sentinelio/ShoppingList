// Themes: one palette per SCREEN (Mis listas, Lista, Tienda, Detalle).
//
// A palette sets the same design tokens the screens already use through
// Tailwind (`bg-card`, `text-text-soft`, `var(--color-accent)`…), so picking
// one really changes that screen. themeStore scopes each palette to its
// screen with a [data-theme-view] rule.

export type ThemeView = "lists" | "list" | "store" | "details";

export const THEME_VIEWS: ThemeView[] = ["lists", "list", "store", "details"];

export const VIEW_LABELS: Record<ThemeView, string> = {
  lists: "My lists",
  list: "List",
  store: "Store",
  details: "Item detail",
};

export interface Palette {
  id: string;
  name: string;
  mode: "dark" | "light";
  colors: {
    bg: string;
    card: string;
    text: string;
    textSoft: string;
    textMuted: string;
    accent: string;
    onAccent: string;       // text/icons on an accent background
    accentSoft: string;
    accentInk: string;      // accent-coloured text on dark/light surfaces
    primaryName: string;    // name in the list country's language (big)
    secondaryName: string;  // name in my language (small)
    success: string;
    danger: string;
    dangerStrong: string;   // "confirm delete" button
    dangerSoft: string;     // quiet delete button background
    dangerInk: string;      // text on dangerSoft
    important: string;
    info: string;
    scroll: string;
  };
}

export const PALETTES: Palette[] = [
  {
    id: "babelcart", name: "BabelCart", mode: "dark",
    colors: {
      bg: "#0d1017", card: "#161b24", text: "#e6e8ee", textSoft: "#8b92a8", textMuted: "#555d74",
      accent: "#f0883e", onAccent: "#0d1017", accentSoft: "#3a2a1c", accentInk: "#ffb27a",
      primaryName: "#e8c364", secondaryName: "#a3aac0",
      success: "#3dd68c", danger: "#ff5c5c", dangerStrong: "#b71c1c", dangerSoft: "#2b1f24", dangerInk: "#ff9d9d",
      important: "#ff6b6b", info: "#6c8aff", scroll: "#3a4255",
    },
  },
  {
    id: "midnight", name: "Medianoche", mode: "dark",
    colors: {
      bg: "#0a0f1e", card: "#131b31", text: "#e7ecfa", textSoft: "#93a0c4", textMuted: "#5b6788",
      accent: "#5b9cff", onAccent: "#07101f", accentSoft: "#1a2a4d", accentInk: "#a9c8ff",
      primaryName: "#ffd27a", secondaryName: "#a9b4d6",
      success: "#3dd68c", danger: "#ff6470", dangerStrong: "#b3202f", dangerSoft: "#2a1a26", dangerInk: "#ffa3ab",
      important: "#ff7a85", info: "#9b8cff", scroll: "#2c3a5e",
    },
  },
  {
    id: "forest", name: "Bosque", mode: "dark",
    colors: {
      bg: "#0b130f", card: "#14201a", text: "#e4efe8", textSoft: "#8fa89a", textMuted: "#587063",
      accent: "#4fc98a", onAccent: "#06140d", accentSoft: "#173325", accentInk: "#9fe6c0",
      primaryName: "#f0d27a", secondaryName: "#a6bcb0",
      success: "#6fdc9a", danger: "#ff6b5e", dangerStrong: "#a8291d", dangerSoft: "#2a1d19", dangerInk: "#ffa79e",
      important: "#ff7b6b", info: "#6cb8ff", scroll: "#2a3d33",
    },
  },
  {
    id: "plum", name: "Ciruela", mode: "dark",
    colors: {
      bg: "#120d17", card: "#1d1625", text: "#efe7f5", textSoft: "#a796b8", textMuted: "#6c5c7c",
      accent: "#c77dff", onAccent: "#14081f", accentSoft: "#33204a", accentInk: "#e2bcff",
      primaryName: "#ffcf70", secondaryName: "#b9abc8",
      success: "#4fd99a", danger: "#ff5c7a", dangerStrong: "#a3193a", dangerSoft: "#2b1822", dangerInk: "#ff9fb3",
      important: "#ff6b8a", info: "#7aa7ff", scroll: "#3b2d4a",
    },
  },
  {
    id: "graphite", name: "Grafito", mode: "dark",
    colors: {
      bg: "#111214", card: "#1b1c1f", text: "#ececec", textSoft: "#9a9a9f", textMuted: "#616167",
      accent: "#2dd4bf", onAccent: "#04110f", accentSoft: "#133733", accentInk: "#8ff0e2",
      primaryName: "#f5c451", secondaryName: "#b0b0b5",
      success: "#4ade80", danger: "#f87171", dangerStrong: "#b91c1c", dangerSoft: "#2a1d1d", dangerInk: "#fca5a5",
      important: "#fb7185", info: "#60a5fa", scroll: "#38383d",
    },
  },
  {
    id: "contrast", name: "Alto contraste", mode: "dark",
    colors: {
      bg: "#000000", card: "#121212", text: "#ffffff", textSoft: "#d4d4d4", textMuted: "#9e9e9e",
      accent: "#ffd400", onAccent: "#000000", accentSoft: "#3a3200", accentInk: "#ffe766",
      primaryName: "#ffd400", secondaryName: "#ffffff",
      success: "#3cff8f", danger: "#ff4d4d", dangerStrong: "#c40000", dangerSoft: "#330000", dangerInk: "#ff9e9e",
      important: "#ff4d4d", info: "#66b3ff", scroll: "#4d4d4d",
    },
  },
  {
    id: "paper", name: "Papel", mode: "light",
    colors: {
      bg: "#f6f1e7", card: "#fffdf8", text: "#2a2420", textSoft: "#6f655c", textMuted: "#9d9286",
      accent: "#d9622b", onAccent: "#ffffff", accentSoft: "#f8dcc8", accentInk: "#a6451a",
      primaryName: "#8a5a00", secondaryName: "#6f655c",
      success: "#1f9d5c", danger: "#d93a3a", dangerStrong: "#b71c1c", dangerSoft: "#fbe1dd", dangerInk: "#b42318",
      important: "#d93a3a", info: "#3d5fd9", scroll: "#d6cbbb",
    },
  },
  {
    id: "daylight", name: "Día", mode: "light",
    colors: {
      bg: "#eef2f8", card: "#ffffff", text: "#18202e", textSoft: "#556179", textMuted: "#929cb0",
      accent: "#e8742a", onAccent: "#ffffff", accentSoft: "#fde3d0", accentInk: "#b4510f",
      primaryName: "#9a6400", secondaryName: "#556179",
      success: "#16a34a", danger: "#dc2626", dangerStrong: "#b91c1c", dangerSoft: "#fde2e2", dangerInk: "#b91c1c",
      important: "#dc2626", info: "#2563eb", scroll: "#c9d1de",
    },
  },
];

export const DEFAULT_PALETTE_ID = "babelcart";

export const DEFAULT_THEME_IDS: Record<ThemeView, string> = {
  lists: DEFAULT_PALETTE_ID,
  list: DEFAULT_PALETTE_ID,
  store: DEFAULT_PALETTE_ID,
  details: DEFAULT_PALETTE_ID,
};

export function getPalette(id: string | undefined): Palette {
  return PALETTES.find(p => p.id === id) ?? PALETTES[0];
}

// The CSS custom properties a palette sets (same names as index.css @theme).
export function paletteVars(p: Palette): Record<string, string> {
  const c = p.colors;
  return {
    "--color-bg": c.bg,
    "--color-card": c.card,
    "--color-text": c.text,
    "--color-text-soft": c.textSoft,
    "--color-text-muted": c.textMuted,
    "--color-accent": c.accent,
    "--color-on-accent": c.onAccent,
    "--color-accent-soft": c.accentSoft,
    "--color-accent-ink": c.accentInk,
    "--color-shelf": c.primaryName,
    "--color-primary-name": c.primaryName,
    "--color-secondary-name": c.secondaryName,
    "--color-success": c.success,
    "--color-danger": c.danger,
    "--color-danger-strong": c.dangerStrong,
    "--color-danger-soft": c.dangerSoft,
    "--color-danger-ink": c.dangerInk,
    "--color-important": c.important,
    "--color-info": c.info,
    "--color-scroll": c.scroll,
    // Borders and overlays follow the text colour, so they work on light too.
    "--color-border": `color-mix(in srgb, ${c.text} 7%, transparent)`,
    "--color-border-light": `color-mix(in srgb, ${c.text} 11%, transparent)`,
    "color-scheme": p.mode,
  };
}
