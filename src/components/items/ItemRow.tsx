import type { Item } from "../../lib/supabase";
import SwipeRow from "../ui/SwipeRow";
import ProductIcon from "../ui/ProductIcon";

interface ItemRowProps {
  item: Item;
  userLang: string;
  shelfLang: string;
  onToggle: (itemId: string, checked: boolean) => void;
  onEdit: (item: Item) => void;
  onDelete: (itemId: string) => void;
  onShowStore: (item: Item) => void;
}

export default function ItemRow({
  item,
  userLang,
  shelfLang,
  onToggle,
  onEdit,
  onDelete,
  onShowStore,
}: ItemRowProps) {
  const userName = item.translations[userLang] || item.original;
  const shelfName = item.translations[shelfLang] || item.original;
  const showShelf = shelfLang !== userLang && shelfName.toLowerCase() !== userName.toLowerCase();

  const hasQty = item.qty && item.qty !== "";
  const hasUnit = item.unit && item.unit !== "";
  const qtyDisplay = [hasQty && item.qty, hasUnit && item.unit].filter(Boolean).join(" ");

  return (
    <SwipeRow
      onEdit={() => onEdit(item)}
      onDelete={() => onDelete(item.id)}
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 transition-opacity ${
          item.checked ? "opacity-45" : ""
        }`}
      >
        {/* Checkbox */}
        <button
          onClick={() => onToggle(item.id, !item.checked)}
          className="shrink-0"
          aria-label={item.checked ? "Uncheck" : "Check"}
        >
          <div
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
              item.checked
                ? "bg-accent border-accent"
                : "border-border-light bg-transparent"
            }`}
          >
            {item.checked && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        </button>

        {/* Product icon */}
        <ProductIcon name={item.original} category={item.category} />

        {/* Text block */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-text leading-snug truncate ${
              item.checked ? "line-through" : ""
            }`}
            style={{ fontSize: "15px" }}
          >
            {userName}
          </p>
          {showShelf && (
            <p className="text-shelf leading-snug truncate" style={{ fontSize: "13px" }}>
              {shelfName}
            </p>
          )}
          {qtyDisplay && (
            <p className="text-text-muted leading-snug" style={{ fontSize: "12px" }}>
              {qtyDisplay}
            </p>
          )}
          {item.added_by_name && (
            <p className="text-text-muted leading-snug truncate" style={{ fontSize: "11px" }}>
              {item.added_by_name}
            </p>
          )}
        </div>

        {/* Store mode button */}
        <button
          onClick={() => onShowStore(item)}
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-text-muted active:bg-card transition-colors"
          aria-label="Show in store"
        >
          <span style={{ fontSize: "16px" }}>&#x1F4F1;</span>
        </button>
      </div>
    </SwipeRow>
  );
}
