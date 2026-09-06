"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, FileQuestion, X } from "lucide-react";
import { dialogOverlay, dialogContent } from "@/lib/motion-variants";

// Adviser "View Report" pill. With a report → real link to the event's report
// page. Without → muted, non-navigating button that opens a "No report yet"
// popup (the target page would otherwise render a 404).
const pillBase =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[15px] border px-3 py-[7px] text-[11px] font-medium";

type ViewReportPillProps = {
  href: string;
  hasReport: boolean;
};

export function ViewReportPill({ href, hasReport }: ViewReportPillProps) {
  const [open, setOpen] = useState(false);

  if (hasReport) {
    return (
      <Link
        href={href}
        className={`${pillBase} border-text-primary text-text-primary transition-[color,transform,shadow] hover:bg-surface-secondary hover:shadow-sm hover:scale-[1.02] active:scale-[0.98]`}
        title="View report"
      >
        <ArrowUpRight className="h-3 w-3" />
        View Report
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${pillBase} cursor-pointer border-border bg-surface text-text-muted`}
        title="No report yet"
      >
        <ArrowUpRight className="h-3 w-3" />
        View Report
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="viewreport-overlay"
              variants={dialogOverlay}
              initial="hidden"
              animate="show"
              exit="hidden"
              className="fixed inset-0 z-50 bg-overlay-alpha"
              onClick={() => setOpen(false)}
            />
            <motion.div
              key="viewreport-dialog"
              variants={dialogContent}
              initial="hidden"
              animate="show"
              exit="exit"
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="relative w-full max-w-sm rounded-xl border border-border bg-surface p-6 text-center shadow-card">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="absolute right-3 top-3 rounded-full p-1.5 text-text-muted transition-colors hover:bg-surface-secondary hover:text-text-primary"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning-lightest">
                  <FileQuestion className="h-6 w-6 text-warning" />
                </div>
                <h2 className="mt-3 text-lg font-semibold text-text-primary">
                  No report yet
                </h2>
                <p className="mt-1.5 text-sm leading-snug text-text-muted">
                  This event doesn&apos;t have a report yet. It will be
                  available once the treasurer generates the liquidation
                  report.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-5 w-full rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}