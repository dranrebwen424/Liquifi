"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterDropdown } from "@/components/treasurer/FilterDropdown";
import { dialogOverlay, sheetSlideUp } from "@/lib/motion-variants";

export type ExpenseFiltersState = {
  type: string;
  sort: string;
  budget: string;
  category: string;
};

type Category = {
  name: string;
};

type Props = {
  filters: ExpenseFiltersState;
  onChange: (filters: ExpenseFiltersState) => void;
  categories: Category[];
};

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "receipt", label: "With Receipt" },
  { value: "manual", label: "Manual" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "amount_high", label: "Amount: High to Low" },
  { value: "amount_low", label: "Amount: Low to High" },
];

const BUDGET_OPTIONS = [
  { value: "all", label: "All Budgets" },
  { value: "0-100", label: "₱0 – ₱100" },
  { value: "100-500", label: "₱100 – ₱500" },
  { value: "500-1000", label: "₱500 – ₱1,000" },
  { value: "1000+", label: "₱1,000+" },
];

const DEFAULT_FILTERS: ExpenseFiltersState = {
  type: "all",
  sort: "newest",
  budget: "all",
  category: "all",
};

/** Desktop inline filter chips — hidden on mobile */
export function ExpenseFilterChips({ filters, onChange, categories }: Props) {
  const categoryOptions = [
    { value: "all", label: "All Categories" },
    ...categories.map((c) => ({ value: c.name, label: c.name })),
  ];

  const update = (key: keyof ExpenseFiltersState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="hidden items-center gap-2 md:flex">
      <FilterDropdown
        label="Type"
        options={TYPE_OPTIONS}
        value={filters.type}
        onChange={(v) => update("type", v)}
      />
      <FilterDropdown
        label="Sort"
        options={SORT_OPTIONS}
        value={filters.sort}
        onChange={(v) => update("sort", v)}
      />
      <FilterDropdown
        label="Budget"
        options={BUDGET_OPTIONS}
        value={filters.budget}
        onChange={(v) => update("budget", v)}
      />
      <FilterDropdown
        label="Category"
        options={categoryOptions}
        value={filters.category}
        onChange={(v) => update("category", v)}
      />
    </div>
  );
}

/** Mobile filter icon button — hidden on desktop */
export function ExpenseFilterIcon({ filters, onChange, categories }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const isAnyActive =
    filters.type !== "all" ||
    filters.sort !== "newest" ||
    filters.budget !== "all" ||
    filters.category !== "all";

  const categoryOptions = [
    { value: "all", label: "All Categories" },
    ...categories.map((c) => ({ value: c.name, label: c.name })),
  ];

  const update = (key: keyof ExpenseFiltersState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <>
      <button
        onClick={() => setSheetOpen(true)}
        className={cn(
          "flex md:hidden items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
          isAnyActive
            ? "border-accent bg-accent-muted text-accent"
            : "border-border bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary",
        )}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span>Filter</span>
      </button>

      {/* Filter sheet */}
      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filters={filters}
        onChange={onChange}
        categories={categories}
      />
    </>
  );
}

function FilterSheet({
  open,
  onClose,
  filters,
  onChange,
  categories,
}: Props & { open: boolean; onClose: () => void }) {
  const categoryOptions = [
    { value: "all", label: "All Categories" },
    ...categories.map((c) => ({ value: c.name, label: c.name })),
  ];

  const update = (key: keyof ExpenseFiltersState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            variants={dialogOverlay}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="fixed inset-0 z-50 bg-overlay-alpha"
            onClick={onClose}
          />
          <motion.div
            variants={sheetSlideUp}
            initial="hidden"
            animate="show"
            exit="exit"
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-border bg-surface p-6 pb-8 shadow-card"
          >
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border-strong" />
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-semibold text-text-primary">Filters</h3>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-full text-text-muted hover:bg-surface-secondary hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <p className="mb-1.5 text-xs font-medium text-text-muted">Type</p>
                <FilterDropdown label="Type" options={TYPE_OPTIONS} value={filters.type} onChange={(v) => update("type", v)} className="w-full" />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-text-muted">Sort</p>
                <FilterDropdown label="Sort" options={SORT_OPTIONS} value={filters.sort} onChange={(v) => update("sort", v)} className="w-full" />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-text-muted">Budget</p>
                <FilterDropdown label="Budget" options={BUDGET_OPTIONS} value={filters.budget} onChange={(v) => update("budget", v)} className="w-full" />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-text-muted">Category</p>
                <FilterDropdown label="Category" options={categoryOptions} value={filters.category} onChange={(v) => update("category", v)} className="w-full" />
              </div>
            </div>
            <button
              onClick={() => onChange(DEFAULT_FILTERS)}
              className="mt-6 w-full rounded-xl border border-border py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
            >
              Reset Filters
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
