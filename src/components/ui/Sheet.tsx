import { useEffect, type ReactNode } from "react";
import { IconClose } from "./icons";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  closeLabel: string;
  children: ReactNode;
}

// Bottom sheet: rounded top, glued to the bottom, scrolls when tall.
export default function Sheet({ open, onClose, title, closeLabel, children }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="absolute left-0 right-0 bottom-0 mx-auto max-w-[520px] bg-card rounded-t-[20px] border-t border-border-light flex flex-col"
        style={{ maxHeight: "92dvh", paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <div className="shrink-0 h-12 flex items-center pl-4 pr-1.5">
          <h2 className="flex-1 text-[17px] font-bold text-text truncate">{title}</h2>
          <button type="button" onClick={onClose} aria-label={closeLabel}
            className="w-11 h-11 rounded-full flex items-center justify-center text-text-soft cursor-pointer active:bg-white/5">
            <IconClose size={20} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-1">{children}</div>
      </div>
    </div>
  );
}
