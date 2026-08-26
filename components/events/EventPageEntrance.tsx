"use client";

import { motion } from "framer-motion";

/**
 * Wraps event page content with a subtle entrance animation.
 * Fades in + slides up 12px over 400ms on mount.
 */
export function EventPageEntrance({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}
