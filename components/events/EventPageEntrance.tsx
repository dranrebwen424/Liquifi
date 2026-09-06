"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Wraps event page content with a subtle entrance animation.
 * Fades in + slides up 8px with a soft spring on mount.
 */
export function EventPageEntrance({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 88, damping: 24, mass: 0.8 }}
    >
      {children}
    </motion.div>
  );
}
