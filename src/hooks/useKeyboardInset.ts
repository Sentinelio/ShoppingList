import { useEffect, useState } from "react";

// Height of the on-screen keyboard (px) covering the bottom of the layout
// viewport. iOS Safari doesn't shrink the layout viewport when the keyboard
// opens, so `position: fixed; bottom: 0` ends up hidden behind it; adding
// this inset as `bottom` keeps a bottom sheet glued to the top of the
// keyboard. 0 when there's no keyboard or no visualViewport support.
export function useKeyboardInset(active = true): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!active || !vv) {
      setInset(0);
      return;
    }
    const update = () => {
      const covered = window.innerHeight - (vv.height + vv.offsetTop);
      // Ignore sub-pixel noise and the iOS toolbar wobble.
      setInset(covered > 40 ? Math.round(covered) : 0);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [active]);

  return inset;
}
