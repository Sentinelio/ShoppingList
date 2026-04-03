import { useState, useEffect } from "react";
import type { Item } from "../../lib/supabase";
import { matchProductEmoji } from "../../lib/emojiMatcher";
import { STORE_PHRASES } from "../../data/storePhrases";

interface StoreModeProps {
  item: Item;
  shelfLang: string;
  userLang: string;
  onClose: () => void;
}

export default function StoreMode({
  item,
  shelfLang,
  userLang,
  onClose,
}: StoreModeProps) {
  const [activePhrase, setActivePhrase] = useState<{
    emoji: string;
    text: string;
  } | null>(null);

  // Lock body scroll while fullscreen is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const shelfName = item.translations[shelfLang] || item.original;
  const userName = item.translations[userLang] || item.original;
  const emojiMatch = matchProductEmoji(item.original);
  const emoji = emojiMatch?.emoji;

  const hasQty = item.qty && item.qty !== "";
  const hasUnit = item.unit && item.unit !== "";
  const qtyDisplay = [hasQty && item.qty, hasUnit && item.unit]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{
        backgroundColor: "#0d1017",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      {/* Phrase overlay */}
      {activePhrase && (
        <div
          className="absolute inset-0 z-[110] flex flex-col items-center justify-center px-6"
          style={{ backgroundColor: "#0d1017" }}
          onClick={() => setActivePhrase(null)}
        >
          <span className="text-7xl mb-6">{activePhrase.emoji}</span>
          <p
            className="text-center font-bold leading-tight"
            style={{ fontSize: "36px", color: "#e8c364" }}
          >
            {activePhrase.text}
          </p>
          <p className="text-text-soft mt-8 text-sm">Tap anywhere to dismiss</p>
        </div>
      )}

      {/* Close button */}
      <div className="flex justify-end px-4 pt-3">
        <button
          onClick={onClose}
          className="flex items-center justify-center rounded-full bg-card text-text-soft hover:text-text transition-colors"
          style={{ width: 44, height: 44 }}
          aria-label="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={22}
            height={22}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Product info - centered, takes available space */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-8">
        {/* Emoji */}
        {emoji && (
          <span className="mb-4" style={{ fontSize: "72px", lineHeight: 1 }}>
            {emoji}
          </span>
        )}

        {/* Shelf language name - HUGE */}
        <h1
          className="text-center font-bold leading-tight"
          style={{ fontSize: "42px", color: "#e8c364" }}
        >
          {shelfName}
        </h1>

        {/* User language name - smaller, underneath */}
        {shelfLang !== userLang && userName !== shelfName && (
          <p className="text-text-soft text-lg mt-2 text-center">{userName}</p>
        )}

        {/* Qty + unit */}
        {qtyDisplay && (
          <p className="text-text mt-4 text-2xl font-medium">{qtyDisplay}</p>
        )}

        {/* Note */}
        {item.note && (
          <p className="text-text-soft mt-2 text-base italic text-center">
            {item.note}
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="mx-6">
        <div className="h-px bg-border-light" />
      </div>

      {/* Phrase buttons */}
      <div
        className="px-4 pt-4"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="grid grid-cols-2 gap-2">
          {STORE_PHRASES.map((phrase) => {
            const phraseText = (phrase[shelfLang] as string) || phrase.en;
            return (
              <button
                key={phrase.key}
                onClick={() =>
                  setActivePhrase({ emoji: phrase.emoji, text: phraseText })
                }
                className="flex items-center gap-2 rounded-xl bg-card px-3 py-3 text-left transition-colors active:bg-accent"
              >
                <span className="text-xl shrink-0">{phrase.emoji}</span>
                <span className="text-text text-sm leading-snug">
                  {phraseText}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
