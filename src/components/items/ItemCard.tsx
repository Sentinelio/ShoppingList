import { memo } from "react";
import type { Item } from "../../lib/supabase";
import { matchProductEmoji } from "../../lib/emojiMatcher";
import { getCategoryColor } from "../../data/categories";
import { t, type Lang } from "../../data/i18n";

interface ItemCardProps {
  item: Item;
  userLang: string;
  shelfLang: string;
  isPending?: boolean;
  isFailed?: boolean;
  onToggle: (itemId: string, checked: boolean) => void;
  onClick: (item: Item) => void;
  onRetry?: (item: Item) => void;
}

function ItemCard({
  item,
  userLang,
  shelfLang,
  isPending,
  isFailed,
  onToggle,
  onClick,
  onRetry,
}: ItemCardProps) {
  const lang = (userLang === "en" || userLang === "es" || userLang === "pl" ? userLang : "en") as Lang;
  const catColor = getCategoryColor(item.category || "other");
  const displayName = item.translations[userLang] || item.original;
  const shelfName = item.translations[shelfLang] || item.original;
  const showShelf = shelfLang !== userLang && shelfName.toLowerCase() !== displayName.toLowerCase();
  const { emoji } = matchProductEmoji(item.original);

  const hasQty = item.qty && item.qty !== "";
  const hasUnit = item.unit && item.unit !== "";
  const qtyDisplay = [hasQty && item.qty, hasUnit && item.unit].filter(Boolean).join("");

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick(item);
    }
  };
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={displayName}
      className={`relative flex flex-col items-center justify-center rounded-2xl cursor-pointer active:scale-[0.97] transition-transform ${item.important ? "babelcart-important" : ""}`}
      style={{
        padding: "14px 6px 10px",
        backgroundColor: `${catColor}26`,
        border: item.important ? "none" : `1px solid ${catColor}40`,
        opacity: isPending ? 0.6 : 1,
        boxShadow: "none",
        ["--babelcart-cat-bg" as string]: `${catColor}26`,
      }}
      onClick={() => onClick(item)}
      onKeyDown={handleCardKeyDown}
    >
      {/* Checkbox - top left */}
      <div
        className="absolute cursor-pointer"
        style={{ top: 7, left: 7 }}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(item.id, !item.checked);
        }}
        role="checkbox"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            onToggle(item.id, !item.checked);
          }
        }}
        aria-checked={item.checked}
        aria-label={item.checked ? t(lang, "uncheck") : t(lang, "check")}
      >
        <div
          className="flex items-center justify-center rounded-full border-2"
          style={{
            width: 20,
            height: 20,
            borderColor: item.checked ? "#4ade80" : "var(--color-border-light)",
            backgroundColor: item.checked ? "#4ade80" : "var(--color-card)",
          }}
        >
          {item.checked && (
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      </div>

      {/* Qty badge - top right */}
      {qtyDisplay && (
        <div
          className="absolute flex items-center justify-center rounded-md text-text"
          style={{
            top: 6,
            right: 6,
            fontSize: 10,
            fontWeight: 700,
            padding: "1px 5px",
            lineHeight: 1.4,
            backgroundColor: `${catColor}4D`,
          }}
        >
          {qtyDisplay}
        </div>
      )}

      {/* Note indicator - bottom right */}
      {item.note && (
        <span className="absolute select-none" style={{ bottom: 4, right: 6, fontSize: 10 }}>
          {"\uD83D\uDCDD"}
        </span>
      )}

      {/* Center: photo or emoji */}
      {item.photo ? (
        <img
          src={item.photo}
          className="rounded-xl object-cover"
          style={{ width: 52, height: 52 }}
          alt={displayName}
          loading="lazy"
        />
      ) : (
        <span className="select-none" style={{ fontSize: 48, lineHeight: 1 }} aria-hidden="true">
          {emoji}
        </span>
      )}

      {/* Product name */}
      <p
        className="text-center text-text font-bold leading-tight mt-1 w-full truncate px-1"
        style={{ fontSize: 12 }}
      >
        {displayName}
      </p>

      {/* Shelf translation */}
      {showShelf && !isPending && !isFailed && (
        <p
          className="text-center leading-tight truncate w-full px-1"
          style={{ fontSize: 10, color: "#e8c364" }}
        >
          {shelfName}
        </p>
      )}

      {/* Pending state */}
      {isPending && (
        <p className="text-center animate-pulse" style={{ fontSize: 10, color: "var(--color-text-muted)" }}>
          {t(lang, "translating")}
        </p>
      )}

      {/* Failed state */}
      {isFailed && (
        <button
          type="button"
          className="text-center cursor-pointer"
          style={{ fontSize: 10, color: "#f87171" }}
          onClick={(e) => {
            e.stopPropagation();
            onRetry?.(item);
          }}
        >
          {t(lang, "retry")}
        </button>
      )}
    </div>
  );
}

export default memo(ItemCard);
