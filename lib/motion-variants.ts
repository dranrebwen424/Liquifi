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

/** Bottom sheet — slides up from below, no scale. */
export const sheetSlideUp: Variants = {
  hidden: { y: "100%" },
  show: {
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 30 },
  },
  exit: {
    y: "100%",
    transition: { duration: 0.2, ease: "easeIn" },
  },
};
