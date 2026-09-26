"use client";

import { useEffect, useRef, useState } from "react";
import { isAtScrollBoundary, resolveTopBarScroll } from "@/lib/top-bar-scroll";

/** Per-frame scroll delta (px) treated as a fling rather than a gesture. */
const FAST_SCROLL_DELTA = 24;

export function useAutoHideTopBar(): boolean {
  const [visible, setVisible] = useState(true);
  const anchorY = useRef(0);

  useEffect(() => {
    anchorY.current = window.scrollY;
    let frame = 0;

    const onScroll = () => {
      if (frame) return;

      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        const moved = y - anchorY.current;
        // Fast fling: keep the anchor moving but never flip the bar mid-gesture,
        // otherwise the 200ms transform restarts every few frames and reads as
        // vibration. ponytail: per-frame delta, so the cutoff is lower on
        // 120Hz panels; switch to px/ms if a high-refresh device still buzzes.
        if (Math.abs(moved) >= FAST_SCROLL_DELTA) {
          anchorY.current = y;
          return;
        }
        const next = resolveTopBarScroll(anchorY.current, y);
        anchorY.current = next.anchorY;
        if (next.visible === null) return;
        // At either boundary the movement is the browser's, not the user's —
        // elastic spring-back and clamp compensation both look like an upward
        // scroll. Freeze here so the bar cannot flicker in sympathy.
        if (
          isAtScrollBoundary(
            y,
            window.innerHeight,
            document.documentElement.scrollHeight,
          )
        ) {
          return;
        }
        setVisible(next.visible);
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return visible;
}
