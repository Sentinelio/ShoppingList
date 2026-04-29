import { memo } from "react";
import type { Item } from "../../lib/supabase";
import { matchProductEmoji } from "../../lib/emojiMatcher";
import { getCategoryColor } from "../../data/categories";
import { t, formatQtyUnit, type Lang } from "../../data/i18n";
import { formatPrice } from "../../lib/itemData";

interface ItemCardProps {
  item: Item;
  userLang: string;
  shelfLang: string;
  isPending?: boolean;
  isFailed?: boolean;
  avgPrice?: number | null;
  avgPriceCurrency?: string | null;
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
  avgPrice,
  avgPriceCurrency,
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

  const qtyDisplay = formatQtyUnit(item.qty, item.unit, lang);

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
      className={`relative flex flex-col items-center justify-center cursor-pointer active:scale-[0.97] transition-transform ${item.important ? "babelcart-important" : ""}`}
      style={{
        padding: "14px 6px 10px",
        // Theme can override background/border/radius/shadow; otherwise fall
        // back to the category color tint that has always been the default.
        background: `var(--item-card-bg, ${catColor}26)`,
        border: item.important ? "none" : `var(--item-card-border, 1px solid ${catColor}40)`,
        borderRadius: "var(--item-card-radius, 16px)",
        boxShadow: "var(--item-card-shadow, none)",
        opacity: isPending ? 0.6 : 1,
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

      {/* Top-right cluster: qty badge + note indicator (note sits to the
          right of the qty so it stays out of the way of the price tag). */}
      {(qtyDisplay || item.note) && (
        <div
          className="absolute flex items-center gap-1"
          style={{ top: 6, right: 6 }}
        >
          {qtyDisplay && (
            <div
              className="flex items-center justify-center rounded-md"
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "1px 5px",
                lineHeight: 1.4,
                backgroundColor: `var(--item-qty-bg, ${catColor}4D)`,
                color: "var(--item-qty-color, #e6e8ee)",
              }}
            >
              {qtyDisplay}
            </div>
          )}
          {item.note && (
            <span className="select-none" style={{ fontSize: 11, lineHeight: 1 }}>
              {"\uD83D\uDCDD"}
            </span>
          )}
        </div>
      )}

      {/* Average price tag - bottom right (shared cross-user price book) */}
      {!isPending && !isFailed && avgPrice != null && avgPrice > 0 && (
        <div
          className="absolute flex items-center justify-center rounded-md"
          style={{
            bottom: 4,
            right: 6,
            fontSize: 10,
            fontWeight: 600,
            padding: "1px 5px",
            lineHeight: 1.4,
            backgroundColor: "var(--item-price-bg, rgba(74, 222, 128, 0.18))",
            color: "var(--item-price-color, #4ade80)",
          }}
        >
          ~{formatPrice(avgPrice, avgPriceCurrency || "EUR")}
        </div>
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
        <span
          className="select-none"
          style={{ fontSize: "var(--item-emoji-size, 48px)", lineHeight: 1 }}
          aria-hidden="true"
        >
          {emoji}
        </span>
      )}

      {/* Product name */}
      <p
        className="text-center leading-tight mt-1 w-full truncate px-1"
        style={{
          fontSize: 12,
          fontWeight: "var(--item-name-weight, 700)" as unknown as number,
          color: "var(--item-name-color, var(--color-text, #e6e8ee))",
        }}
      >
        {displayName}
      </p>

      {/* Shelf translation */}
      {showShelf && !isPending && !isFailed && (
        <p
          className="text-center leading-tight truncate w-full px-1"
          style={{ fontSize: 10, color: "var(--item-shelf-color, #e8c364)" }}
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
