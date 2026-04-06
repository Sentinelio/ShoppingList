import { useState, useEffect } from "react";
import type { Item } from "../../lib/supabase";
import { matchProductEmoji } from "../../lib/emojiMatcher";
import { useStorePhrases } from "../../hooks/useStorePhrases";
import { incrementPhraseUsage } from "../../lib/storePhrasesStore";
import { SHOW_VARIANTS } from "../../lib/itemDetailLab";
import { useLabSelection } from "../../hooks/useLabSelection";

interface StoreModeProps {
  item: Item;
  shelfLang: string;
  userLang: string;
  onClose: () => void;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function StoreMode({
  item,
  shelfLang,
  userLang,
  onClose,
}: StoreModeProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [showPhrases, setShowPhrases] = useState(false);
  const phrases = useStorePhrases();
  const labSel = useLabSelection();
  const sv = SHOW_VARIANTS[labSel.show] ?? SHOW_VARIANTS[0];

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const shelfName = capitalize(item.translations[shelfLang] || item.original);
  const userName = capitalize(item.translations[userLang] || item.original);
  const emojiMatch = matchProductEmoji(item.original);
  const emoji = emojiMatch?.emoji;

  // Qty label: "2kg", "6x", etc.
  const hasQty = item.qty && item.qty !== "";
  const hasUnit = item.unit && item.unit !== "";
  const qtyLabel = hasQty
    ? hasUnit
      ? `${item.qty}${item.unit}`
      : `${item.qty}×`
    : null;

  // Active phrase in shelf language
  const activePhrase = activeKey
    ? phrases.find((p) => p.key === activeKey)
    : null;
  const activePhraseShelf = activePhrase
    ? activePhrase.translations[shelfLang] || activePhrase.translations.en
    : null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ background: sv.bodyBg || "var(--color-bg, #0d1017)" }}
    >
      {/* Close button — top right */}
      <div className="flex justify-end p-4" style={{ flexShrink: 0 }}>
        <button
          onClick={onClose}
          className="flex items-center justify-center rounded-full bg-card border border-border-light text-text-soft cursor-pointer"
          style={{ width: 36, height: 36 }}
          aria-label="Close"
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>✕</span>
        </button>
      </div>

      {/* Active phrase — orange banner, tap to dismiss */}
      {activePhraseShelf && (
        <div
          onClick={() => setActiveKey(null)}
          style={{
            textAlign: "center",
            padding: "16px 16px 12px",
            background: "linear-gradient(135deg, #f09848, #e07028)",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 24, display: "block", marginBottom: 4 }}>
            {activePhrase?.emoji}
          </span>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1.2, textShadow: "0 1px 4px rgba(0,0,0,0.2)" }}>
            {activePhraseShelf}
          </div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>
            tap para ocultar
          </div>
        </div>
      )}

      {/* Shelf name — styled by variant */}
      <div style={{ textAlign: "center", padding: "2px 16px 0", flexShrink: 0 }}>
        <div
          style={{
            fontSize: sv.shelfFontSize,
            fontWeight: sv.shelfFontWeight,
            color: "var(--color-shelf, #e8c364)",
            marginTop: 10,
            letterSpacing: sv.shelfLetterSpacing,
            textShadow: sv.shelfTextShadow,
          }}
        >
          {shelfName}
        </div>
        {shelfLang !== userLang && userName.toLowerCase() !== shelfName.toLowerCase() && (
          <div
            style={{
              fontSize: sv.mineFontSize,
              color: sv.mineColor,
              marginTop: 4,
              ...(sv.mineBg ? { padding: "4px 12px", background: sv.mineBg, borderRadius: sv.mineBorderRadius || "8px", display: "inline-block" } : {}),
            }}
          >
            ({userName})
          </div>
        )}
      </div>

      {/* Emoji — centered, styled by variant */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {item.photo ? (
          <img
            src={item.photo}
            className="rounded-2xl object-contain"
            style={{ maxWidth: "80%", maxHeight: "35vh" }}
            alt={shelfName}
          />
        ) : emoji ? (
          <span
            aria-hidden="true"
            style={{
              fontSize: sv.emojiFontSize,
              lineHeight: 1,
              filter: sv.emojiFilter,
              opacity: sv.emojiOpacity,
            }}
          >
            {emoji}
          </span>
        ) : null}
      </div>

      {/* Qty + note */}
      {(qtyLabel || item.note) && (
        <div style={{ textAlign: "center", flexShrink: 0, padding: "0 16px 4px" }}>
          {qtyLabel && (
            <p style={{ fontSize: 20, fontWeight: 800, color: "var(--color-accent, #f0883e)" }}>
              {qtyLabel}
            </p>
          )}
          {item.note && (
            <p style={{ fontSize: 13, color: "#8b92a8", fontStyle: "italic", marginTop: 4 }}>
              {item.note}
            </p>
          )}
        </div>
      )}

      {/* Collapsible phrase list — styled by variant */}
      <div style={{ flexShrink: 0, paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
        <div
          onClick={() => setShowPhrases(v => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: 12,
            cursor: "pointer",
            borderTop: sv.toggleBorderTop,
            background: sv.toggleBg,
            borderRadius: sv.toggleBorderRadius,
            border: !sv.toggleBorderTop ? sv.toggleBorder : undefined,
            ...(sv.toggleBorderRadius ? { margin: "0 12px" } : {}),
          }}
        >
          <span style={{ fontSize: sv.toggleLabelSize, fontWeight: sv.toggleLabelWeight, color: sv.toggleLabelColor }}>
            Preguntas para el dependiente
          </span>
          <span style={{ fontSize: sv.toggleLabelSize - 1, color: sv.toggleLabelColor }}>
            {showPhrases ? "▲" : "▼"}
          </span>
        </div>

        {showPhrases && (
          <div
            style={{
              maxHeight: 260,
              overflowY: "auto",
              borderRadius: sv.listBorderRadius,
              border: sv.listBorder,
              margin: sv.listMargin,
            }}
          >
            {phrases.map((phrase) => {
              const phraseShelf = phrase.translations[shelfLang] || phrase.translations.en || phrase.key;
              return (
                <div
                  key={phrase.key}
                  onClick={() => {
                    setActiveKey(phrase.key);
                    setShowPhrases(false);
                    void incrementPhraseUsage(phrase.key);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "11px 14px",
                    cursor: "pointer",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <span style={{ fontSize: 18 }}>{phrase.emoji}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#8b92a8" }}>{phraseShelf}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
