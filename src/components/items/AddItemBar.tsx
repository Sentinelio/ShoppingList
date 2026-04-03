import { useState, useRef, type FormEvent } from "react";
import { parseQtyInput } from "../../lib/qtyParser";
import { translateProduct } from "../../lib/translate";
import { addItem, checkDuplicate, updateItem } from "../../hooks/useItems";
import { t, type Lang } from "../../data/i18n";
import type { Item } from "../../lib/supabase";

interface AddItemBarProps {
  listId: string;
  userLang: string;
  shelfLang: string;
  userId: string;
  userName: string;
  onItemAdded: () => void;
}

const UNITS = [
  { value: "", label: "\u00d7" },
  { value: "kg", label: "kg" },
  { value: "g", label: "g" },
  { value: "L", label: "L" },
  { value: "ml", label: "ml" },
  { value: "cl", label: "cl" },
  { value: "pack", label: "pack" },
];

export default function AddItemBar({
  listId,
  userLang,
  shelfLang,
  userId,
  userName,
  onItemAdded,
}: AddItemBarProps) {
  const lang = (userLang === "en" || userLang === "es" || userLang === "pl" ? userLang : "en") as Lang;

  const [input, setInput] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [note, setNote] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [duplicate, setDuplicate] = useState<{ item: Item; translations: Record<string, string>; category: string; parsedQty: string; parsedUnit: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const targetLangs = [...new Set([userLang, shelfLang, "en"])];

  const reset = () => {
    setInput("");
    setQty("");
    setUnit("");
    setNote("");
    setExpanded(false);
    setDuplicate(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || translating) return;

    const parsed = parseQtyInput(trimmed);
    const finalQty = qty || parsed.qty || "";
    const finalUnit = unit || parsed.unit || "";

    setTranslating(true);
    try {
      const result = await translateProduct(parsed.text, targetLangs);

      // Check for duplicates
      const existing = await checkDuplicate(listId, result.translations);
      if (existing) {
        setDuplicate({
          item: existing,
          translations: result.translations,
          category: result.category,
          parsedQty: finalQty,
          parsedUnit: finalUnit,
        });
        setTranslating(false);
        return;
      }

      await addItem({
        listId,
        original: parsed.text,
        translations: result.translations,
        category: result.category,
        qty: finalQty,
        unit: finalUnit,
        note,
        addedBy: userId,
        addedByName: userName,
      });

      reset();
      onItemAdded();
    } catch {
      // Translation or add failed — keep input so user can retry
    } finally {
      setTranslating(false);
    }
  };

  const handleMerge = async () => {
    if (!duplicate) return;
    const { item, parsedQty } = duplicate;
    const existingQty = parseFloat(item.qty) || 0;
    const newQty = parseFloat(parsedQty) || 1;
    const mergedQty = String(existingQty + newQty);

    try {
      await updateItem(item.id, { qty: mergedQty });
      reset();
      onItemAdded();
    } catch {
      // keep state on error
    }
  };

  const handleAddAnyway = async () => {
    if (!duplicate) return;
    const parsed = parseQtyInput(input.trim());

    try {
      await addItem({
        listId,
        original: parsed.text,
        translations: duplicate.translations,
        category: duplicate.category,
        qty: duplicate.parsedQty,
        unit: duplicate.parsedUnit,
        note,
        addedBy: userId,
        addedByName: userName,
      });
      reset();
      onItemAdded();
    } catch {
      // keep state on error
    }
  };

  return (
    <div
      className="sticky bottom-0 left-0 right-0 z-30 bg-bg border-t border-border-light"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      {/* Duplicate banner */}
      {duplicate && (
        <div className="px-4 py-3 bg-card border-b border-border-light">
          <p className="text-sm text-text-soft mb-2">{t(lang, "items.duplicate")}</p>
          <div className="flex gap-2">
            <button
              onClick={handleMerge}
              className="flex-1 text-sm font-medium py-2 rounded-lg bg-accent text-white active:brightness-90"
            >
              {t(lang, "items.mergeQty")}
            </button>
            <button
              onClick={handleAddAnyway}
              className="flex-1 text-sm font-medium py-2 rounded-lg bg-card border border-border-light text-text active:brightness-90"
            >
              {t(lang, "items.addAnyway")}
            </button>
            <button
              onClick={() => setDuplicate(null)}
              className="text-sm text-text-muted py-2 px-2 active:brightness-90"
            >
              {t(lang, "common.cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Expanded fields */}
      {expanded && (
        <div className="px-4 py-3 bg-card border-b border-border-light flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-text-muted mb-1 block">{t(lang, "items.qty")}</label>
            <input
              type="text"
              inputMode="decimal"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted outline-none focus:border-accent"
              placeholder="1"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-text-muted mb-1 block">{t(lang, "items.unit")}</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent appearance-none"
            >
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-[2]">
            <label className="text-xs text-text-muted mb-1 block">{t(lang, "items.note")}</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted outline-none focus:border-accent"
              placeholder={t(lang, "items.note")}
            />
          </div>
        </div>
      )}

      {/* Main input row */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 pt-2">
        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 w-8 h-8 flex items-center justify-center text-text-soft active:text-text transition-colors"
          aria-label="Toggle details"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t(lang, "items.add")}
          disabled={translating}
          className="flex-1 bg-card border border-border-light rounded-xl px-4 py-2.5 text-text placeholder:text-text-muted text-[15px] outline-none focus:border-accent transition-colors disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={!input.trim() || translating}
          className="shrink-0 w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center active:brightness-90 disabled:opacity-40 disabled:pointer-events-none transition-all"
        >
          {translating ? (
            <span className="text-xs font-medium animate-pulse">...</span>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={20}
              height={20}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          )}
        </button>
      </form>

      {/* Translating indicator */}
      {translating && (
        <p className="px-4 pt-1 text-xs text-accent animate-pulse">
          {t(lang, "items.translating")}
        </p>
      )}
    </div>
  );
}
