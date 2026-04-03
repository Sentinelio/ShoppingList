import { useState, useRef, useEffect, type ReactNode } from "react";
import { t } from "../../data/i18n";

interface SwipeRowProps {
  children: ReactNode;
  onDelete?: () => void;
  onEdit?: () => void;
  id?: string;
  lang?: string;
}

export default function SwipeRow({ children, onDelete, onEdit, id, lang = "en" }: SwipeRowProps) {
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const locked = useRef<"h" | "v" | null>(null);
  const maxSwipe = onEdit ? -160 : -80;
  const snapThresh = onEdit ? -90 : -50;

  useEffect(() => { setOffset(0); setConfirmDel(false); }, [id]);

  const onStart = (x: number, y: number) => {
    startX.current = x;
    startY.current = y;
    locked.current = null;
    setSwiping(true);
  };
  const onMove = (x: number, y: number) => {
    if (!swiping) return;
    const dx = x - startX.current;
    const dy = y - startY.current;
    if (!locked.current && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      locked.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    }
    if (locked.current === "h") setOffset(Math.min(0, Math.max(maxSwipe, dx)));
  };
  const onEnd = () => {
    setSwiping(false);
    locked.current = null;
    if (offset < snapThresh) setOffset(maxSwipe);
    else { setOffset(0); setConfirmDel(false); }
  };

  const isOpen = offset < 0;

  return (
    <div className="relative overflow-hidden rounded-xl mb-2.5">
      {isOpen && (
        <div className="absolute right-0 top-0 bottom-0 flex" style={{ width: -maxSwipe, borderRadius: "0 14px 14px 0" }}>
          {onEdit && (
            <div
              onClick={() => { onEdit(); setOffset(0); }}
              className="w-20 flex items-center justify-center cursor-pointer"
              style={{ background: "#3a7bd5" }}
            >
              <span className="text-white text-lg">✏️</span>
            </div>
          )}
          <div
            onClick={() => {
              if (confirmDel) { onDelete?.(); setOffset(0); setConfirmDel(false); }
              else setConfirmDel(true);
            }}
            className="w-20 flex items-center justify-center flex-col gap-0.5 cursor-pointer"
            style={{ background: confirmDel ? "#b71c1c" : "#e53935", borderRadius: onEdit ? "0 14px 14px 0" : "0 14px 14px 0" }}
          >
            <span className="text-white" style={{ fontSize: confirmDel ? 14 : 22 }}>
              {confirmDel ? "✓" : "🗑️"}
            </span>
            {confirmDel && (
              <span className="text-white text-[9px] font-bold">{t(lang, "confirm")}</span>
            )}
          </div>
        </div>
      )}
      <div
        onTouchStart={e => onStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={e => onMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={onEnd}
        className="relative z-10 bg-bg select-none rounded-xl"
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? "none" : "transform 0.25s ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}
