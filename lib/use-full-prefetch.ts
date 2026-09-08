"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Visibility-gated full route prefetch.
 *
 * Next.js blocks navigation while a prefetch is in flight, and on touch
 * devices the intent-only pattern (prefetch on pointerenter/touchstart)
 * starts the full fetch too close to the tap to ever finish — the click
 * then waits behind it. Warming on mount when the element is (nearly)
 * visible guarantees the tap hits the client router cache instead.
 *
 * Hidden duplicate trees (mobile/desktop variants) never intersect, so
 * only the truly visible route is prefetched.
 */
export function useFullPrefetch<T extends HTMLElement>(rootMargin = "200px") {
  const ref = useRef<T>(null);
  const [prefetch, setPrefetch] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setPrefetch(true);
          io.disconnect();
        }
      },
      { rootMargin }, // warm a screen ahead while scrolling
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return { ref, prefetch };
}