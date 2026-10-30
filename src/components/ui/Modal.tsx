import { useEffect, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function Modal({ open, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="p-5 pb-7 w-full max-w-[460px] max-h-[88vh] overflow-auto"
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--color-card)",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          borderTop: "1px solid var(--color-border-light)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
