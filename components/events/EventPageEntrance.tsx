"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Wraps event page content with a subtle entrance animation.
 * Fades in + slides up with a short tween on mount.
 */
type EventPageEntranceProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

export function EventPageEntrance({
  children,
  className,
  delay = 0,
}: EventPageEntranceProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
