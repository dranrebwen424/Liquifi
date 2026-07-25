"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Archive, ArrowLeft } from "lucide-react";
import { EventCard } from "@/components/events/EventCard";
import { EventListItem } from "@/components/events/EventListItem";
import { ViewToggle } from "@/components/events/ViewToggle";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterDropdown } from "@/components/treasurer/FilterDropdown";
import { staggerContainer, fadeUpItem } from "@/lib/motion-variants";
import type { EventWithMeta } from "@/lib/queries/events";

type Props = { events: EventWithMeta[] };

const MODIFIED_OPTIONS = [
  { value: "all", label: "All dates" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "this_year", label: "This year" },
  { value: "last_year", label: "Last year" },
];

const BUDGET_OPTIONS = [
  { value: "all", label: "Any budget" },
  { value: "10000", label: "Above ₱10,000" },
  { value: "50000", label: "Above ₱50,000" },
  { value: "100000", label: "Above ₱100,000" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "year", label: "By Year" },
  { value: "a-z", label: "A–Z" },
  { value: "budget-high", label: "Budget High → Low" },
  { value: "budget-low", label: "Budget Low → High" },
];

function groupByYear(events: EventWithMeta[]) {
  const groups: Record<string, EventWithMeta[]> = {};
  for (const e of events) {
    const year = new Date(e.created_at).getFullYear().toString();
    (groups[year] ??= []).push(e);
  }
  return Object.entries(groups).sort((a, b) => Number(b[0]) - Number(a[0]));
}

