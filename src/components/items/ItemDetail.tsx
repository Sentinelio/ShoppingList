import { useState, useEffect } from "react";
import type { Item } from "../../lib/supabase";
import Modal from "../ui/Modal";
import ProductIcon from "../ui/ProductIcon";
import { getLangFlag, getLangName } from "../../data/langs";
import { t } from "../../data/i18n";
import { getLabSelection } from "../../lib/itemDetailLab";

interface ItemDetailProps {
  item: Item | null;
  open: boolean;
  onClose: () => void;
  userLang: string;
  shelfLang: string;
  countryFlag?: string;
  onUpdate: (itemId: string, updates: Partial<Pick<Item, "qty" | "unit" | "note" | "photo" | "important">>) => void;
  onDelete: (itemId: string) => void;
  onShowStore: (item: Item) => void;
  lang?: string;
}

function PhotoSection({ photo, onUpdate, lang }: { photo: string | null; onUpdate: (photo: string | null) => void; lang: string }) {
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
          🔗 {t(lang, "addPhotoUrl")}
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

  // Sync local state when a different item is opened. Depending on `item.id`
  // (not the full `item` object) avoids wiping local edits on every realtime
  // update of the same row.
  useEffect(() => {
    if (item) {
      setQty(item.qty || "");
      setUnit(item.unit || "");
      setNote(item.note || "");
      setDeleteStep(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const editVariant = getLabSelection().edit;

  // ── Shared UI blocks used by all variants ────────────────────────────────

  const headerBlock = (
    <div className="flex items-center gap-3">
      <ProductIcon name={item.original} size={52} />
      <div className="min-w-0 flex-1">
        <h3 className="font-bold text-text truncate" style={{ fontSize: 20 }}>{displayName}</h3>
        {item.added_by_name && (
          <p className="text-text-muted truncate" style={{ fontSize: 12 }}>{t(lang, "addedBy")} {item.added_by_name}</p>
        )}
      </div>
    </div>
  );

  const photoBlock = (
    <PhotoSection photo={item.photo} onUpdate={(photo) => onUpdate(item.id, { photo })} lang={lang} />
  );

  const qtyInput = (
    <input type="number" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} onBlur={handleSave}
      placeholder="1" className="bg-bg border border-border rounded-lg px-2 py-2 text-sm text-text placeholder:text-text-muted outline-none focus:border-accent" style={{ width: 60 }} />
  );

  const unitSelect = (
    <select value={unit} onChange={(e) => { setUnit(e.target.value); setTimeout(() => onUpdate(item.id, { qty, unit: e.target.value, note }), 0); }}
      className="bg-bg border border-border rounded-lg px-2 py-2 text-sm text-text outline-none focus:border-accent appearance-none" style={{ width: 70 }}>
      {UNITS.map((u) => (<option key={u.value} value={u.value}>{u.label}</option>))}
    </select>
  );

  const noteInput = (
    <input type="text" value={note} onChange={(e) => setNote(e.target.value)} onBlur={handleSave}
      placeholder={t(lang, "notePlaceholder")} className="w-full bg-bg border border-border rounded-lg px-2 py-2 text-sm text-text placeholder:text-text-muted outline-none focus:border-accent" />
  );

  const shelfCard = showShelf ? (
    <div className="rounded-xl p-3 flex items-center gap-3"
      style={{ backgroundColor: "rgba(232, 195, 100, 0.12)", border: "1px solid rgba(232, 195, 100, 0.25)" }}>
      <span style={{ fontSize: 24 }}>{countryFlag || getLangFlag(shelfLang) || ""}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-text truncate" style={{ fontSize: 15 }}>{shelfName}</p>
        <p className="text-text-muted" style={{ fontSize: 11 }}>{getLangName(shelfLang)} &middot; {t(lang, "yourCountry")}</p>
      </div>
    </div>
  ) : null;

  const importantBtn = (
    <button type="button" onClick={() => onUpdate(item.id, { important: !item.important })}
      className="w-full h-11 rounded-xl font-medium flex items-center justify-center gap-2 transition-all cursor-pointer border"
      style={{
        background: item.important ? "rgba(255, 92, 92, 0.15)" : "var(--color-bg)",
        borderColor: item.important ? "rgba(255, 92, 92, 0.4)" : "var(--color-border-light)",
        color: item.important ? "#ff5c5c" : "var(--color-text-soft)",
      }}>
      <span>{item.important ? "🔴" : "⚪"}</span>
      <span style={{ fontSize: 14 }}>{item.important ? t(lang, "important") : t(lang, "markImportant")}</span>
    </button>
  );

  const showStoreBtn = (
    <button type="button" onClick={() => { onClose(); onShowStore(item); }}
      className="w-full h-11 rounded-xl text-white font-medium flex items-center justify-center gap-2 active:brightness-90 transition-all cursor-pointer"
      style={{ background: "linear-gradient(135deg, #f0883e, #e8c364)" }}>
      <span>📱</span> {t(lang, "showInStore")}
    </button>
  );

  const deleteBtn = (
    <button type="button" onClick={handleDelete}
      className="w-full h-11 rounded-xl font-medium flex items-center justify-center gap-2 active:brightness-90 transition-all cursor-pointer"
      style={{
        backgroundColor: deleteStep === 0 ? "rgba(248, 113, 113, 0.15)" : "rgba(248, 113, 113, 0.3)",
        color: "#f87171", border: "1px solid rgba(248, 113, 113, 0.25)",
      }}>
      {deleteStep === 0 ? t(lang, "remove") : `⚠️ ${t(lang, "confirm")}?`}
    </button>
  );

  // ── Variant layouts ──────────────────────────────────────────────────────

  const renderVariant = () => {
    switch (editVariant) {
      // v1: Classic Form — labels + inputs stacked (DEFAULT / current layout)
      case 0:
      default:
        return (
          <div className="space-y-4">
            {headerBlock}
            {photoBlock}
            <div className="flex gap-2 items-end">
              <div><label className="text-text-muted block mb-1" style={{ fontSize: 11 }}>{t(lang, "qty")}</label>{qtyInput}</div>
              <div>{unitSelect}</div>
              <div className="flex-1 min-w-0">{noteInput}</div>
            </div>
            {shelfCard}
            {importantBtn}
            {showStoreBtn}
            {deleteBtn}
          </div>
        );

      // v2: Stepper Buttons — big +/- for qty, centered emoji
      case 1:
        return (
          <div className="flex flex-col items-center gap-3 text-center">
            <ProductIcon name={item.original} size={64} />
            <div className="text-lg font-bold">{displayName}</div>
            {showShelf && <div style={{ fontSize: 13, color: "var(--color-shelf, #e8c364)", fontWeight: 600 }}>{shelfName}</div>}
            <div className="flex items-center gap-4 my-2">
              <button type="button" onClick={() => { const n = Math.max(0, Number(qty) - 1); setQty(String(n)); onUpdate(item.id, { qty: String(n), unit, note }); }}
                className="w-11 h-11 rounded-full bg-card border-2 border-border-light text-text-soft text-xl cursor-pointer flex items-center justify-center">−</button>
              <div className="text-center">
                <span className="text-4xl font-black text-accent">{qty || "0"}</span>
                <div className="text-text-muted text-xs mt-0.5">{UNITS.find(u => u.value === unit)?.label || "—"}</div>
              </div>
              <button type="button" onClick={() => { const n = Number(qty) + 1; setQty(String(n)); onUpdate(item.id, { qty: String(n), unit, note }); }}
                className="w-11 h-11 rounded-full text-white text-xl cursor-pointer flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #f09848, #e07028)" }}>+</button>
            </div>
            <div className="flex gap-1.5 flex-wrap justify-center">
              {UNITS.filter(u => u.value).map(u => (
                <button key={u.value} type="button"
                  onClick={() => { setUnit(u.value); onUpdate(item.id, { qty, unit: u.value, note }); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                  style={{
                    background: unit === u.value ? "rgba(240,136,62,0.12)" : "var(--color-card)",
                    color: unit === u.value ? "var(--color-accent)" : "var(--color-text-muted)",
                    border: `1px solid ${unit === u.value ? "rgba(240,136,62,0.3)" : "var(--color-border)"}`,
                  }}>{u.label}</button>
              ))}
            </div>
            <div className="w-full">{noteInput}</div>
            {photoBlock}
            {importantBtn}
            {showStoreBtn}
            {deleteBtn}
          </div>
        );

      // v3: All-in-one Row — compact, everything in few rows
      case 2:
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border">
              <ProductIcon name={item.original} size={40} />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-text truncate">{displayName}</div>
                {showShelf && <div style={{ fontSize: 11, color: "var(--color-shelf)", fontWeight: 600 }}>{shelfName}</div>}
              </div>
            </div>
            <div className="flex gap-1.5">{qtyInput}{unitSelect}<div className="flex-1 min-w-0">{noteInput}</div></div>
            <div className="flex gap-1.5">
              {importantBtn}
              <button type="button" onClick={() => { /* photo toggle */ }}
                className="flex-1 h-11 rounded-xl font-medium flex items-center justify-center gap-2 cursor-pointer border border-border-light bg-card text-text-soft" style={{ fontSize: 12 }}>
                📷 Foto
              </button>
            </div>
            {photoBlock}
            {showStoreBtn}
            {deleteBtn}
          </div>
        );

      // v4: Minimal Fields — no labels, just placeholders, ultra clean
      case 3:
        return (
          <div className="flex flex-col items-center gap-3 text-center">
            <ProductIcon name={item.original} size={56} />
            {showShelf && <div className="text-lg font-bold" style={{ color: "var(--color-shelf)" }}>{shelfName}</div>}
            <div className="flex gap-1.5 w-full mt-2">{qtyInput}{unitSelect}<div className="flex-1 min-w-0">{noteInput}</div></div>
            <div className="flex gap-1.5 w-full">
              {importantBtn}
            </div>
            {photoBlock}
            {showStoreBtn}
            {deleteBtn}
          </div>
        );

      // v5: Quick Presets — preset qty buttons + custom
      case 4: {
        const presets = unit === "L" ? ["1L","2L","3L","500ml"] : unit === "kg" ? ["100g","250g","500g","1kg"] : ["1×","2×","3×","6×"];
        return (
          <div className="space-y-3">
            <div className="text-center">
              <ProductIcon name={item.original} size={40} />
              <span className="text-lg font-bold ml-2 align-middle">{displayName}</span>
            </div>
            <div className="text-text-muted text-xs font-bold uppercase tracking-wider">Cantidad rapida</div>
            <div className="grid grid-cols-4 gap-1.5">
              {presets.map(p => {
                const match = p === `${qty}${unit}` || p === `${qty}×`;
                return (
                  <button key={p} type="button"
                    onClick={() => {
                      const num = p.replace(/[^0-9.]/g, "");
                      const u = p.replace(/[0-9.]/g, "");
                      setQty(num);
                      const mapped = u === "×" ? "x" : u;
                      setUnit(mapped);
                      onUpdate(item.id, { qty: num, unit: mapped, note });
                    }}
                    className="py-2.5 rounded-lg text-xs font-semibold cursor-pointer text-center"
                    style={{
                      background: match ? "rgba(240,136,62,0.12)" : "var(--color-card)",
                      color: match ? "var(--color-accent)" : "var(--color-text-muted)",
                      border: `1px solid ${match ? "var(--color-accent)" : "var(--color-border)"}`,
                    }}>{p}</button>
                );
              })}
            </div>
            <div className="w-full">{noteInput}</div>
            {photoBlock}
            {shelfCard}
            {importantBtn}
            {showStoreBtn}
            {deleteBtn}
          </div>
        );
      }
    }
  };

  return (
    <Modal open={open} onClose={onClose} themed>
      {renderVariant()}
    </Modal>
  );
}
