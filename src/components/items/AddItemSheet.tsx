import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent, type ChangeEvent } from "react";
import { parseQty } from "../../lib/qtyParser";
import { translateProduct } from "../../lib/translate";
import { addItem } from "../../hooks/useItems";
import { t } from "../../data/i18n";
import { getEnabledLangs } from "../../lib/langConfig";
import { preloadDictionary, suggest, type DictSuggestion } from "../../lib/dictSuggest";
import { uploadItemPhoto } from "../../lib/photoUpload";
import { primaryName, secondaryName } from "../../lib/names";
import { useKeyboardInset } from "../../hooks/useKeyboardInset";
import type { Item } from "../../lib/pocketbase";
import ItemIcon from "./ItemIcon";
import { IconAlert, IconCamera, IconNote, IconPlus } from "../ui/icons";

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

// 3.3 — bottom sheet to add a product. Compact and glued to the bottom (on
// top of the iOS keyboard while it's open). Stays open after adding so
// several products can be entered in a row.
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
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [note, setNote] = useState("");
  const [brand, setBrand] = useState("");
  const [showExtra, setShowExtra] = useState(false);
  const [qtyMenu, setQtyMenu] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [important, setImportant] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<DictSuggestion[]>([]);
  // A dictionary product picked from the suggestions: added with its
  // translations and category (no Claude call). Typing again unpicks it.
  const [selected, setSelected] = useState<DictSuggestion | null>(null);
  // «As typed» picked: same as above, translated by Claude when added.
  const [typedPicked, setTypedPicked] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const suggestionReqId = useRef(0);
  const keyboardInset = useKeyboardInset(open);

  const targetLangs = [...new Set([userLang, shelfLang, "en", ...getEnabledLangs()])];

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

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadItemPhoto(file);
      if (url) setPhoto(url);
    } catch (err) {
      console.error("[photo upload]", err);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const mineOf = (s: DictSuggestion) => s.translations[userLang] || s.key;

  // Picking a suggestion selects it and drops the keyboard, so the quantity
  // and unit can be chosen before adding. (It used to only copy the name
  // into the field: when that equalled what was typed, nothing seemed to
  // happen.)
  const applySuggestion = (s: DictSuggestion) => {
    setSelected(s);
    setInput(mineOf(s));
    setSuggestions([]);
    setHighlightedIdx(-1);
    inputRef.current?.blur();
  };

  const pickTyped = () => {
    setTypedPicked(true);
    setSuggestions([]);
    setHighlightedIdx(-1);
    inputRef.current?.blur();
  };

  const reset = () => {
    setInput("");
    setQtyMenu(false);
    setSelected(null);
    setTypedPicked(false);
    setQty("");
    setUnit("");
    setNote("");
    setBrand("");
    setPhoto(null);
    setImportant(false);
    setShowExtra(false);
    setSuggestions([]);
    setHighlightedIdx(-1);
  };

  const close = () => {
    reset();
    onClose();
  };

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
    } else if (e.key === "Tab" || (e.key === "Enter" && highlightedIdx >= 0)) {
      e.preventDefault();
      const target = suggestions[highlightedIdx >= 0 ? highlightedIdx : 0];
      if (target) applySuggestion(target);
    }
  };

  const submitSingleItem = async (text: string) => {
    const parsed = parseQty(text);
    let translations: Record<string, string> = { [userLang]: parsed.text, en: parsed.text };
    let category = "other";
    try {
      const result = await translateProduct(parsed.text, targetLangs);
      translations = result.translations;
      category = result.category;
    } catch { /* continue with original text */ }
    try {
      const created = await addItem({
        listId,
        original: parsed.text,
        translations,
        category,
        qty: parsed.qty || "",
        unit: parsed.unit || "",
        note: "",
        addedBy: userId,
        addedByName: userName,
      });
      onItemAdded(created);
    } catch (err) {
      console.error("[AddItem bulk] Insert failed:", err);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (!text.includes("\n")) return;
    e.preventDefault();
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      setInput(lines[0]);
      for (let i = 1; i < lines.length; i++) submitSingleItem(lines[i]);
    }
  };

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || translating) return;

    const parsed = parseQty(trimmed);
    const finalQty = qty || parsed.qty || "";
    const finalUnit = unit || parsed.unit || (qty ? "x" : "");

    setTranslating(true);
    setSubmitError(null);

    // 1. A picked dictionary product already has its translations; anything
    //    else is translated — but that NEVER blocks adding the item.
    let translations: Record<string, string> = { [userLang]: parsed.text, en: parsed.text };
    let category = "other";
    const picked = selected && mineOf(selected) === trimmed ? selected : null;
    if (picked && picked.translations[shelfLang]) {
      translations = { ...picked.translations };
      category = picked.category || "other";
    } else try {
      // Timeout: if translation takes > 15s, give up and add untranslated
      const result = await Promise.race([
        translateProduct(parsed.text, targetLangs, userLang),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Translation timeout")), 15000)),
      ]);
      translations = result.translations;
      category = result.category;
    } catch (err) {
      console.warn("[AddItem] Translation failed, adding with original text:", err);
    }

    // 2. Insert item — this MUST work, otherwise show error
    try {
      const created = await addItem({
        listId,
        original: parsed.text,
        translations,
        category,
        qty: finalQty,
        unit: finalUnit,
        note,
        brand,
        photo,
        important,
        addedBy: userId,
        addedByName: userName,
      });
      reset();
      onItemAdded(created);
      inputRef.current?.focus();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSubmitError(`No se pudo añadir: ${msg}`);
      console.error("[AddItem] Insert failed:", msg, err);
      setTimeout(() => setSubmitError(null), 5000);
    } finally {
      setTranslating(false);
    }
  };

  if (!open) return null;

  const showSuggestions = input.trim().length >= 2 && !selected && !typedPicked;
  // Quantity, unit, important… appear once a product is chosen.
  const picked = !!selected || typedPicked;
  // The dictionary has exactly what was typed (in my language): no «as typed» row.
  const sameText = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const exactMatch = suggestions.some(s => sameText(mineOf(s)) === sameText(input));
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
        {/* While typing: suggestions fill the space above the field (best match
            next to it, «as typed» right on top of it); the other controls hide. */}
        {showSuggestions && (
          <div className="flex-1 min-h-0 rounded-[14px] bg-bg overflow-y-auto flex flex-col-reverse" role="listbox">
            {!exactMatch && <button
              type="button"
              role="option"
              aria-selected={highlightedIdx === -1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={pickTyped}
              className="shrink-0 w-full flex items-center gap-3 px-3 min-h-[52px] text-left cursor-pointer"
            >
              <span className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 bg-card" aria-hidden="true">✍️</span>
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-semibold text-text truncate">«{input.trim()}»</span>
                <span className="block text-[12px] truncate" style={{ color: "var(--color-secondary-name)" }}>{t(lang, "asTyped")}</span>
              </span>
            </button>}
            {suggestions.map((s, i) => {
              const shelf = s.translations[shelfLang];
              return (
                <button
                  key={`${s.key}-${i}`}
                  type="button"
                  role="option"
                  aria-selected={i === highlightedIdx}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applySuggestion(s)}
                  className="shrink-0 w-full flex items-center gap-3 px-3 min-h-[52px] py-1 text-left cursor-pointer border-b border-border"
                  style={{ background: i === highlightedIdx ? "color-mix(in srgb, var(--color-accent) 10%, transparent)" : "transparent" }}
                >
                  <ItemIcon name={s.translations.en || s.key} category={s.category} size={32} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-semibold text-text truncate">{mineOf(s)}</span>
                    {shelf && shelfLang !== userLang && shelf.toLowerCase() !== mineOf(s).toLowerCase() && (
                      <span className="block text-[12px] truncate" style={{ color: "var(--color-primary-name)" }}>{shelf}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setTypedPicked(false); if (selected && e.target.value !== mineOf(selected)) setSelected(null); }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={t(lang, "addProduct")}
          disabled={translating}
          enterKeyHint="done"
          className="w-full h-11 px-3.5 rounded-xl bg-bg border border-border-light text-text text-[16px] placeholder:text-text-muted outline-none focus:border-accent disabled:opacity-50"
        />

        {/* The picked dictionary product, as it will show in the list. */}
        {selected && !showSuggestions && (
          <div className="flex items-center gap-3 px-1 shrink-0">
            <ItemIcon name={selected.translations.en || selected.key} category={selected.category} size={32} />
            <span className="flex-1 min-w-0">
              <span className="block text-[15px] font-bold truncate" style={{ color: "var(--color-primary-name)" }}>
                {primaryName({ original: selected.key, translations: selected.translations }, shelfLang)}
              </span>
              <span className="block text-[12px] truncate" style={{ color: "var(--color-secondary-name)" }}>
                {secondaryName({ original: selected.key, translations: selected.translations }, shelfLang, userLang) ?? mineOf(selected)}
              </span>
            </span>
          </div>
        )}

        {submitError && (
          <div className="px-3 py-2 rounded-xl text-[12px] font-semibold" style={{ background: "color-mix(in srgb, var(--color-danger) 10%, transparent)", color: "var(--color-important)" }}>
            {submitError}
          </div>
        )}

        {/* Quantity: type any number, or pick a common one from ▾ (per unit).
            Unit: a select, so the whole row fits without scrolling. */}
        {picked && (
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
              onChange={(e) => setUnit(e.target.value)}
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
        )}

        {showExtra && picked && (
          <div className="flex gap-1.5 shrink-0">
            <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder={t(lang, "brand")}
              className="flex-1 min-w-0 h-10 px-3 rounded-xl bg-bg border border-border text-text text-[16px] placeholder:text-text-muted outline-none focus:border-accent" />
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t(lang, "note")}
              className="flex-1 min-w-0 h-10 px-3 rounded-xl bg-bg border border-border text-text text-[16px] placeholder:text-text-muted outline-none focus:border-accent" />
          </div>
        )}

        {/* Important · Brand & note · Photo · Add */}
        {picked && <div className="flex items-center gap-1.5 shrink-0">
          <button type="button" onClick={() => setImportant(v => !v)} aria-pressed={important}
            className="h-11 px-3 rounded-xl flex items-center gap-1.5 text-[13px] font-semibold cursor-pointer"
            style={toggleStyle(important, "var(--color-important)")}>
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
            style={toggleStyle(!!photo, "var(--color-accent-ink)")}>
            {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : uploading ? "…" : <IconCamera size={20} />}
          </button>
          <span className="flex-1" />
          <button type="submit" disabled={!input.trim() || translating} aria-label={t(lang, "add")}
            className="w-11 h-11 rounded-full flex items-center justify-center text-on-accent cursor-pointer disabled:opacity-40 shrink-0"
            style={{ background: "var(--color-accent)" }}>
            {translating ? <span className="text-xs font-bold animate-pulse">…</span> : <IconPlus size={22} strokeWidth={2.6} />}
          </button>
        </div>}
      </form>
    </div>
  );
}
