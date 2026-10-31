import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent, type ChangeEvent } from "react";
import { parseQty } from "../../lib/qtyParser";
import { translateProduct } from "../../lib/translate";
import { addItem, deleteItem, updateItem } from "../../hooks/useItems";
import { t } from "../../data/i18n";
import { getEnabledLangs } from "../../lib/langConfig";
import { preloadDictionary, suggest, type DictSuggestion } from "../../lib/dictSuggest";
import { exactSuggestion, otherNames, shownName } from "../../lib/suggestRank";
import { uploadItemPhoto } from "../../lib/photoUpload";
import { primaryName, secondaryName } from "../../lib/names";
import { useKeyboardInset } from "../../hooks/useKeyboardInset";
import { useBackToClose } from "../../lib/router";
import type { Item } from "../../lib/pocketbase";
import ItemIcon from "./ItemIcon";
import { IconAlert, IconCamera, IconCheck, IconNote } from "../ui/icons";

interface AddItemSheetProps {
  open: boolean;
  onClose: () => void;
  listId: string;
  userLang: string;
  /** Language of the list's country (primary names). */
  shelfLang: string;
  userId: string;
  userName: string;
  onItemAdded: (item: Item | null) => void;
}

// Quantities people pick most, per unit (shown in the ▾ menu).
const COMMON_QTYS: Record<string, string[]> = {
  "": ["1", "2", "3", "4", "5", "6", "8", "10", "12"],
  x: ["1", "2", "3", "4", "5", "6", "8", "10", "12"],
  kg: ["0.5", "1", "1.5", "2", "3"],
  L: ["0.5", "1", "1.5", "2", "3"],
  g: ["100", "200", "250", "500", "750"],
  pack: ["1", "2", "3", "4", "6"],
};

function getUnits(lang: string) {
  return [
    { value: "x", label: t(lang, "unitPcs") },
    { value: "kg", label: "kg" },
    { value: "g", label: "g" },
    { value: "L", label: "L" },
    { value: "pack", label: t(lang, "unitPack") },
  ];
}

