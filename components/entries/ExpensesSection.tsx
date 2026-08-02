"use client";

import { useMemo, useState } from "react";
import { EntryList, type EntryListItem } from "@/components/entries/EntryList";
import type { ExpenseFiltersState } from "@/components/entries/ExpenseFilters";
import type { EntryType, EntryStatus } from "@/types";

type Entry = {
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
  createdAt?: string;
  voidReason?: string | null;
  voidedBy?: string | null;
  voidedAt?: string | null;
};

type Props = {
  entries: Entry[];
  categories: { name: string }[];
  isArchived: boolean;
};

const DEFAULT_FILTERS: ExpenseFiltersState = {
  type: "all",
  sort: "newest",
  budget: "all",
  category: "all",
};

export function ExpensesSection({ entries, categories, isArchived }: Props) {
  const [filters, setFilters] = useState<ExpenseFiltersState>(DEFAULT_FILTERS);

  const filtered = useMemo(() => {
    let result = [...entries];

    // Type filter
    if (filters.type !== "all") {
      result = result.filter((e) => e.type === filters.type);
    }

    // Budget range filter
    if (filters.budget !== "all") {
      result = result.filter((e) => {
        switch (filters.budget) {
          case "0-100": return e.amount <= 100;
          case "100-500": return e.amount > 100 && e.amount <= 500;
          case "500-1000": return e.amount > 500 && e.amount <= 1000;
          case "1000+": return e.amount > 1000;
          default: return true;
        }
      });
    }

    // Category filter
    if (filters.category !== "all") {
      result = result.filter((e) => e.documentType === filters.category);
    }

    // Sort
    switch (filters.sort) {
      case "oldest":
        result.sort((a, b) => a.id.localeCompare(b.id));
        break;
      case "amount_high":
        result.sort((a, b) => b.amount - a.amount);
        break;
      case "amount_low":
        result.sort((a, b) => a.amount - b.amount);
        break;
      case "newest":
      default:
        result.sort((a, b) => b.id.localeCompare(a.id));
        break;
    }

    return result;
  }, [entries, filters]);

  return (
    <EntryList
      entries={filtered as EntryListItem[]}
      isArchived={isArchived}
      filters={{
        state: filters,
        onChange: setFilters,
        categories,
      }}
    />
  );
}
