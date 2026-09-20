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
        const next = resolveTopBarScroll(anchorY.current, window.scrollY);
        anchorY.current = next.anchorY;
        if (next.visible !== null) setVisible(next.visible);
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