// 3.3 — bottom sheet to add products, glued to the keyboard.
//  1. Only the search field shows; results grow upwards from it (best match
//     next to the field, «as typed» right on top of it).
//  2. Tapping a result ADDS it at once (a dictionary product with its
//     translations, no Claude call; «as typed» is translated).
//  3. "✓ Added" then offers quantity, unit, important, brand/note and photo,
//     which change that item, plus Undo. Typing the next product hides them.
export default function AddItemSheet({
  open,
  onClose,
  listId,
  userLang,
  shelfLang,
  userId,
  userName,
  onItemAdded,
}: AddItemSheetProps) {
  const lang = userLang;
  const UNITS = getUnits(lang);

  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<DictSuggestion[]>([]);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [adding, setAdding] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // The item just added: the options below edit it.
  const [last, setLast] = useState<Item | null>(null);
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [note, setNote] = useState("");
  const [brand, setBrand] = useState("");
  const [showExtra, setShowExtra] = useState(false);
  const [qtyMenu, setQtyMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const suggestionReqId = useRef(0);
  const keyboardInset = useKeyboardInset(open);

  const targetLangs = [...new Set([userLang, shelfLang, "en", ...getEnabledLangs()])];
  const mineOf = (s: DictSuggestion) => s.translations[userLang] || s.key;

  useEffect(() => {
    preloadDictionary();
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Fetch suggestions as the user types. The suggestionReqId guard prevents a
  // slow response from overwriting a later, faster one.
  useEffect(() => {
    const query = input.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setHighlightedIdx(-1);
      return;
    }
    const reqId = ++suggestionReqId.current;
    suggest(query, userLang, 8).then(results => {
      if (reqId !== suggestionReqId.current) return;
      setSuggestions(results);
      setHighlightedIdx(-1);
    });
  }, [input, userLang]);

  // Typed quantity / brand / note reach the added item after a short pause.
  useEffect(() => {
    if (!last) return;
    if (qty === (last.qty || "") && note === (last.note || "") && brand === (last.brand || "")) return;
    const id = setTimeout(() => { void patchLast({ qty, note, brand }); }, 600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- patchLast reads `last` itself
  }, [qty, note, brand, last]);

  const patchLast = async (updates: Partial<Pick<Item, "qty" | "unit" | "note" | "brand" | "photo" | "important">>) => {
    if (!last) return;
    setLast(prev => (prev ? { ...prev, ...updates } : prev));
    try {
      const saved = await updateItem(last.id, updates);
      setLast(prev => (prev && prev.id === saved.id ? saved : prev));
    } catch (err) {
      console.error("[AddItem] update failed", err);
    }
  };

  const clearOptions = () => {
    setQty("");
    setUnit("");
    setNote("");
    setBrand("");
    setShowExtra(false);
    setQtyMenu(false);
  };

  const reset = () => {
    setInput("");
    setSuggestions([]);
    setHighlightedIdx(-1);
    setLast(null);
    clearOptions();
  };

  const close = () => {
    reset();
    onClose();
  };
  // Back closes the sheet instead of leaving the app.
  useBackToClose(open, close);

  // Adds a dictionary product (with its translations) or the typed text
  // (translated, never blocking the add), then shows the options for it.
  const addProduct = async (picked: DictSuggestion | null) => {
    const typed = input.trim();
    if (adding || (!picked && !typed)) return;
    const parsed = parseQty(picked ? mineOf(picked) : typed);
    setAdding(true);
    setSubmitError(null);

    let translations: Record<string, string> = { [userLang]: parsed.text, en: parsed.text };
    let category = "other";
    if (picked && picked.translations[shelfLang]) {
      translations = { ...picked.translations };
      category = picked.category || "other";
    } else {
      try {
        const result = await Promise.race([
          translateProduct(parsed.text, targetLangs, userLang),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Translation timeout")), 15000)),
        ]);
        translations = result.translations;
        category = result.category;
      } catch (err) {
        console.warn("[AddItem] Translation failed, adding with original text:", err);
      }
    }

    try {
      const created = await addItem({
        listId,
        original: parsed.text,
        translations,
        category,
        qty: parsed.qty || "",
        unit: parsed.unit || "",
        note: "",
        brand: "",
        photo: null,
        important: false,
        addedBy: userId,
        addedByName: userName,
      });
      setInput("");
      setSuggestions([]);
      setHighlightedIdx(-1);
      clearOptions();
      setQty(created.qty || "");
      setUnit(created.unit || "");
      setLast(created);
      inputRef.current?.blur();
      onItemAdded(created);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSubmitError(`${t(lang, "addFailed")}: ${msg}`);
      console.error("[AddItem] Insert failed:", msg, err);
      setTimeout(() => setSubmitError(null), 5000);
    } finally {
      setAdding(false);
    }
  };

  const undoLast = async () => {
    if (!last) return;
    const id = last.id;
    setLast(null);
    clearOptions();
    try { await deleteItem(id); } catch (err) { console.error("[AddItem] undo failed", err); }
    inputRef.current?.focus();
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadItemPhoto(file);
      if (url) await patchLast({ photo: url });
    } catch (err) {
      console.error("[photo upload]", err);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // An exact match in whatever language was typed: no «as typed» row, and
  // Enter adds it.
  const exact = exactSuggestion(suggestions);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      if (suggestions.length > 0) {
        setSuggestions([]);
        setHighlightedIdx(-1);
        return;
      }
      close();
      return;
    }
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIdx(i => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIdx(i => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Tab" && highlightedIdx >= 0) {
      e.preventDefault();
      void addProduct(suggestions[highlightedIdx]);
    }
  };

  // Enter: the highlighted result, else an exact match, else as typed.
  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    void addProduct(highlightedIdx >= 0 ? suggestions[highlightedIdx] : exact ?? null);
  };

  // Several lines pasted: each one becomes a product.
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (!text.includes("\n")) return;
    e.preventDefault();
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      const parsed = parseQty(line);
      void translateProduct(parsed.text, targetLangs)
        .catch(() => ({ translations: { [userLang]: parsed.text, en: parsed.text }, category: "other" }))
        .then(r => addItem({
          listId, original: parsed.text, translations: r.translations, category: r.category,
          qty: parsed.qty || "", unit: parsed.unit || "", note: "", addedBy: userId, addedByName: userName,
        }))
        .then(onItemAdded)
        .catch(err => console.error("[AddItem paste] Insert failed:", err));
    }
  };

  if (!open) return null;

  const typing = input.trim().length > 0;
  const showSuggestions = input.trim().length >= 2;
  const lastNamed = last ? { original: last.original, translations: last.translations } : null;
  const chip = (active: boolean) =>
    `h-9 min-w-[44px] px-3 shrink-0 rounded-full text-[13px] font-semibold cursor-pointer transition-colors ${
      active ? "text-on-accent" : "text-text"
    }`;
  const chipStyle = (active: boolean) => ({
    background: active ? "var(--color-accent)" : "color-mix(in srgb, var(--color-text) 6%, transparent)",
  });
  const toggleStyle = (active: boolean, color: string) => ({
    background: active ? `color-mix(in srgb, ${color} 15%, transparent)` : "color-mix(in srgb, var(--color-text) 6%, transparent)",
    color: active ? color : "var(--color-text-soft)",
  });

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={t(lang, "addProduct")}>
      <div className="absolute inset-0 bg-black/55" onClick={close} />
      <form
        onSubmit={handleSubmit}
        className="absolute left-0 right-0 bg-card rounded-t-[20px] border-t border-border-light px-3 pt-3 flex flex-col gap-2"
        style={{
          bottom: keyboardInset,
          paddingBottom: keyboardInset ? 8 : "max(8px, env(safe-area-inset-bottom))",
          maxHeight: `calc(100dvh - ${keyboardInset}px - 24px)`,
        }}
      >
        {/* While typing: results fill the space above the field, best match
            next to it, «as typed» right on top of it (unless there's an
            exact match). A tap adds the product. */}
        {showSuggestions && (
          <div className="flex-1 min-h-0 rounded-[14px] bg-bg overflow-y-auto flex flex-col-reverse" role="listbox">
            {!exact && (
              <button
                type="button"
                role="option"
                aria-selected={highlightedIdx === -1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addProduct(null)}
                disabled={adding}
                className="shrink-0 w-full flex items-center gap-3 px-3 min-h-[52px] text-left cursor-pointer disabled:opacity-50"
              >
                <span className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 bg-card" aria-hidden="true">✍️</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-semibold text-text truncate">«{input.trim()}»</span>
                  <span className="block text-[12px] truncate" style={{ color: "var(--color-secondary-name)" }}>{t(lang, "asTyped")}</span>
                </span>
              </button>
            )}
            {suggestions.map((s, i) => {
              // Big: the name in the language that matched what was typed.
              // Small: the country's name and mine, when they differ.
              const shown = shownName(s, userLang);
              const others = otherNames(s, userLang, shelfLang);
              return (
                <button
                  key={`${s.key}-${i}`}
                  type="button"
                  role="option"
                  aria-selected={i === highlightedIdx}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addProduct(s)}
                  disabled={adding}
                  className="shrink-0 w-full flex items-center gap-3 px-3 min-h-[52px] py-1 text-left cursor-pointer border-b border-border disabled:opacity-50"
                  style={{ background: i === highlightedIdx ? "color-mix(in srgb, var(--color-accent) 10%, transparent)" : "transparent" }}
                >
                  <ItemIcon name={s.translations.en || s.key} category={s.category} size={32} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-semibold text-text truncate">{shown}</span>
                    {others.length > 0 && (
                      <span className="block text-[12px] truncate" style={{ color: "var(--color-primary-name)" }}>{others.join(" · ")}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="relative shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={last ? t(lang, "addAnother") : t(lang, "addProduct")}
            enterKeyHint="done"
            className="w-full h-11 px-3.5 rounded-xl bg-bg border border-border-light text-text text-[16px] placeholder:text-text-muted outline-none focus:border-accent"
          />
          {adding && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-text-muted animate-pulse">…</span>}
        </div>

        {submitError && (
          <div className="px-3 py-2 rounded-xl text-[12px] font-semibold shrink-0" style={{ background: "color-mix(in srgb, var(--color-danger) 10%, transparent)", color: "var(--color-important)" }}>
            {submitError}
          </div>
        )}

        {/* Just added: what it is, Undo, and its options. */}
        {last && lastNamed && !typing && (
          <>
            <div className="flex items-center gap-3 px-1 shrink-0">
              <ItemIcon name={last.translations?.en || last.original} category={last.category} size={32} />
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-bold truncate" style={{ color: "var(--color-primary-name)" }}>
                  <span style={{ color: "var(--color-success)" }}>✓ </span>{primaryName(lastNamed, shelfLang)}
                </span>
                <span className="block text-[12px] truncate" style={{ color: "var(--color-secondary-name)" }}>
                  {secondaryName(lastNamed, shelfLang, userLang) ?? last.original} · {t(lang, "added")}
                </span>
              </span>
              <button type="button" onClick={undoLast}
                className="shrink-0 h-9 px-3 rounded-full text-[13px] font-semibold cursor-pointer"
                style={{ background: "var(--color-danger-soft)", color: "var(--color-danger-ink)" }}>
                {t(lang, "undo")}
              </button>
            </div>

            {/* Quantity: type any number, or pick a common one from ▾ (per unit). */}
            <div className="relative flex items-center gap-2 shrink-0">
              <label className="flex-1 min-w-0 flex items-center h-11 rounded-xl bg-bg border border-border-light focus-within:border-accent">
                <span className="sr-only">{t(lang, "quantity")}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={qty}
                  onChange={(e) => setQty(e.target.value.replace(",", ".").replace(/[^0-9.]/g, "").slice(0, 7))}
                  placeholder={t(lang, "quantity")}
                  className="flex-1 min-w-0 h-full px-3 bg-transparent text-text text-[16px] placeholder:text-text-muted outline-none"
                />
                {qty && (
                  <button type="button" onClick={() => setQty("")} aria-label={t(lang, "remove")}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted cursor-pointer">✕</button>
                )}
                <button type="button" onClick={() => setQtyMenu(v => !v)} aria-expanded={qtyMenu} aria-label={t(lang, "quantity")}
                  className="w-11 h-full shrink-0 flex items-center justify-center text-text-soft cursor-pointer border-l border-border-light">
                  ▾
                </button>
              </label>
              <select
                value={unit}
                onChange={(e) => { setUnit(e.target.value); void patchLast({ unit: e.target.value }); }}
                aria-label={t(lang, "unit")}
                className="w-[112px] shrink-0 h-11 px-3 rounded-xl bg-bg border border-border-light text-text text-[16px] cursor-pointer outline-none focus:border-accent"
              >
                <option value="">{t(lang, "unit")}</option>
                {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
              {qtyMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setQtyMenu(false)} />
                  <div role="listbox" aria-label={t(lang, "quantity")}
                    className="absolute left-0 bottom-full mb-2 z-20 p-2 rounded-2xl bg-card border border-border-light shadow-2xl grid grid-cols-5 gap-1.5"
                    style={{ width: "min(320px, 100%)" }}>
                    {(COMMON_QTYS[unit] ?? COMMON_QTYS[""]).map(q => (
                      <button key={q} type="button" role="option" aria-selected={qty === q}
                        onClick={() => { setQty(q); setQtyMenu(false); }}
                        className={chip(qty === q)} style={chipStyle(qty === q)}>
                        {Number(q).toLocaleString(lang)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {showExtra && (
              <div className="flex gap-1.5 shrink-0">
                <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder={t(lang, "brand")}
                  className="flex-1 min-w-0 h-10 px-3 rounded-xl bg-bg border border-border text-text text-[16px] placeholder:text-text-muted outline-none focus:border-accent" />
                <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t(lang, "note")}
                  className="flex-1 min-w-0 h-10 px-3 rounded-xl bg-bg border border-border text-text text-[16px] placeholder:text-text-muted outline-none focus:border-accent" />
              </div>
            )}

            {/* Important · Brand & note · Photo · Done */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button type="button" onClick={() => patchLast({ important: !last.important })} aria-pressed={last.important}
                className="h-11 px-3 rounded-xl flex items-center gap-1.5 text-[13px] font-semibold cursor-pointer"
                style={toggleStyle(last.important, "var(--color-important)")}>
                <IconAlert size={18} /> {t(lang, "important")}
              </button>
              <button type="button" onClick={() => setShowExtra(v => !v)} aria-pressed={showExtra || !!brand || !!note}
                className="h-11 px-3 rounded-xl flex items-center gap-1.5 text-[13px] font-semibold cursor-pointer min-w-0"
                style={toggleStyle(showExtra || !!brand || !!note, "var(--color-accent-ink)")}>
                <IconNote size={18} /> <span className="truncate">{t(lang, "brandAndNote")}</span>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                aria-label={t(lang, "addPhoto")}
                className="w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer disabled:opacity-40 shrink-0 overflow-hidden"
                style={toggleStyle(!!last.photo, "var(--color-accent-ink)")}>
                {last.photo ? <img src={last.photo} alt="" className="w-full h-full object-cover" /> : uploading ? "…" : <IconCamera size={20} />}
              </button>
              <span className="flex-1" />
              <button type="button" onClick={close} aria-label={t(lang, "close")}
                className="w-11 h-11 rounded-full flex items-center justify-center text-on-accent cursor-pointer shrink-0"
                style={{ background: "var(--color-accent)" }}>
                <IconCheck size={22} strokeWidth={2.6} />
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
