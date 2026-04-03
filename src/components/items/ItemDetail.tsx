import { useState, useEffect } from "react";
import type { Item } from "../../lib/supabase";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import ProductIcon from "../ui/ProductIcon";
import { getLangFlag } from "../../data/langs";
import { t, type Lang } from "../../data/i18n";

interface ItemDetailProps {
  item: Item | null;
  open: boolean;
  onClose: () => void;
  userLang: string;
  shelfLang: string;
  onUpdate: (itemId: string, updates: Partial<Pick<Item, "qty" | "unit" | "note">>) => void;
  onDelete: (itemId: string) => void;
  onShowStore: (item: Item) => void;
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

export default function ItemDetail({
  item,
  open,
  onClose,
  userLang,
  shelfLang: _shelfLang,
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

  const translationEntries = Object.entries(item.translations).filter(
    ([, value]) => value && value.trim() !== ""
  );

  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-5">
        {/* Header: emoji + name */}
        <div className="flex items-center gap-3">
          <ProductIcon name={item.original} category={item.category} />
          <div>
            <h3 className="text-xl font-semibold text-text">{displayName}</h3>
            {item.added_by_name && (
              <p className="text-xs text-text-muted">
                {item.added_by_name}
              </p>
            )}
          </div>
        </div>

        {/* Editable fields */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-text-muted mb-1 block">{t(lang, "items.qty")}</label>
            <input
              type="text"
              inputMode="decimal"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              onBlur={handleSave}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted outline-none focus:border-accent"
              placeholder="1"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-text-muted mb-1 block">{t(lang, "items.unit")}</label>
            <select
              value={unit}
              onChange={(e) => {
                setUnit(e.target.value);
                // Save on next tick after state update
                setTimeout(() => onUpdate(item.id, { qty, unit: e.target.value, note }), 0);
              }}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent appearance-none"
            >
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-text-muted mb-1 block">{t(lang, "items.note")}</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={handleSave}
            rows={2}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted outline-none focus:border-accent resize-none"
            placeholder={t(lang, "items.note")}
          />
        </div>

        {/* Translations */}
        {translationEntries.length > 0 && (
          <div>
            <p className="text-xs text-text-muted mb-2 uppercase tracking-wide">Translations</p>
            <div className="space-y-1.5">
              {translationEntries.map(([langCode, value]) => (
                <div key={langCode} className="flex items-center gap-2">
                  <span className="text-sm shrink-0" style={{ width: "24px", textAlign: "center" }}>
                    {getLangFlag(langCode) || langCode}
                  </span>
                  <span className="text-sm text-text">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Show in store */}
        <Button
          variant="primary"
          className="w-full"
          onClick={() => {
            onClose();
            onShowStore(item);
          }}
        >
          {t(lang, "store.show")}
        </Button>

        {/* Delete */}
        <Button
          variant="danger"
          className="w-full"
          onClick={handleDelete}
        >
          {deleteStep === 0 ? t(lang, "items.delete") : t(lang, "common.confirm") + "?"}
        </Button>
      </div>
    </Modal>
  );
}
