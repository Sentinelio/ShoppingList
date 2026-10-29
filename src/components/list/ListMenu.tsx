import { useEffect, useState } from "react";
import { t } from "../../data/i18n";
import { IconCheck } from "../ui/icons";

interface ListMenuProps {
  open: boolean;
  onClose: () => void;
  lang: string;
  sortByCategory: boolean;
  onToggleSort: () => void;
  boughtCount: number;
  onClearBought: () => void;
  /** Personal archive (only hides the list for me). */
  onArchive?: () => void;
  onSettings: () => void;
}

// 3.9 — ⋮ menu anchored under the top bar.
export default function ListMenu({ open, onClose, lang, sortByCategory, onToggleSort, boughtCount, onClearBought, onArchive, onSettings }: ListMenuProps) {
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmClear(false);
      return;
    }
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;
  const item = "w-full min-h-[48px] flex items-center gap-3 px-4 text-left text-[15px] cursor-pointer active:bg-white/5 disabled:opacity-40 disabled:cursor-default";
  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        role="menu"
        className="absolute right-2 w-64 rounded-[14px] bg-card border border-border-light shadow-2xl overflow-hidden divide-y divide-border"
        style={{ top: "calc(env(safe-area-inset-top) + 52px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button role="menuitemcheckbox" aria-checked={sortByCategory} className={item} onClick={() => { onToggleSort(); onClose(); }}>
          <span className="flex-1 text-text">{t(lang, "sortByCategory")}</span>
          {sortByCategory && <IconCheck size={18} className="text-accent" />}
        </button>
        <button role="menuitem" className={item} disabled={boughtCount === 0}
          style={{ color: confirmClear ? "#fff" : "#ff6b6b", background: confirmClear ? "#b71c1c" : undefined }}
          onClick={() => {
            if (!confirmClear) { setConfirmClear(true); return; }
            onClearBought();
            onClose();
          }}>
          <span className="flex-1 font-semibold">
            {confirmClear ? t(lang, "confirmClearBought").replace("{n}", String(boughtCount)) : t(lang, "clearBought")}
          </span>
          {!confirmClear && boughtCount > 0 && <span className="text-[13px] opacity-70">{boughtCount}</span>}
        </button>
        {onArchive && (
          <button role="menuitem" className={item} onClick={() => { onArchive(); onClose(); }}>
            <span className="flex-1 text-text">{t(lang, "archiveList")}</span>
          </button>
        )}
        <button role="menuitem" className={item} onClick={() => { onSettings(); onClose(); }}>
          <span className="flex-1 text-text">{t(lang, "listSettings")}</span>
        </button>
      </div>
    </div>
  );
}
