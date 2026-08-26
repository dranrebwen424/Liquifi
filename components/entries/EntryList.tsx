"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { EntryCard } from "@/components/entries/EntryCard";
import { EntryRow } from "@/components/entries/EntryRow";
import { EntryDetailModal } from "@/components/entries/EntryDetailModal";
import { VoidEntryModal } from "@/components/entries/VoidEntryModal";
import { entryTitle } from "@/components/entries/entry-title";
import { ViewToggle } from "@/components/events/ViewToggle";
import { ExpenseFilterChips, ExpenseFilterIcon, type ExpenseFiltersState } from "@/components/entries/ExpenseFilters";
import type { EntryType, EntryStatus } from "@/types";
import { staggerContainer, fadeUpItem } from "@/lib/motion-variants";

export type EntryListItem = {
  id: string;
  type: EntryType;
  status: EntryStatus;
  amount: number;
  description?: string | null;
  supplierName?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  category?: string | null;
  issueDate?: string | null;
  issueTime?: string | null;
  imageUrl?: string | null;
  itemBreakdown?: unknown;
  formPayload?: unknown;
  rejectionReason?: string | null;
  resubmissionExplanation?: string | null;
  createdAt?: string;
  voidReason?: string | null;
  voidedBy?: string | null;
  voidedAt?: string | null;
  voidedByName?: string | null;
};

type EntryListProps = {
  entries: EntryListItem[];
  isArchived: boolean;
  canMutate: boolean;
  /** Figma mobile layout — shows "Expenses" heading + count + filter icons. */
  mobileLayout?: boolean;
  filters?: {
    state: ExpenseFiltersState;
    onChange: (filters: ExpenseFiltersState) => void;
    categories: { name: string }[];
  };
};

type ViewMode = "grid" | "list";

export function EntryList({ entries, isArchived, canMutate, mobileLayout, filters }: EntryListProps) {
  const [view, setView] = useState<ViewMode>("grid");
  const [selectedEntry, setSelectedEntry] = useState<EntryListItem | null>(null);
  const [voidTarget, setVoidTarget] = useState<EntryListItem | null>(null);

  return (
    <div>
      {/* Header — mobile Figma layout */}
      {mobileLayout ? (
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-[20px] font-medium text-text-primary">
              Expenses
            </h2>
            <p className="mt-0.5 text-[11px] text-text-muted">
              Total of {entries.length} {entries.length === 1 ? "Entry" : "Entries"}
            </p>
          </div>

          {/* Filter + View Toggle icons */}
          <div className="flex items-center gap-2">
            {filters && (
              <ExpenseFilterIcon
                filters={filters.state}
                onChange={filters.onChange}
                categories={filters.categories}
              />
            )}
            <ViewToggle value={view} onChange={setView} />
          </div>
        </div>
      ) : (
        /* Header — desktop layout (unchanged) */
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold text-text-primary">
            EXPENSES ({entries.length})
          </h2>

          {/* Desktop: filter chips inline next to title */}
          {filters && (
            <ExpenseFilterChips
              filters={filters.state}
              onChange={filters.onChange}
              categories={filters.categories}
            />
          )}

          {/* Right side: mobile filter icon + view toggle */}
          <div className="ml-auto flex items-center gap-2">
            {filters && (
              <ExpenseFilterIcon
                filters={filters.state}
                onChange={filters.onChange}
                categories={filters.categories}
              />
            )}
            <ViewToggle value={view} onChange={setView} />
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        /* Empty state */
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
      ) : view === "grid" ? (
        /* Card grid */
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4 lg:gap-6 xl:grid-cols-5"
        >
          {entries.map((entry) => (
            <motion.div key={entry.id} variants={fadeUpItem}>
              <EntryCard
                {...entry}
                onClick={() => setSelectedEntry(entry)}
              />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        /* List view */
        <div>
          {/* Column headers — hidden on mobile */}
          <div className="hidden md:grid items-center gap-4 border-b border-border px-4 py-2 [grid-template-columns:minmax(0,2.5fr)_1fr_1fr_0.8fr_7rem]">
            <span className="text-xs font-medium text-text-muted">Name</span>
            <span className="text-xs font-medium text-text-muted">Date</span>
            <span className="text-xs font-medium text-text-muted">Category</span>
            <span className="text-right text-xs font-medium text-text-muted">Amount</span>
            <span className="text-xs font-medium text-text-muted">Status</span>
          </div>

          {/* Rows */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="divide-y divide-border"
          >
            {entries.map((entry) => (
              <motion.div key={entry.id} variants={fadeUpItem}>
                <EntryRow
                  {...entry}
                  onClick={() => setSelectedEntry(entry)}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Entry detail modal */}
      {selectedEntry && (
        <EntryDetailModal
          open={!!selectedEntry}
          onClose={() => setSelectedEntry(null)}
          entry={selectedEntry}
          canMutate={canMutate}
          onVoid={() => setVoidTarget(selectedEntry)}
        />
      )}

      {/* Void confirmation modal */}
      <VoidEntryModal
        open={!!voidTarget}
        entry={
          voidTarget
            ? {
                id: voidTarget.id,
                amount: voidTarget.amount,
                label: entryTitle({
                  supplierName: voidTarget.supplierName,
                  description: voidTarget.description,
                  category: voidTarget.category,
                  formPayload: voidTarget.formPayload,
                  itemBreakdown: voidTarget.itemBreakdown,
                }),
              }
            : null
        }
        onClose={() => setVoidTarget(null)}
        onSuccess={() => setSelectedEntry(null)}
      />
    </div>
  );
}
