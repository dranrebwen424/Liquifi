"use client";

import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterDropdown } from "@/components/treasurer/FilterDropdown";

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

/** Mobile filter icon button — icon-only pill, opens a popover (hidden on desktop) */
export function ExpenseFilterIcon({ filters, onChange, categories }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isAnyActive =
    filters.type !== "all" ||
    filters.sort !== "newest" ||
    filters.budget !== "all" ||
    filters.category !== "all";

  return (
    <div className="relative md:hidden" ref={ref}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center rounded-lg border px-2 py-1.5 transition-colors",
          isAnyActive
            ? "border-accent bg-accent-muted text-accent"
            : "border-border bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary",
        )}
      >
        <SlidersHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <FilterPopover filters={filters} onChange={onChange} categories={categories} />
      )}
    </div>
  );
}

function FilterPopover({ filters, onChange, categories }: Props) {
  const categoryOptions = [
    { value: "all", label: "All Categories" },
    ...categories.map((c) => ({ value: c.name, label: c.name })),
  ];

  const update = (key: keyof ExpenseFiltersState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="absolute right-0 top-full z-30 mt-1.5 w-64 rounded-lg border border-border-strong bg-surface p-4 shadow-card">
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
        className="mt-4 w-full rounded-xl border border-border py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
      >
        Reset Filters
      </button>
    </div>
  );
}
