import { useState, useEffect } from "react";
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
  const [editing, setEditing] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const saveUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    onUpdate(url);
    setUrlInput("");
    setEditing(false);
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    } else {
      onUpdate(null);
      setConfirmDelete(false);
    }
  };

  // Fullscreen photo viewer
  if (fullscreen && photo) {
    return (
      <div
        className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
        onClick={() => setFullscreen(false)}
      >
        <button
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center text-lg cursor-pointer z-10"
          onClick={() => setFullscreen(false)}
        >✕</button>
        <img
          src={photo}
          className="max-w-full max-h-full object-contain"
          style={{ touchAction: "pinch-zoom" }}
          alt=""
        />
      </div>
    );
  }

  if (photo) {
    return (
      <div className="relative">
        <img
          src={photo}
          className="w-full rounded-xl object-cover border border-border-light cursor-pointer active:opacity-90"
          style={{ maxHeight: 200 }}
          alt=""
          onClick={() => setFullscreen(true)}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <div className="absolute top-2 right-2 flex gap-1.5">
          <button
            onClick={() => { setEditing(true); setUrlInput(photo); }}
            className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center text-sm cursor-pointer active:bg-black/80"
          >✏️</button>
          <button
            onClick={handleDelete}
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm cursor-pointer active:bg-black/80"
            style={{ background: confirmDelete ? "#b71c1c" : "rgba(0,0,0,0.6)", color: "white" }}
          >{confirmDelete ? "⚠️" : "✕"}</button>
        </div>
        {editing && (
          <div className="mt-2 flex gap-2">
            <input
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              placeholder="https://..."
              autoFocus
              onKeyDown={e => { if (e.key === "Enter") saveUrl(); if (e.key === "Escape") setEditing(false); }}
              className="flex-1 bg-bg border border-border-light rounded-xl px-3 py-2 text-sm text-text outline-none focus:border-accent min-w-0"
            />
            <button onClick={saveUrl} className="px-3 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer" style={{ background: "linear-gradient(135deg, #f09848, #e07028)" }}>OK</button>
            <button onClick={() => setEditing(false)} className="px-3 py-2 rounded-xl text-sm text-text-muted cursor-pointer border border-border-light">✕</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {!editing ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-bg border border-border-light text-text-soft active:bg-card transition-colors cursor-pointer text-sm"
        >
          🔗 Add photo URL
        </button>
      ) : (
        <div className="flex gap-2">
          <input
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="https://example.com/image.jpg"
            autoFocus
            onKeyDown={e => { if (e.key === "Enter") saveUrl(); if (e.key === "Escape") { setEditing(false); setUrlInput(""); } }}
            className="flex-1 bg-bg border border-border-light rounded-xl px-3 py-2.5 text-sm text-text outline-none focus:border-accent min-w-0"
          />
          <button
            onClick={saveUrl}
            disabled={!urlInput.trim()}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #f09848, #e07028)" }}
          >OK</button>
          <button onClick={() => { setEditing(false); setUrlInput(""); }} className="px-3 py-2.5 rounded-xl text-sm text-text-muted cursor-pointer border border-border-light">✕</button>
        </div>
      )}
    </div>
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
