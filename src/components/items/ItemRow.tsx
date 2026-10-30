import { memo, type ReactNode } from "react";
import type { Item } from "../../lib/pocketbase";
import { t, formatQtyUnit } from "../../data/i18n";
import { primaryName, secondaryName } from "../../lib/names";
import { highlight } from "../../lib/highlight";
import ItemIcon from "./ItemIcon";
import { IconCheck } from "../ui/icons";

interface ItemRowProps {
  item: Item;
  listLang: string;
  userLang: string;
  /** Search query to highlight in both names. */
  query?: string;
  onToggle: (itemId: string, checked: boolean) => void;
  onOpen: (item: Item) => void;
}

// One product inside a category block: icon, primary name (list country's
// language; red with a dot when important), my language below, qty pill and
// the check box on the right.
function ItemRow({ item, listLang, userLang, query, onToggle, onOpen }: ItemRowProps) {
  const primary = primaryName(item, listLang);
  const mine = secondaryName(item, listLang, userLang);
  const qty = formatQtyUnit(item.qty, item.unit, userLang);
  const mark = (s: string): ReactNode => (query ? highlight(s, query) : s);
  const done = item.checked && !item.unavailable;

  return (
    <div className="flex items-center gap-3 pl-3 min-h-[56px]" style={{ opacity: done ? 0.55 : 1 }}>
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="flex-1 min-w-0 flex items-center gap-3 py-2 text-left cursor-pointer active:opacity-70"
      >
        <ItemIcon name={item.original} category={item.category} photo={item.photo} size={40} />
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-1.5 min-w-0">
            <span
              className="truncate text-[15px] font-semibold leading-tight"
              style={{
                color: item.important ? "var(--color-important)" : "var(--color-primary-name)",
                textDecoration: done ? "line-through" : undefined,
              }}
            >
              {mark(primary)}
            </span>
            {item.important && (
              <span
                className="shrink-0 rounded-full"
                style={{ width: 7, height: 7, background: "var(--color-important)" }}
                aria-label={t(userLang, "important")}
              />
            )}
          </span>
          {mine && (
            <span className="block truncate text-[12px] leading-tight mt-0.5" style={{ color: "var(--color-secondary-name)" }}>
              {mark(mine)}
            </span>
          )}
        </span>
        {qty && (
          <span
            className="shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold tabular-nums"
            style={{ background: "color-mix(in srgb, var(--color-text) 7%, transparent)", color: "var(--color-text)" }}
          >
            {qty}
          </span>
        )}
      </button>
      <button
        type="button"
        role="checkbox"
        aria-checked={item.checked}
        aria-label={item.checked ? t(userLang, "uncheck") : t(userLang, "check")}
        onClick={() => onToggle(item.id, !item.checked)}
        className="shrink-0 w-12 h-14 flex items-center justify-center cursor-pointer"
      >
        <span
          className="flex items-center justify-center rounded-[7px]"
          style={{
            width: 24,
            height: 24,
            border: item.checked ? "none" : "2px solid var(--color-text-muted)",
            background: item.checked ? "var(--color-accent)" : "transparent",
            color: "var(--color-on-accent)",
          }}
        >
          {item.checked && <IconCheck size={16} strokeWidth={3} />}
        </span>
      </button>
    </div>
  );
}

export default memo(ItemRow);
