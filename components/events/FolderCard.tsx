"use client";

import Link from "next/link";
import { motion, MotionConfig } from "framer-motion";
import type { Transition, Variants } from "framer-motion";

type FolderCardProps = {
  id: string;
  name: string;
  /** Override the default treasurer link. */
  href?: string;
};

const MotionLink = motion.create(Link);

/**
 * Press animation from the Figma "folder" component (node 57-32).
 * On press the two light-gray (#D9D9D9) front layers slide down ~22px
 * against the static dark body (#706D6D). 300ms, cubic-bezier(0,0,0.58,1).
 */
const pressTransition: Transition = {
  duration: 0.3,
  ease: [0, 0, 0.58, 1],
};

/** Light-gray layers (top tab + bottom pocket) drop on press. */
const slideDownVariants: Variants = {
  rest: { y: 0 },
  pressed: { y: 22 },
};

/**
 * Mobile-only folder card for the home page active events grid.
 * Figma "folder" (mobile): a static dark-gray rounded body (#706D6D) with
 * two light-gray front layers (#D9D9D9) that slide down on press.
 * Desktop uses the full EventCard instead.
 */
export function FolderCard({ id, name, href }: FolderCardProps) {
  return (
    // prefetch: full event route warmed by Next's viewport-first scheduler.
    <MotionConfig reducedMotion="user">
      <MotionLink
        href={href ?? `/treasurer/events/${id}`}
        prefetch
        initial="rest"
        whileTap="pressed"
        className="flex w-full flex-col items-stretch gap-1"
      >
        {/* Folder visual — Figma "folder" (mobile) */}
        <motion.div
          className="relative aspect-[353/268] w-full overflow-visible"
          style={{ transformOrigin: "50% 100%" }}
          variants={{
            rest: { scale: 1 },
            pressed: { scale: 0.92 },
          }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          <motion.svg
            className="block h-full w-full"
            viewBox="0 0 353 268"
            fill="none"
            aria-hidden="true"
          >
            {/* Dark rounded body — static, never moves. */}
            <path
              d="M0 15C0 6.71574 6.71573 0 15 0H333C341.284 0 348 6.71573 348 15V223C348 231.284 341.284 238 333 238H15C6.71573 238 0 231.284 0 223V15Z"
              fill="#706D6D"
            />
            {/* Light bottom pocket — slides down on press. */}
            <motion.g
              variants={slideDownVariants}
              transition={pressTransition}
            >
              <path
                d="M353 231C353 239.284 346.284 246 338 246H15C6.71573 246 3.8658e-07 239.284 0 231V84H353V231Z"
                fill="#D9D9D9"
              />
            </motion.g>
            {/* Light top tab — slides down on press. */}
            <motion.g
              variants={slideDownVariants}
              transition={pressTransition}
            >
              <path
                d="M353 85H0V27C0 18.7157 6.71573 12 15 12H120.454C123.784 12 126.896 13.6576 128.754 16.4213L144.619 40.0232C146.476 42.7868 149.588 44.4444 152.918 44.4444H338C346.284 44.4444 353 51.1602 353 59.4444V85Z"
                fill="#D9D9D9"
              />
            </motion.g>
          </motion.svg>
        </motion.div>

        {/* Event name */}
        <p className="-mt-0.5 text-center text-[12px] font-semibold leading-tight text-text-primary line-clamp-1">
          {name}
        </p>
      </MotionLink>
    </MotionConfig>
  );
}
