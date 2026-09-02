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

const cardHover: Transition = { duration: 0.2, ease: "easeOut" };

const folderVariants: Variants = {
  rest: { x: 0 },
  hover: { x: -4 },
};

/**
 * Mobile-only folder card for the home page active events grid.
 * Shows just the folder silhouette + event name — no budget/progress/entries.
 * Desktop uses the full EventCard instead.
 */
export function FolderCard({ id, name, href }: FolderCardProps) {
  return (
    <MotionConfig reducedMotion="user">
      <MotionLink
        href={href ?? `/treasurer/events/${id}`}
        initial="rest"
        whileHover="hover"
        className="flex w-full flex-col items-stretch gap-1.5"
      >
        {/* Folder visual — Figma "folder 1" */}
        <div className="relative aspect-[353/246] w-full overflow-hidden rounded-xl">
          <motion.svg
            variants={folderVariants}
            transition={cardHover}
            className="absolute left-0 top-0 h-full w-full text-neutral drop-shadow-md"
            viewBox="0 0 404 263"
            fill="none"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M404 245.5C404 255.165 396.165 263 386.5 263H17.5C7.83501 263 0 255.165 0 245.5V74.0001H404V245.5Z"
            />
            <path
              fill="currentColor"
              d="M404 75.1668H0V17.5C0 7.83504 7.83502 0 17.5 0H138.743C142.059 0 145.218 1.41107 147.432 3.88053L165.436 23.9714C167.649 26.4408 170.808 27.8519 174.124 27.8519H386.5C396.165 27.8519 404 35.6869 404 45.3519V75.1668Z"
            />
          </motion.svg>
        </div>

        {/* Event name */}
        <p className="text-center text-[11px] font-medium leading-tight text-text-primary line-clamp-1">
          {name}
        </p>
      </MotionLink>
    </MotionConfig>
  );
}
