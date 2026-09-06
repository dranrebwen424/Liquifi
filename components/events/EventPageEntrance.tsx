"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Wraps event page content with a subtle entrance animation.
 * Fades in + slides up 8px with a short tween on mount.
 */
export function EventPageEntrance({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
