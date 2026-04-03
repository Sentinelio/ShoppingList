import { useState, useEffect } from "react";
import type { Item } from "../../lib/supabase";
import { matchProductEmoji } from "../../lib/emojiMatcher";
import { STORE_PHRASES } from "../../data/storePhrases";
import { getLangName } from "../../data/langs";

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
    ? STORE_PHRASES.find((p) => p.key === activeKey)
    : null;
  const activePhraseShelf = activePhrase
    ? (activePhrase[shelfLang] as string) || activePhrase.en
    : null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-bg">
      {/* Close button — top right */}
      <div className="flex justify-end p-4">
        <button
          onClick={onClose}
          className="flex items-center justify-center rounded-full bg-card border border-border-light text-text-soft cursor-pointer"
          style={{ width: 36, height: 36 }}
          aria-label="Close"
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>✕</span>
        </button>
      </div>

      {/* Active phrase display */}
      {activePhraseShelf && (
        <div className="px-6 pb-2 text-center">
          <p className="font-bold text-accent" style={{ fontSize: 24 }}>
            {activePhraseShelf}
          </p>
        </div>
      )}

      {/* Product area — centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {emoji && (
          <span className="mb-3" style={{ fontSize: 56, lineHeight: 1 }}>
            {emoji}
          </span>
        )}

        <h1
          className="text-center font-bold text-text leading-tight"
          style={{ fontSize: 36 }}
        >
          {shelfName}
        </h1>

        {qtyLabel && (
          <p className="text-accent mt-2" style={{ fontSize: 20 }}>
            {qtyLabel}
          </p>
        )}

        {item.note && (
          <p
            className="text-text-muted mt-2 italic text-center"
            style={{ fontSize: 15 }}
          >
            {item.note}
          </p>
        )}

        {shelfLang !== userLang &&
          userName.toLowerCase() !== shelfName.toLowerCase() && (
            <p className="text-text-muted mt-2" style={{ fontSize: 15 }}>
              ({userName} — {getLangName(userLang)})
            </p>
          )}
      </div>

      {/* Phrase buttons — bottom */}
      <div
        className="px-4 pb-4 pt-2"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex flex-wrap gap-2 justify-center">
          {STORE_PHRASES.map((phrase) => {
            const userText = (phrase[userLang] as string) || phrase.en;
            const isActive = activeKey === phrase.key;
            return (
              <button
                key={phrase.key}
                onClick={() =>
                  setActiveKey(isActive ? null : phrase.key)
                }
                className={`rounded-full cursor-pointer transition-colors ${
                  isActive
                    ? "bg-accent text-white"
                    : "bg-card text-text-soft border border-border-light"
                }`}
                style={{ padding: "8px 14px" }}
              >
                <span className="text-sm">
                  {phrase.emoji} {userText}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
