import { useState, useRef, type FormEvent, type KeyboardEvent } from "react";
import { parseQty } from "../../lib/qtyParser";
import { translateProduct } from "../../lib/translate";
import { addItem, checkDuplicate } from "../../hooks/useItems";
import { t, type Lang } from "../../data/i18n";
import type { Item } from "../../lib/supabase";

interface AddItemBarProps {
  listId: string;
  userLang: string;
  shelfLang: string;
  userId: string;
  userName: string;
  items: Item[];
  onItemAdded: () => void;
  onDuplicateFound?: (
    existing: Item,
    newTranslations: Record<string, string>,
    category: string,
    qty: string,
    unit: string,
  ) => void;
}

const UNITS = [
  { value: "", label: "\u2014" },
  { value: "x", label: "\u00d7" },
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
  items: _items,
  onItemAdded,
  onDuplicateFound,
}: AddItemBarProps) {
  const lang = (userLang === "en" || userLang === "es" || userLang === "pl" ? userLang : "en") as Lang;

  const [input, setInput] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [note, setNote] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [translating, setTranslating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const targetLangs = [...new Set([userLang, shelfLang, "en"])];

  const reset = () => {
    setInput("");
    setQty("");
    setUnit("");
    setNote("");
    setExpanded(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      reset();
      inputRef.current?.blur();
    }
  };

  const handleFocus = () => {
    setExpanded(true);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (text.includes("\n")) {
      e.preventDefault();
      const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length > 0) {
        setInput(lines[0]);
        for (let i = 1; i < lines.length; i++) {
          submitSingleItem(lines[i]);
        }
      }
    }
  };

  const submitSingleItem = async (text: string) => {
    const parsed = parseQty(text);
    try {
      const result = await translateProduct(parsed.text, targetLangs);
      await addItem({
        listId,
        original: parsed.text,
        translations: result.translations,
        category: result.category,
        qty: parsed.qty || "",
        unit: parsed.unit || "",
        note: "",
        addedBy: userId,
        addedByName: userName,
      });
      onItemAdded();
    } catch {
      // silently skip failed bulk items
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || translating) return;

    const parsed = parseQty(trimmed);
    const finalQty = qty || parsed.qty || "";
    const finalUnit = unit || parsed.unit || "";

    setTranslating(true);
    try {
      const result = await translateProduct(parsed.text, targetLangs);

      // Check for duplicates
      const existing = await checkDuplicate(listId, result.translations);
      if (existing && onDuplicateFound) {
        onDuplicateFound(existing, result.translations, result.category, finalQty, finalUnit);
        setTranslating(false);
        reset();
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
      // keep input so user can retry
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div
      className="sticky bottom-0 left-0 right-0 z-30 bg-card border-t border-border-light"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      {/* Main input row */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 pt-3">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={t(lang, "addProduct")}
          disabled={translating}
          className="flex-1 bg-transparent text-text placeholder:text-text-muted outline-none disabled:opacity-50"
          style={{ fontSize: 16 }}
        />

        {/* Add button -- hidden when expanded */}
        {!expanded && (
          <button
            type="submit"
            disabled={!input.trim() || translating}
            className="shrink-0 w-10 h-10 rounded-xl text-white flex items-center justify-center active:brightness-90 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
            style={{ background: "linear-gradient(135deg, #f0883e, #e8c364)" }}
          >
            {translating ? (
              <span className="text-xs font-medium animate-pulse">...</span>
            ) : (
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            )}
          </button>
        )}
      </form>

      {/* Expanded fields */}
      {expanded && (
        <>
          <div className="flex gap-2 items-center px-4 pt-2">
            {/* Qty */}
            <input
              type="number"
              inputMode="decimal"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder={t(lang, "qty")}
              className="bg-bg border border-border rounded-lg px-2 py-2 text-sm text-text placeholder:text-text-muted outline-none focus:border-accent"
              style={{ width: 60 }}
            />

            {/* Unit */}
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="bg-bg border border-border rounded-lg px-2 py-2 text-sm text-text outline-none focus:border-accent appearance-none"
              style={{ width: 70 }}
            >
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>

            {/* Note */}
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t(lang, "notePlaceholder")}
              className="flex-1 bg-bg border border-border rounded-lg px-2 py-2 text-sm text-text placeholder:text-text-muted outline-none focus:border-accent min-w-0"
            />

            {/* Photo button (placeholder) */}
            <button
              type="button"
              className="shrink-0 w-9 h-9 rounded-lg bg-bg border border-border flex items-center justify-center text-text-soft active:bg-card transition-colors cursor-pointer"
              aria-label="Add photo"
            >
              <span style={{ fontSize: 16 }}>{"\uD83D\uDCF7"}</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 px-4 pt-2 pb-1">
            <button
              type="button"
              onClick={reset}
              className="shrink-0 w-10 h-10 rounded-xl bg-bg border border-border-light text-text-soft flex items-center justify-center active:brightness-90 cursor-pointer"
            >
              {"\u2715"}
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e as unknown as FormEvent)}
              disabled={!input.trim() || translating}
              className="flex-[4] h-10 rounded-xl text-white font-medium flex items-center justify-center active:brightness-90 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
              style={{ background: "linear-gradient(135deg, #f0883e, #e8c364)" }}
            >
              {translating ? (
                <span className="text-sm animate-pulse">{t(lang, "translating")}</span>
              ) : (
                t(lang, "add")
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
