"use client";

import { motion } from "framer-motion";
import { EntryRow } from "@/components/entries/EntryRow";
import type { EntryType, EntryStatus } from "@/types";
import { staggerContainer, fadeUpItem } from "@/lib/motion-variants";

type MockEntry = {
  id: string;
  type: EntryType;
  status: EntryStatus;
  amount: number;
  description?: string | null;
  supplierName?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  voidReason?: string | null;
  voidedBy?: string | null;
};

type EntryListProps = {
  entries: MockEntry[];
  isArchived: boolean;
};

export function EntryList({ entries, isArchived }: EntryListProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <svg className="h-10 w-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <p className="text-sm font-medium text-text-primary">No entries yet</p>
        <p className="text-sm text-text-muted">
          {isArchived
            ? "This event is archived."
            : "Log your first expense to get started."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-strong bg-surface">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
        <span className="flex-1 text-xs font-medium uppercase tracking-wide text-text-muted">
          Entry
        </span>
        <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-text-muted">
          Amount
        </span>
        <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-text-muted">
          Status
        </span>
      </div>

      {/* Rows */}
      <motion.div variants={staggerContainer} initial="hidden" animate="show">
        {entries.map((entry) => (
          <motion.div key={entry.id} variants={fadeUpItem}>
            <EntryRow {...entry} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
