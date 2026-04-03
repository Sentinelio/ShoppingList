import { useEffect, type ReactNode } from "react";
import { useSwipe } from "../../hooks/useSwipe";

interface SwipeRowProps {
  onEdit?: () => void;
  onDelete?: () => void;
  children: ReactNode;
}

export default function SwipeRow({ onEdit, onDelete, children }: SwipeRowProps) {
  const { ref, style, onTouchStart, onTouchMove, onTouchEnd, revealed, close } =
    useSwipe<HTMLDivElement>();

  // Close when tapping outside
  useEffect(() => {
    if (!revealed) return;

    const handler = (e: TouchEvent | MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        close();
      }
    };

    document.addEventListener("touchstart", handler, { passive: true });
    document.addEventListener("mousedown", handler);
    return () => {
      document.removeEventListener("touchstart", handler);
      document.removeEventListener("mousedown", handler);
    };
  }, [revealed, close, ref]);

  return (
    <div className="relative overflow-hidden">
      {/* Action buttons behind content */}
      <div className="absolute inset-y-0 right-0 flex">
        {onEdit && (
          <button
            onClick={() => {
              close();
              onEdit();
            }}
            className="w-15 flex items-center justify-center bg-blue-500 text-white text-sm font-medium"
          >
            Edit
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => {
              close();
              onDelete();
            }}
            className="w-15 flex items-center justify-center bg-danger text-white text-sm font-medium"
          >
            Delete
          </button>
        )}
      </div>

      {/* Swipeable content */}
      <div
        ref={ref}
        style={style}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="relative z-10 bg-card"
      >
        {children}
      </div>
    </div>
  );
}
