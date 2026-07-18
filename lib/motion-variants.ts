import type { Variants } from "framer-motion";

/** Stagger container for card grids and list items — 40ms between items, 50ms initial delay. */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

/** Fade-up spring for individual list items — y:12, 200ms. */
export const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 20, duration: 0.2 },
  },
};

/** Dialog/sheet overlay fade. */
export const dialogOverlay: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

/** Dialog/sheet content spring — scale 0.95 → 1, y:8 → 0. */
export const dialogContent: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 8 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 20, duration: 0.3 },
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};
