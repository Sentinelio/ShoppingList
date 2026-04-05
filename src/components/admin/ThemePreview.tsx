// Scoped theme previews used by the Admin Themes tab. Each preview renders a
// miniature representative sample with the theme's CSS variables applied to
// its own wrapping <div> (not the document root), so we can show 20 variants
// side-by-side without polluting the live app state.

import type { Theme, ThemeView } from "../../data/themes";

interface Props {
  theme: Theme;
  view: ThemeView;
}

// Build an inline style object from the theme's CSS variables so it only
// scopes inside the preview wrapper.
function varsAsStyle(vars: Record<string, string>): React.CSSProperties {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(vars)) out[k] = v;
  return out as React.CSSProperties;
}

export default function ThemePreview({ theme, view }: Props) {
  const style = varsAsStyle(theme.vars);
  return (
    <div style={style} className="w-full">
      {view === "items" && <ItemsPreview />}
      {view === "lists" && <ListsPreview />}
      {view === "details" && <DetailsPreview />}
      {view === "store" && <StorePreview />}
    </div>
  );
}

// ── Items: tiny 2-card grid showing the key visual language ───────────────
function ItemsPreview() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[
        { emoji: "🥛", name: "Milk", qty: "2L" },
        { emoji: "🍎", name: "Apples", qty: "6×" },
      ].map((it, i) => (
        <div
          key={i}
          className="relative flex flex-col items-center justify-center"
          style={{
            padding: "14px 6px 10px",
            background: "var(--item-card-bg, rgba(240,136,62,0.14))",
            border: "var(--item-card-border, 1px solid rgba(240,136,62,0.35))",
            borderRadius: "var(--item-card-radius, 16px)",
            boxShadow: "var(--item-card-shadow, none)",
          }}
        >
          <div
            className="absolute rounded-md"
            style={{
              top: 6,
              right: 6,
              fontSize: 9,
              fontWeight: 700,
              padding: "1px 5px",
              background: "var(--item-qty-bg, rgba(240,136,62,0.3))",
              color: "var(--item-qty-color, #fff)",
            }}
          >
            {it.qty}
          </div>
          <span
            aria-hidden="true"
            style={{ fontSize: "var(--item-emoji-size, 40px)", lineHeight: 1 }}
          >
            {it.emoji}
          </span>
          <p
            className="text-center leading-tight mt-1 truncate w-full"
            style={{
              fontSize: 11,
              fontWeight: "var(--item-name-weight, 700)" as unknown as number,
              color: "var(--item-name-color, #e6e8ee)",
            }}
          >
            {it.name}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Lists: single list card with badge ─────────────────────────────────────
function ListsPreview() {
  return (
    <div
      className="p-3 w-full"
      style={{
        background: "var(--list-card-bg, #151922)",
        border: "var(--list-card-border, 1px solid rgba(255,255,255,0.08))",
        borderRadius: "var(--list-card-radius, 12px)",
        boxShadow: "var(--list-card-shadow, none)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-text text-[13px] font-bold truncate">Groceries</div>
          <div className="text-text-muted text-[9px]">24/10/2026</div>
        </div>
        <span
          className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full text-[10px] font-bold"
          style={{
            background: "var(--list-badge-bg, rgba(240,136,62,0.15))",
            color: "var(--list-badge-color, #f0883e)",
          }}
        >
          8
        </span>
        <span className="text-text-muted text-sm">›</span>
      </div>
    </div>
  );
}

// ── Details: modal-like card ──────────────────────────────────────────────
function DetailsPreview() {
  return (
    <div
      style={{
        background: "var(--details-modal-bg, #151922)",
        borderRadius: "var(--details-modal-radius, 16px)",
        border: "var(--details-border, 1px solid rgba(255,255,255,0.1))",
        overflow: "hidden",
      }}
    >
      <div
        className="px-3 py-2"
        style={{ background: "var(--details-header-bg, rgba(240,136,62,0.1))" }}
      >
        <div className="text-[11px] font-bold text-text">Milk</div>
      </div>
      <div className="p-3 flex gap-1.5">
        <div
          className="flex-1 rounded-md text-[10px] text-text-muted px-2 py-1.5"
          style={{ background: "var(--details-field-bg, rgba(255,255,255,0.04))" }}
        >
          Qty
        </div>
        <div
          className="rounded-md text-[10px] text-white px-3 py-1.5 font-semibold"
          style={{ background: "var(--details-button-bg, linear-gradient(135deg, #f0883e, #e07028))" }}
        >
          Save
        </div>
      </div>
    </div>
  );
}

// ── Store mode: mini fullscreen card ─────────────────────────────────────
function StorePreview() {
  return (
    <div
      className="p-2 flex flex-col items-center justify-center rounded-lg"
      style={{
        background: "var(--store-bg, #0d1017)",
        minHeight: 100,
      }}
    >
      <div
        className="flex flex-col items-center justify-center w-full px-3 py-3"
        style={{
          background: "var(--store-card-bg, rgba(255,255,255,0.04))",
          border: "var(--store-card-border, 2px solid rgba(240,136,62,0.35))",
          borderRadius: "var(--store-card-radius, 16px)",
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 24, lineHeight: 1 }}>🥛</span>
        <div
          className="text-center leading-tight mt-1"
          style={{
            fontSize: 15,
            fontWeight: "var(--store-title-weight, 800)" as unknown as number,
            color: "var(--store-title-color, #f0883e)",
          }}
        >
          Milk
        </div>
        <div
          className="text-[9px] mt-0.5"
          style={{ color: "var(--store-subtitle-color, #e6e8ee)" }}
        >
          (leche)
        </div>
      </div>
    </div>
  );
}
