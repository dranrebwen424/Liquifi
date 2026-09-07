"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

/**
 * React + CSS mount entrance — replaces framer-motion on event/home/expenses
 * entrances. Fades in + rises 16px with a 0.7s easeOutQuint curve
 * (cubic-bezier(0.22,1,0.36,1)). Delay is in milliseconds.
 * Reduced motion: renders static content, no hidden state.
 */
export function useFadeIn(delayMs = 0): CSSProperties {
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    if (mq.matches) return;
    const id = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(id);
  }, [delayMs]);

  if (reduced) return {};

  return {
    opacity: visible ? 1 : 0,
    // `none` once visible: releases the fixed-position containing block so any
    // <fixed> modal rendered inside keeps viewport positioning (a lingering
    // `translateY(0)` traps fixed dialogs — e.g. View Report popup).
    ...(visible ? { transform: "none" } : { transform: "translateY(16px)" }),
    transition:
      "opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)",
  };
}

type FadeInProps = {
  children: ReactNode;
  className?: string;
  /** Entrance delay in milliseconds (sample cadence: ~100–150ms per section). */
  delay?: number;
};

export function FadeIn({ children, className, delay = 0 }: FadeInProps) {
  return (
    <div className={className} style={useFadeIn(delay)}>
      {children}
    </div>
  );
}