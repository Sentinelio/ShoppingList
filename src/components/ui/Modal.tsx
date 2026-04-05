import { useEffect, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** When true, the modal inherits the Details view theme tokens. Used for
   *  the item detail sheet so the admin can theme it. */
  themed?: boolean;
}

export default function Modal({ open, onClose, children, themed }: ModalProps) {
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
        style={themed
          ? {
              background: "var(--details-modal-bg, var(--color-card, #151922))",
              borderTopLeftRadius: "var(--details-modal-radius, 16px)",
              borderTopRightRadius: "var(--details-modal-radius, 16px)",
              border: "var(--details-border, 1px solid var(--color-border-light, rgba(255,255,255,0.1)))",
              borderBottom: "none",
            }
          : {
              background: "var(--color-card, #151922)",
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              borderTop: "1px solid var(--color-border-light, rgba(255,255,255,0.1))",
            }}
      >
        {children}
      </div>
    </div>
  );
}
