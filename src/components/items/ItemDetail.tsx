import { useState, useEffect } from "react";
import type { Item } from "../../lib/supabase";
import Modal from "../ui/Modal";
import ProductIcon from "../ui/ProductIcon";
import { getLangFlag, getLangName } from "../../data/langs";
import { t, type Lang } from "../../data/i18n";

interface ItemDetailProps {
  item: Item | null;
  open: boolean;
  onClose: () => void;
  userLang: string;
  shelfLang: string;
  countryFlag?: string;
  onUpdate: (itemId: string, updates: Partial<Pick<Item, "qty" | "unit" | "note">>) => void;
  onDelete: (itemId: string) => void;
  onShowStore: (item: Item) => void;
  lang?: string;
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
  const lang = (userLang === "en" || userLang === "es" || userLang === "pl" ? userLang : "en") as Lang;

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

        {/* Photo section placeholder */}
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-bg border border-border-light text-text-soft active:bg-card transition-colors cursor-pointer"
          style={{ fontSize: 14 }}
        >
          <span>{"\uD83D\uDCF7"}</span>
          <span>Add photo</span>
        </button>

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
