import { useState, useRef, type FormEvent, type KeyboardEvent } from "react";
import { parseQty } from "../../lib/qtyParser";
import { translateProduct } from "../../lib/translate";
import { addItem } from "../../hooks/useItems";
import { t } from "../../data/i18n";
import type { Item } from "../../lib/supabase";
import { getEnabledLangs } from "../../lib/langConfig";

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
  ) => void; // TODO: wire up duplicate modal in ListDetailPage
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
  onDuplicateFound: _onDuplicateFound,
}: AddItemBarProps) {
  const lang = userLang;

  const [input, setInput] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [note, setNote] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [photoUrlInput, setPhotoUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetLangs = [...new Set([userLang, shelfLang, "en", ...getEnabledLangs()])];

  const reset = () => {
    setInput("");
    setQty("");
    setUnit("");
    setNote("");
    setPhoto(null);
    setExpanded(false);
    setShowPhotoMenu(false);
    setShowUrlInput(false);
    setPhotoUrlInput("");
  };

  const resizeImage = (file: File, maxSize = 300): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let w = img.width, h = img.height;
          if (w > h) { if (w > maxSize) { h = h * maxSize / w; w = maxSize; } }
          else { if (h > maxSize) { w = w * maxSize / h; h = maxSize; } }
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePasteImage = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find(t => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], "paste.jpg", { type: imageType });
          const b64 = await resizeImage(file);
          setPhoto(b64);
          setShowPhotoMenu(false);
          return;
        }
      }
    } catch { /* clipboard API not available or no image */ }
    setShowPhotoMenu(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      const b64 = await resizeImage(f);
      setPhoto(b64);
    }
    e.target.value = "";
    setShowPhotoMenu(false);
  };

  const handleUrlImage = async () => {
    const url = photoUrlInput.trim();
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], "url.jpg", { type: blob.type });
      const b64 = await resizeImage(file);
      setPhoto(b64);
      setShowUrlInput(false);
      setPhotoUrlInput("");
      setShowPhotoMenu(false);
    } catch {
      // CORS or network error — try using the URL directly
      setPhoto(url);
      setShowUrlInput(false);
      setPhotoUrlInput("");
      setShowPhotoMenu(false);
    }
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
      const result = await translateProduct(parsed.text, targetLangs, userLang);

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
          {/* Photo preview */}
          {photo && (
            <div className="px-4 pt-2 flex items-center gap-2">
              <img src={photo} className="w-12 h-12 rounded-lg object-cover border border-border-light" />
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="text-[10px] text-text-muted cursor-pointer active:text-danger"
              >
                ✕ Remove
              </button>
            </div>
          )}
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

            {/* Photo button + menu */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                  photo ? "bg-accent/20 border-accent/30" : "bg-bg border-border text-text-soft active:bg-card"
                }`}
                aria-label="Add photo"
              >
                <span style={{ fontSize: 16 }}>{photo ? "✅" : "📷"}</span>
              </button>

              {/* Backdrop to close menu */}
              {showPhotoMenu && (
                <div className="fixed inset-0 z-30" onClick={() => { setShowPhotoMenu(false); setShowUrlInput(false); }} />
              )}

              {/* Photo dropdown menu */}
              {showPhotoMenu && (
                <div className="absolute bottom-11 right-0 w-52 bg-card border border-border-light rounded-xl shadow-lg z-40 overflow-hidden">
                  {/* Paste from clipboard */}
                  <button
                    type="button"
                    onClick={handlePasteImage}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-text hover:bg-bg active:bg-bg transition-colors cursor-pointer text-left"
                  >
                    <span>📋</span> Paste image
                  </button>

                  {/* Upload from device */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-text hover:bg-bg active:bg-bg transition-colors cursor-pointer text-left border-t border-border"
                  >
                    <span>📁</span> Upload from device
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />

                  {/* URL input */}
                  {!showUrlInput ? (
                    <button
                      type="button"
                      onClick={() => setShowUrlInput(true)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-text hover:bg-bg active:bg-bg transition-colors cursor-pointer text-left border-t border-border"
                    >
                      <span>🔗</span> Paste URL
                    </button>
                  ) : (
                    <div className="px-3 py-2.5 border-t border-border">
                      <div className="flex gap-1.5">
                        <input
                          type="url"
                          value={photoUrlInput}
                          onChange={e => setPhotoUrlInput(e.target.value)}
                          placeholder="https://..."
                          autoFocus
                          onKeyDown={e => { if (e.key === "Enter") handleUrlImage(); if (e.key === "Escape") { setShowUrlInput(false); setPhotoUrlInput(""); } }}
                          className="flex-1 bg-bg border border-border-light rounded-lg px-2 py-1.5 text-xs text-text outline-none focus:border-accent min-w-0"
                        />
                        <button
                          type="button"
                          onClick={handleUrlImage}
                          className="px-2 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer"
                          style={{ background: "linear-gradient(135deg, #f09848, #e07028)" }}
                        >
                          OK
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Remove photo (if one is set) */}
                  {photo && (
                    <button
                      type="button"
                      onClick={() => { setPhoto(null); setShowPhotoMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-bg active:bg-bg transition-colors cursor-pointer text-left border-t border-border"
                      style={{ color: "#ff5c5c" }}
                    >
                      <span>🗑️</span> Remove photo
                    </button>
                  )}
                </div>
              )}
            </div>
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
