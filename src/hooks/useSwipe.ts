import { useRef, useState, useCallback, type CSSProperties } from "react";

const SWIPE_THRESHOLD = 80;

interface SwipeReturn<T extends HTMLElement = HTMLElement> {
  ref: React.RefObject<T | null>;
  style: CSSProperties;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  revealed: boolean;
  close: () => void;
}

export function useSwipe<T extends HTMLElement = HTMLDivElement>(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
): SwipeReturn<T> {
  const ref = useRef<T | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const startX = useRef(0);
  const startY = useRef(0);
  const swiping = useRef(false);

  const close = useCallback(() => {
    setOffsetX(0);
    setRevealed(false);
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    swiping.current = false;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const dx = touch.clientX - startX.current;
    const dy = touch.clientY - startY.current;

    // Only start tracking horizontal swipe if horizontal movement exceeds vertical
    if (!swiping.current) {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
        swiping.current = true;
      } else {
        return;
      }
    }

    setOffsetX(dx);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!swiping.current) {
      setOffsetX(0);
      return;
    }

    if (offsetX < -SWIPE_THRESHOLD) {
      setRevealed(true);
      setOffsetX(-SWIPE_THRESHOLD);
      onSwipeLeft?.();
    } else if (offsetX > SWIPE_THRESHOLD) {
      setRevealed(true);
      setOffsetX(SWIPE_THRESHOLD);
      onSwipeRight?.();
    } else {
      setOffsetX(0);
      setRevealed(false);
    }

    swiping.current = false;
  }, [offsetX, onSwipeLeft, onSwipeRight]);

  const style: CSSProperties = {
    transform: `translateX(${offsetX}px)`,
    transition: swiping.current ? "none" : "transform 0.2s ease-out",
    willChange: "transform",
  };

  return { ref, style, onTouchStart, onTouchMove, onTouchEnd, revealed, close };
}
