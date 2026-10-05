"use client";

import { useEffect, useRef } from "react";

export function useInvalidFieldShake(error: boolean, validationAttempt = 0) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!error || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = ref.current?.animate(
      [0, -4, 4, -3, 3, 0].map((x) => ({ transform: `translateX(${x}px)` })),
      { duration: 250, easing: "ease-out" },
    );
    return () => animation?.cancel();
  }, [error, validationAttempt]);

  return ref;
}
