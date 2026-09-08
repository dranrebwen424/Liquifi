"use client";

import Link from "next/link";
import { motion, MotionConfig } from "framer-motion";
import type { Transition, Variants } from "framer-motion";
import { FileText } from "lucide-react";
import { formatPHP } from "@/lib/format";

type EventCardProps = {
  id: string;
  name: string;
  status: "open" | "archived";
  budgetTotal: number;
  totalSpent: number;
  numEntries: number;
  createdByName: string;
  /** Override the default treasurer link (e.g. adviser/admin read-only views). */
  href?: string;
};

const MotionLink = motion.create(Link);

const cardHover: Transition = { duration: 0.2, ease: "easeOut" };

// Matches Figma "folder 2" hover: folder shifts left, paper sheet slides
// down-left and widens.
const folderVariants: Variants = {
  rest: { x: 0 },
  hover: { x: -4 },
};

const paperVariants: Variants = {
  rest: { x: 0, y: 0, width: "100%" },
  hover: { x: -6, y: 8, width: "103%" },
};

function budgetColor(pct: number) {
  if (pct >= 100) return "bg-error";
  if (pct >= 70) return "bg-warning";
  return "bg-success";
}

// Mobile-only color signal — the progress bar (desktop's color cue) is hidden on phones.
function pctTextColor(pct: number) {
  if (pct >= 100) return "text-error sm:text-text-muted";
  if (pct >= 70) return "text-warning sm:text-text-muted";
  return "text-success sm:text-text-muted";
}

export function EventCard({ id, name, status, budgetTotal, totalSpent, numEntries, createdByName, href }: EventCardProps) {
  const pct = budgetTotal > 0 ? Math.min((totalSpent / budgetTotal) * 100, 100) : 0;
  const budgetLabel = `${formatPHP(totalSpent)} of ${formatPHP(budgetTotal)}`;

  return (
    <MotionConfig reducedMotion="user">
      <MotionLink
        href={href ?? `/treasurer/events/${id}`}
        initial="rest"
        whileHover="hover"
        className="flex w-full flex-col gap-3"
      >
        {/* ── Folder visual (Figma "folder 2") ─────────────── */}
        <div className="relative aspect-[412/312] w-full">
          {/* Folder silhouette — tabbed, gray */}
          <motion.svg
            variants={folderVariants}
            transition={cardHover}
            className="absolute left-0 top-0 w-full text-neutral drop-shadow-md"
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

          {/* Paper sheet — slides out on hover, holds all card info */}
          <motion.div
            variants={paperVariants}
            transition={cardHover}
            className="absolute left-0 top-[14%] flex h-[82%] w-full flex-col gap-1 sm:gap-1.5 rounded-xl bg-surface-secondary p-3 sm:p-4"
          >
            {/* Name */}
            <h3 className="text-sm font-semibold leading-4 text-text-primary line-clamp-2 shrink-0 sm:line-clamp-1 sm:leading-snug">
              {name}
            </h3>

            {/* Budget */}
            <div>
              <div className="flex items-baseline justify-between">
                <p className="min-w-0 truncate text-[11px] text-text-muted" title={budgetLabel}>
                  {budgetLabel}
                </p>
                {pct > 0 && (
                  <span className={`shrink-0 pl-2 text-[11px] font-medium ${pctTextColor(pct)}`}>
                    {Math.round(pct)}%
                  </span>
                )}
              </div>
              <div className="mt-1 hidden h-1.5 w-full overflow-hidden rounded-full bg-border-light sm:block">
                <div
                  className={`h-full rounded-full transition-all ${budgetColor(pct)}`}
                  style={{ width: `${Math.max(pct, 1)}%` }}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="mt-auto flex items-center justify-between gap-2 text-[11px] text-text-muted">
              <span className="hidden min-w-0 truncate sm:block">{createdByName}</span>
              <span className="ml-auto flex shrink-0 items-center gap-1">
                <FileText className="h-3 w-3" />
                {numEntries} {numEntries === 1 ? "entry" : "entries"}
              </span>
            </div>
          </motion.div>
        </div>
      </MotionLink>
    </MotionConfig>
  );
}
