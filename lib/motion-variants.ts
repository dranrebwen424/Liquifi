import type { Variants } from "framer-motion";

/** Stagger container for card grids and list items — visible, but not sluggish. */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.04, delayChildren: 0.03 },
  },
};

/** Smooth stagger fade in for individual list items — fixed tween, no spring tail. */
export const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
  },
};

/** Dialog/sheet overlay fade. */
export const dialogOverlay: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

/** Dialog content — popup scale with slight overshoot spring. */
export const dialogContent: Variants = {
  hidden: { opacity: 0, scale: 0.88 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 20 },
  },
  exit: { opacity: 0, scale: 0.92, transition: { duration: 0.12 } },
};

