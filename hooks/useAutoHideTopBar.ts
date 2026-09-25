"use client";

import { useEffect, useRef, useState } from "react";
import { resolveTopBarScroll } from "@/lib/top-bar-scroll";

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
        const next = resolveTopBarScroll(anchorY.current, y);
        anchorY.current = next.anchorY;
        if (next.visible === null) return;
        // At the document end, overscroll bounce jitters scrollY past the 8px
        // threshold and flip-flops the bar right where scrolling stops.
        if (y + window.innerHeight >= document.documentElement.scrollHeight - 1) return;
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