export function TreasurerHomeClient({ events }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("newest");

  const [typeFilter, setTypeFilter] = useState("all");
  const [treasurerFilter, setTreasurerFilter] = useState("all");
  const [modifiedFilter, setModifiedFilter] = useState("all");
  const [budgetFilter, setBudgetFilter] = useState("all");

  const isSearching = searchParams.get("search") === "1";
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const deferredSearch = useDeferredValue(search);

  // Sync search from URL changes (mobile top bar debounces URL writes)
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    setSearch(q);
  }, [searchParams]);

  const treasurerOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const e of events) {
      if (!seen.has(e.created_by)) seen.set(e.created_by, e.created_by_name);
    }
    return [
      { value: "all", label: "All treasurers" },
      ...[...seen.entries()]
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([, name]) => ({ value: name, label: name })),
    ];
  }, [events]);

  const typeOptions = [
    { value: "all", label: "All events" },
    { value: "open", label: "Open" },
    { value: "archived", label: "Archived" },
  ];

  const filtered = useMemo(() => {
    const result = events.filter((e) => {
      if (deferredSearch && !e.name.toLowerCase().includes(deferredSearch.toLowerCase())) return false;
      if (typeFilter !== "all" && e.status !== typeFilter) return false;
      if (treasurerFilter !== "all" && e.created_by_name !== treasurerFilter) return false;
      if (modifiedFilter !== "all") {
        const created = new Date(e.created_at);
        const now = new Date();
        if (modifiedFilter === "7d" && created < new Date(now.getTime() - 7 * 86400000)) return false;
        if (modifiedFilter === "30d" && created < new Date(now.getTime() - 30 * 86400000)) return false;
        if (modifiedFilter === "this_year" && created.getFullYear() !== now.getFullYear()) return false;
        if (modifiedFilter === "last_year" && created.getFullYear() !== now.getFullYear() - 1) return false;
      }
      if (budgetFilter !== "all" && e.budget_total < Number(budgetFilter)) return false;
      return true;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "a-z":
          return a.name.localeCompare(b.name);
        case "year":
          return new Date(b.created_at).getFullYear() - new Date(a.created_at).getFullYear() ||
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "budget-high":
          return b.budget_total - a.budget_total;
        case "budget-low":
          return a.budget_total - b.budget_total;
        case "newest":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [events, deferredSearch, typeFilter, treasurerFilter, modifiedFilter, budgetFilter, sortBy]);

  const activeEvents = filtered.filter((e) => e.status === "open");
  const archivedEvents = filtered.filter((e) => e.status === "archived");
  const archivedByYear = groupByYear(archivedEvents);

  const hasActiveFilters =
    deferredSearch || typeFilter !== "all" || treasurerFilter !== "all" || modifiedFilter !== "all" || budgetFilter !== "all";

  const clearFilters = () => {
    setTypeFilter("all");
    setTreasurerFilter("all");
    setModifiedFilter("all");
    setBudgetFilter("all");
  };

  const exitSearch = () => {
    clearFilters();
    router.replace("/treasurer/home");
  };

  const updateQuery = (value: string) => {
    setSearch(value);
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Header — hidden on mobile, shown on desktop */}
      <div className="hidden items-start justify-between gap-4 md:flex">
        <div>
          <h1 className="text-xl font-semibold text-text-primary md:text-2xl">Events</h1>
          <p className="mt-1 text-xs text-text-muted">Manage your department event budgets and expenses</p>
        </div>
        <Link
          href="/treasurer/events/new"
          className="hidden shrink-0 items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover md:inline-flex"
        >
          <Plus className="h-4 w-4" />
          New Event
        </Link>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3">
        {!isSearching ? (
          /* ── Default state: Search bar (desktop only) ── */
          <div className="hidden justify-center md:flex">
            <div
              className="flex w-full max-w-[480px] items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 transition-colors focus-within:border-accent focus-within:ring-1 focus-within:ring-accent"
              onClick={() => router.push("?search=1")}
            >
              <Search className="h-4 w-4 shrink-0 text-text-muted" />
              <span className="flex-1 text-sm text-text-muted">Search events...</span>
            </div>
          </div>
        ) : (
          /* ── Search active: filters ── */
          <>
            {/* Desktop search input — hidden on mobile (top bar handles it) */}
            <div className="hidden justify-center md:flex">
              <div className="flex w-full max-w-[480px] items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
                <button
                  type="button"
                  onClick={exitSearch}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-surface-secondary"
                  aria-label="Exit search"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <input
                  type="text"
                  placeholder="Search events..."
                  value={search}
                  onChange={(e) => updateQuery(e.target.value)}
                  autoFocus
                  className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <FilterDropdown label="Type" options={typeOptions} value={typeFilter} onChange={setTypeFilter} />
              <FilterDropdown label="Treasurer" options={treasurerOptions} value={treasurerFilter} onChange={setTreasurerFilter} />
              <FilterDropdown label="Date" options={MODIFIED_OPTIONS} value={modifiedFilter} onChange={setModifiedFilter} />
              <FilterDropdown label="Budget" options={BUDGET_OPTIONS} value={budgetFilter} onChange={setBudgetFilter} />
            </div>

            {hasActiveFilters && (
              <>
                <div className="h-px bg-border" />
                <p className="text-xs font-medium text-text-muted">Search Results</p>
              </>
            )}
          </>
        )}
      </div>

      {/* Events — hidden when searching with no filters */}
      {isSearching && !hasActiveFilters ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Search className="h-10 w-10 text-text-muted" />
          <p className="text-sm font-medium text-text-primary">Search events</p>
          <p className="text-xs text-text-muted">Type a name or use filters above to find events.</p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Archive className="h-10 w-10 text-text-muted" />}
          title={hasActiveFilters ? "No events match your filters" : "No events yet"}
          description={hasActiveFilters ? "Try adjusting your search or filters." : "Create your first event to start tracking expenses."}
          action={
            hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
              >
                Clear filters
              </button>
            ) : (
              <Link
                href="/treasurer/events/new"
                className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
              >
                <Plus className="h-4 w-4" />
                New Event
              </Link>
            )
          }
        />
      ) : (
        <>
          {/* ── Active Events ── */}
          {activeEvents.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text-primary">Active Events</h2>
                <ViewToggle value={viewMode} onChange={setViewMode} />
              </div>
              {viewMode === "grid" ? (
                <motion.div
                  key={`active-grid-${activeEvents.length}`}
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
                >
                  {activeEvents.map((event) => (
                    <motion.div key={event.id} variants={fadeUpItem}>
                      <EventCard
                        id={event.id}
                        name={event.name}
                        status={event.status}
                        budgetTotal={event.budget_total}
                        totalSpent={event.total_spent}
                        numEntries={event.num_entries}
                        createdByName={event.created_by_name}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key={`active-list-${activeEvents.length}`}
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                  className="flex flex-col gap-2"
                >
                  {activeEvents.map((event) => (
                    <motion.div key={event.id} variants={fadeUpItem}>
                      <EventListItem
                        id={event.id}
                        name={event.name}
                        status={event.status}
                        budgetTotal={event.budget_total}
                        totalSpent={event.total_spent}
                        numEntries={event.num_entries}
                        createdAt={event.created_at}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </section>
          )}

          {/* ── Archive ── */}
          {archivedEvents.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text-primary">Archive</h2>
                <FilterDropdown
                  label="Sort"
                  options={SORT_OPTIONS}
                  value={sortBy}
                  onChange={setSortBy}
                />
              </div>
              <div className="flex flex-col gap-5">
                {archivedByYear.map(([year, yearEvents]) => (
                  <div key={year}>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">{year}</p>
                    <motion.div
                      key={`archive-${year}-${yearEvents.length}`}
                      variants={staggerContainer}
                      initial="hidden"
                      animate="show"
                      className="flex flex-col gap-2"
                    >
                      {yearEvents.map((event) => (
                        <motion.div key={event.id} variants={fadeUpItem}>
                          <EventListItem
                            id={event.id}
                            name={event.name}
                            status={event.status}
                            budgetTotal={event.budget_total}
                            totalSpent={event.total_spent}
                            numEntries={event.num_entries}
                            createdAt={event.created_at}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Mobile FAB */}
      <Link
        href="/treasurer/events/new"
        className="fixed bottom-24 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition-transform hover:scale-[1.02] active:scale-95 md:hidden"
        aria-label="New event"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
