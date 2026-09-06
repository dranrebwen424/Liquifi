import type { Variants } from "framer-motion";

/** Stagger container for card grids and list items — quick enough to avoid sluggish lists. */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.035, delayChildren: 0.04 },
  },
};

/** Fade-up spring for individual list items — small travel, softer settle. */
export const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 88, damping: 24, mass: 0.8 },
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

/** Bottom sheet — slides up from below, no scale. Tween (not spring) so the
 *  tall sheet animates linearly/consistently instead of rubberbanding. */
export const sheetSlideUp: Variants = {
  hidden: { y: "100%" },
  show: {
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: {
    y: "100%",
    transition: { duration: 0.22, ease: "easeIn" },
  },
};
