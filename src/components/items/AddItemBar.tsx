import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";
import { parseQty } from "../../lib/qtyParser";
import { translateProduct } from "../../lib/translate";
import { addItem } from "../../hooks/useItems";
import { t } from "../../data/i18n";
import { getEnabledLangs } from "../../lib/langConfig";
import { preloadDictionary, suggest, type DictSuggestion } from "../../lib/dictSuggest";
import { getCategoryEmoji, getCategoryColor } from "../../data/categories";
import { matchProductEmoji } from "../../lib/emojiMatcher";

interface AddItemBarProps {
  listId: string;
  userLang: string;
  shelfLang: string;
  userId: string;
  userName: string;
  onItemAdded: (item: import("../../lib/supabase").Item | null) => void;
}

const UNITS = [
  { value: "", label: "\u2014" },
  { value: "x", label: "uds" },
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
  const lang = userLang;

  const [input, setInput] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [note, setNote] = useState("");
  const [brand, setBrand] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [showPhotoInput, setShowPhotoInput] = useState(false);
  const [photoUrlInput, setPhotoUrlInput] = useState("");
  const [important, setImportant] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<DictSuggestion[]>([]);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionReqId = useRef(0);

  const targetLangs = [...new Set([userLang, shelfLang, "en", ...getEnabledLangs()])];

  // Preload the dictionary once the bar mounts so the first suggestion is
  // instant instead of waiting on a network round-trip.
  useEffect(() => {
    preloadDictionary();
  }, []);

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

  const applySuggestion = (s: DictSuggestion) => {
    const display = s.translations[userLang] || s.key;
    setInput(display);
    setSuggestions([]);
    setHighlightedIdx(-1);
    inputRef.current?.focus();
  };

  const reset = () => {
    setInput("");
    setQty("");
    setUnit("");
    setNote("");
    setBrand("");
    setPhoto(null);
    setImportant(false);
    setExpanded(false);
    setShowPhotoInput(false);
    setPhotoUrlInput("");
    setSuggestions([]);
    setHighlightedIdx(-1);
  };

  const savePhotoUrl = () => {
    const url = photoUrlInput.trim();
    if (!url) return;
    setPhoto(url);
    setPhotoUrlInput("");
    setShowPhotoInput(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      if (suggestions.length > 0) {
        setSuggestions([]);
        setHighlightedIdx(-1);
        return;
      }
      reset();
      inputRef.current?.blur();
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || translating) return;

    const parsed = parseQty(trimmed);
    const finalQty = qty || parsed.qty || "";
    const finalUnit = unit || parsed.unit || "";

    setTranslating(true);
    setSubmitError(null);

    // 1. Try to translate — but NEVER block adding the item
    let translations: Record<string, string> = { [userLang]: parsed.text, en: parsed.text };
    let category = "other";
    try {
      // Timeout: if translation takes > 15s, give up and add untranslated
      const translateWithTimeout = Promise.race([
        translateProduct(parsed.text, targetLangs, userLang),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Translation timeout")), 15000),
        ),
      ]);
      const result = await translateWithTimeout;
      translations = result.translations;
      category = result.category;
    } catch (err) {
      console.warn("[AddItem] Translation failed, adding with original text:", err);
      // Continue — add the item without translations
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSubmitError(`No se pudo añadir: ${msg}`);
      console.error("[AddItem] Insert failed:", msg, err);
      setTimeout(() => setSubmitError(null), 5000);
    } finally {
      setTranslating(false);
    }
  };

  return (
    <>
    <div
      className="sticky bottom-0 left-0 right-0 z-30 bg-card border-t border-border-light relative"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      {/* Autocomplete suggestions — anchored above the input */}
      {suggestions.length > 0 && (
        <div
          className="absolute left-0 right-0 bottom-full mb-1 px-3"
          role="listbox"
          aria-label={t(lang, "addProduct")}
        >
          <div className="bg-card rounded-2xl border border-border-light shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
            {suggestions.map((s, i) => {
              const display = s.translations[userLang] || s.key;
              const other = Object.entries(s.translations)
                .filter(([code]) => code !== userLang)
                .slice(0, 3)
                .map(([, v]) => v)
                .join(" · ");
              const emoji = matchProductEmoji(s.key).emoji || getCategoryEmoji(s.category);
              const color = getCategoryColor(s.category);
              const active = i === highlightedIdx;
              return (
                <button
                  key={`${s.key}-${i}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onMouseEnter={() => setHighlightedIdx(i)}
                  onClick={() => applySuggestion(s)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left cursor-pointer border-b border-border last:border-b-0"
                  style={{ background: active ? `${color}1a` : "transparent" }}
                >
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0"
                    style={{ background: `${color}26` }}
                    aria-hidden="true"
                  >
                    {emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-text truncate">{display}</div>
                    {other && (
                      <div className="text-[10px] text-text-muted truncate">{other}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Error banner */}
      {submitError && (
        <div
          style={{
            padding: "8px 14px",
            margin: "8px 12px 0",
            borderRadius: 10,
            background: "rgba(255,92,92,0.1)",
            border: "1px solid rgba(255,92,92,0.25)",
            color: "#ff5c5c",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          ❌ {submitError}
        </div>
      )}

      {/* Main input row */}
      <form onSubmit={handleSubmit} className="flex items-center gap-1.5 pt-2 w-full" style={{ paddingLeft: 12, paddingRight: expanded ? "calc(10% + 18px)" : 12 }}>
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
          className="bg-transparent text-text placeholder:text-text-muted outline-none disabled:opacity-50 min-w-0"
          style={{ fontSize: 15, flex: 45 }}
        />

        {/* When expanded: qty + unit + important */}
        {expanded && (
          <div className="flex gap-1.5 items-center" style={{ flex: 45 }}>
            <input type="number" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)}
              placeholder={t(lang, "qty")}
              className="flex-1 bg-bg border border-border rounded-lg px-1.5 py-1.5 text-sm text-text placeholder:text-text-muted outline-none focus:border-accent min-w-0"
              style={{ textAlign: "center" }} />
            <select value={unit} onChange={(e) => setUnit(e.target.value)}
              className="flex-1 bg-bg border border-border rounded-lg px-1 py-1.5 text-sm text-text outline-none focus:border-accent appearance-none min-w-0">
              {UNITS.map((u) => (<option key={u.value} value={u.value}>{u.label}</option>))}
            </select>
            <button type="button" onClick={() => setImportant(!important)}
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
              style={{
                background: important ? "rgba(255,92,92,0.2)" : "transparent",
                border: important ? "2px solid #ff5c5c" : "1.5px solid rgba(255,255,255,0.10)",
              }}>
              <span style={{ fontSize: important ? 14 : 12 }}>{important ? "‼️" : "❕"}</span>
            </button>
          </div>
        )}

        {/* Add button -- when NOT expanded (inline) */}
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

      {/* Expanded: Row 2 + tall Añadir button on the right spanning both rows */}
      {expanded && (
        <>
          <div className="flex pt-1 pb-1 w-full gap-1.5" style={{ paddingLeft: 12, paddingRight: "calc(10% + 18px)" }}>
            {/* Left: row 2 fields */}
            <div className="flex gap-1.5 items-center" style={{ flex: 90 }}>
              <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)}
                placeholder="Marca"
                className="bg-bg border border-border rounded-lg px-2 py-1.5 text-sm text-text placeholder:text-text-muted outline-none focus:border-accent min-w-0"
                style={{ flex: 45 }} />
              <div className="flex gap-1.5 items-center" style={{ flex: 45 }}>
                <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="Nota"
                  className="bg-bg border border-border rounded-lg px-2 py-1.5 text-sm text-text placeholder:text-text-muted outline-none focus:border-accent min-w-0"
                  style={{ flex: 1 }} />
                <button type="button" onClick={() => setShowPhotoInput(!showPhotoInput)}
                  className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
                  style={{
                    background: photo ? "rgba(240,136,62,0.15)" : "transparent",
                    border: photo ? "1.5px solid rgba(240,136,62,0.3)" : "1.5px solid rgba(255,255,255,0.10)",
                  }}>
                  <span style={{ fontSize: 12 }}>{photo ? "📷" : "🔗"}</span>
                </button>
                <button type="button" onClick={reset}
                  className="shrink-0 w-8 h-8 rounded-lg bg-bg border border-border-light text-text-soft flex items-center justify-center active:brightness-90 cursor-pointer text-xs">
                  ✕
                </button>
              </div>
            </div>
          </div>

          {/* Añadir button: absolutely positioned right, spanning both rows */}
          <div style={{
            position: "absolute", right: 12, top: 0, bottom: 0,
            width: "10%", display: "flex", alignItems: "stretch",
            paddingTop: 8, paddingBottom: 4,
          }}>
            <button type="button" onClick={(e) => handleSubmit(e as unknown as FormEvent)}
              disabled={!input.trim() || translating}
              className="w-full rounded-xl text-white font-semibold text-xs flex items-center justify-center active:brightness-90 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
              style={{ background: "linear-gradient(135deg, #f0883e, #e8c364)", writingMode: "vertical-lr" }}>
              {translating ? "..." : t(lang, "add")}
            </button>
          </div>

          {/* Photo URL (extra row, only when toggled) */}
          {showPhotoInput && (
            <div className="flex gap-1.5 items-center px-3 pb-1" style={{ marginRight: "10%" }}>
              {photo && <img src={photo} className="w-6 h-6 rounded object-cover border border-border-light shrink-0" alt="" />}
              <input value={photoUrlInput} onChange={e => setPhotoUrlInput(e.target.value)}
                placeholder="https://..." autoFocus
                onKeyDown={e => { if (e.key === "Enter") savePhotoUrl(); if (e.key === "Escape") { setShowPhotoInput(false); setPhotoUrlInput(""); } }}
                className="flex-1 bg-bg border border-border-light rounded-lg px-2 py-1 text-xs text-text outline-none focus:border-accent min-w-0" />
              <button type="button" onClick={savePhotoUrl} disabled={!photoUrlInput.trim()}
                className="px-2 py-1 rounded-lg text-xs font-semibold text-white cursor-pointer disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #f09848, #e07028)" }}>OK</button>
            </div>
          )}
        </>
      )}
    </div>

    </>
  );
}
