import { useState, useEffect, useRef } from "react";
import type { Item } from "../../lib/supabase";
import Modal from "../ui/Modal";
import ProductIcon from "../ui/ProductIcon";
import { getLangFlag, getLangName } from "../../data/langs";
import { t } from "../../data/i18n";

interface ItemDetailProps {
  item: Item | null;
  open: boolean;
  onClose: () => void;
  userLang: string;
  shelfLang: string;
  countryFlag?: string;
  onUpdate: (itemId: string, updates: Partial<Pick<Item, "qty" | "unit" | "note" | "photo">>) => void;
  onDelete: (itemId: string) => void;
  onShowStore: (item: Item) => void;
  lang?: string;
}

function PhotoSection({ photo, onUpdate }: { photo: string | null; onUpdate: (photo: string | null) => void }) {
  const [showMenu, setShowMenu] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [showUrl, setShowUrl] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const resize = (file: File, max = 250): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement("canvas");
          let w = img.width, h = img.height;
          if (w > h) { if (w > max) { h = h * max / w; w = max; } }
          else { if (h > max) { w = w * max / h; h = max; } }
          c.width = w; c.height = h;
          c.getContext("2d")!.drawImage(img, 0, 0, w, h);
          // Try WebP first (smaller), fallback to JPEG
          let result = c.toDataURL("image/webp", 0.6);
          if (!result.startsWith("data:image/webp")) {
            result = c.toDataURL("image/jpeg", 0.5);
          }
          resolve(result);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { onUpdate(await resize(f)); }
    e.target.value = "";
    setShowMenu(false);
  };

  const handlePaste = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const t = item.types.find(t => t.startsWith("image/"));
        if (t) { const b = await item.getType(t); onUpdate(await resize(new File([b], "p.jpg", { type: t }))); setShowMenu(false); return; }
      }
    } catch { /* fallback below */ }
    // Fallback: paste area
    const div = document.createElement("div");
    div.contentEditable = "true";
    div.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;width:200px;height:80px;background:#161b24;border:2px dashed #f0883e;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#8b92a8;font-size:13px;outline:none;";
    div.textContent = "Tap & Paste here";
    div.addEventListener("paste", async (ev: Event) => {
      const ce = ev as ClipboardEvent; ce.preventDefault();
      const f = ce.clipboardData?.files?.[0];
      if (f?.type.startsWith("image/")) onUpdate(await resize(f));
      div.remove(); setShowMenu(false);
    });
    document.body.appendChild(div); div.focus();
    setTimeout(() => div.remove(), 10000);
  };

  if (photo) {
    return (
      <div className="relative">
        <img src={photo} className="w-full rounded-xl object-cover border border-border-light" style={{ maxHeight: 200 }} alt="" />
        <div className="absolute top-2 right-2 flex gap-1">
          <button onClick={() => setShowMenu(true)} className="w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center text-xs cursor-pointer">✏️</button>
          <button onClick={() => onUpdate(null)} className="w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center text-xs cursor-pointer">✕</button>
        </div>
        {showMenu && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => { setShowMenu(false); setShowUrl(false); }}>
            <div className="bg-card w-full max-w-[460px] rounded-t-2xl border-t border-border-light" onClick={e => e.stopPropagation()}>
              <div className="w-10 h-1 bg-border-light rounded-full mx-auto mt-3 mb-1" />
              <button onClick={handlePaste} className="w-full flex items-center gap-3 px-5 py-3 text-sm text-text active:bg-bg cursor-pointer">📋 Paste image</button>
              <button onClick={() => { fileRef.current?.click(); }} className="w-full flex items-center gap-3 px-5 py-3 text-sm text-text active:bg-bg cursor-pointer border-t border-border">📁 Upload from device</button>
              {!showUrl ? (
                <button onClick={() => setShowUrl(true)} className="w-full flex items-center gap-3 px-5 py-3 text-sm text-text active:bg-bg cursor-pointer border-t border-border">🔗 Paste URL</button>
              ) : (
                <div className="px-5 py-3 border-t border-border flex gap-2">
                  <input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://..." autoFocus onKeyDown={e => { if (e.key === "Enter" && urlInput.trim()) { onUpdate(urlInput.trim()); setShowMenu(false); setShowUrl(false); setUrlInput(""); }}} className="flex-1 bg-bg border border-border-light rounded-xl px-3 py-2 text-sm text-text outline-none focus:border-accent min-w-0" />
                  <button onClick={() => { if (urlInput.trim()) { onUpdate(urlInput.trim()); setShowMenu(false); setShowUrl(false); setUrlInput(""); }}} className="px-3 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer" style={{ background: "linear-gradient(135deg, #f09848, #e07028)" }}>OK</button>
                </div>
              )}
              <button onClick={() => { onUpdate(null); setShowMenu(false); }} className="w-full flex items-center gap-3 px-5 py-3 text-sm active:bg-bg cursor-pointer border-t border-border" style={{ color: "#ff5c5c" }}>🗑️ Remove photo</button>
              <button onClick={() => { setShowMenu(false); setShowUrl(false); }} className="w-full py-3 text-sm text-text-muted font-medium active:bg-bg cursor-pointer border-t border-border" style={{ paddingBottom: "max(0.875rem, env(safe-area-inset-bottom))" }}>Cancel</button>
            </div>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowMenu(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-bg border border-border-light text-text-soft active:bg-card transition-colors cursor-pointer"
        style={{ fontSize: 14 }}
      >
        📷 Add photo
      </button>
      {showMenu && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => { setShowMenu(false); setShowUrl(false); }}>
          <div className="bg-card w-full max-w-[460px] rounded-t-2xl border-t border-border-light" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-border-light rounded-full mx-auto mt-3 mb-1" />
            <button onClick={handlePaste} className="w-full flex items-center gap-3 px-5 py-3 text-sm text-text active:bg-bg cursor-pointer">📋 Paste image</button>
            <button onClick={() => { fileRef.current?.click(); }} className="w-full flex items-center gap-3 px-5 py-3 text-sm text-text active:bg-bg cursor-pointer border-t border-border">📁 Upload from device</button>
            {!showUrl ? (
              <button onClick={() => setShowUrl(true)} className="w-full flex items-center gap-3 px-5 py-3 text-sm text-text active:bg-bg cursor-pointer border-t border-border">🔗 Paste URL</button>
            ) : (
              <div className="px-5 py-3 border-t border-border flex gap-2">
                <input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://..." autoFocus onKeyDown={e => { if (e.key === "Enter" && urlInput.trim()) { onUpdate(urlInput.trim()); setShowMenu(false); setShowUrl(false); setUrlInput(""); }}} className="flex-1 bg-bg border border-border-light rounded-xl px-3 py-2 text-sm text-text outline-none focus:border-accent min-w-0" />
                <button onClick={() => { if (urlInput.trim()) { onUpdate(urlInput.trim()); setShowMenu(false); setShowUrl(false); setUrlInput(""); }}} className="px-3 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer" style={{ background: "linear-gradient(135deg, #f09848, #e07028)" }}>OK</button>
              </div>
            )}
            <button onClick={() => { setShowMenu(false); setShowUrl(false); }} className="w-full py-3 text-sm text-text-muted font-medium active:bg-bg cursor-pointer border-t border-border" style={{ paddingBottom: "max(0.875rem, env(safe-area-inset-bottom))" }}>Cancel</button>
          </div>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </>
  );
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

export default function ItemDetail({
  item,
  open,
  onClose,
  userLang,
  shelfLang,
  countryFlag,
  onUpdate,
  onDelete,
  onShowStore,
}: ItemDetailProps) {
  const lang = userLang;

  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [note, setNote] = useState("");
  const [deleteStep, setDeleteStep] = useState<0 | 1>(0);

  // Sync local state when item changes
  useEffect(() => {
    if (item) {
      setQty(item.qty || "");
      setUnit(item.unit || "");
      setNote(item.note || "");
      setDeleteStep(0);
    }
  }, [item?.id, open]);

  if (!item) return null;

  const displayName = item.translations[userLang] || item.original;
  const shelfName = item.translations[shelfLang] || item.original;
  const showShelf = shelfLang !== userLang && shelfName.toLowerCase() !== displayName.toLowerCase();

  const handleSave = () => {
    onUpdate(item.id, { qty, unit, note });
  };

  const handleDelete = () => {
    if (deleteStep === 0) {
      setDeleteStep(1);
    } else {
      onDelete(item.id);
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-4">
        {/* Header: icon + name + added by */}
        <div className="flex items-center gap-3">
          <ProductIcon name={item.original} size={52} />
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-text truncate" style={{ fontSize: 20 }}>
              {displayName}
            </h3>
            {item.added_by_name && (
              <p className="text-text-muted truncate" style={{ fontSize: 12 }}>
                {t(lang, "addedBy")} {item.added_by_name}
              </p>
            )}
          </div>
        </div>

        {/* Photo section */}
        <PhotoSection
          photo={item.photo}
          onUpdate={(photo) => onUpdate(item.id, { photo })}
        />

        {/* Fields row: qty + unit + note */}
        <div className="flex gap-2 items-end">
          <div>
            <label className="text-text-muted block mb-1" style={{ fontSize: 11 }}>
              {t(lang, "qty")}
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              onBlur={handleSave}
              placeholder="1"
              className="bg-bg border border-border rounded-lg px-2 py-2 text-sm text-text placeholder:text-text-muted outline-none focus:border-accent"
              style={{ width: 60 }}
            />
          </div>
          <div>
            <select
              value={unit}
              onChange={(e) => {
                setUnit(e.target.value);
                setTimeout(() => onUpdate(item.id, { qty, unit: e.target.value, note }), 0);
              }}
              className="bg-bg border border-border rounded-lg px-2 py-2 text-sm text-text outline-none focus:border-accent appearance-none"
              style={{ width: 70 }}
            >
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={handleSave}
              placeholder={t(lang, "notePlaceholder")}
              className="w-full bg-bg border border-border rounded-lg px-2 py-2 text-sm text-text placeholder:text-text-muted outline-none focus:border-accent"
            />
          </div>
        </div>

        {/* Shelf translation card */}
        {showShelf && (
          <div
            className="rounded-xl p-3 flex items-center gap-3"
            style={{
              backgroundColor: "rgba(232, 195, 100, 0.12)",
              border: "1px solid rgba(232, 195, 100, 0.25)",
            }}
          >
            <span style={{ fontSize: 24 }}>
              {countryFlag || getLangFlag(shelfLang) || ""}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-text truncate" style={{ fontSize: 15 }}>
                {shelfName}
              </p>
              <p className="text-text-muted" style={{ fontSize: 11 }}>
                {getLangName(shelfLang)} &middot; {t(lang, "yourCountry")}
              </p>
            </div>
          </div>
        )}

        {/* Show in store button */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onShowStore(item);
          }}
          className="w-full h-11 rounded-xl text-white font-medium flex items-center justify-center gap-2 active:brightness-90 transition-all cursor-pointer"
          style={{ background: "linear-gradient(135deg, #f0883e, #e8c364)" }}
        >
          <span>{"\uD83D\uDCF1"}</span>
          {t(lang, "showInStore")}
        </button>

        {/* Delete button (2-step confirm) */}
        <button
          type="button"
          onClick={handleDelete}
          className="w-full h-11 rounded-xl font-medium flex items-center justify-center gap-2 active:brightness-90 transition-all cursor-pointer"
          style={{
            backgroundColor: deleteStep === 0 ? "rgba(248, 113, 113, 0.15)" : "rgba(248, 113, 113, 0.3)",
            color: "#f87171",
            border: "1px solid rgba(248, 113, 113, 0.25)",
          }}
        >
          {deleteStep === 0 ? t(lang, "remove") : `\u26A0\uFE0F ${t(lang, "confirm")}?`}
        </button>
      </div>
    </Modal>
  );
}
