"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Search } from "lucide-react";
import { EventCard } from "@/components/events/EventCard";
import { EventListItem } from "@/components/events/EventListItem";
import { ViewToggle } from "@/components/events/ViewToggle";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterDropdown } from "@/components/treasurer/FilterDropdown";
import { staggerContainer, fadeUpItem } from "@/lib/motion-variants";

export type EventBrowserItem = {
  id: string;
  name: string;
  status: "open" | "archived";
  budget_total: number;
  total_spent: number;
  num_entries: number;
  created_by_name: string;
  created_at: string;
};

type Props = {
  events: EventBrowserItem[];
  /** Base path for event links — appends /${id} per event. e.g. "/adviser/events" */
  basePath: string;
  emptyTitle?: string;
  emptyDescription?: string;
};

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

function groupByYear(events: EventBrowserItem[]) {
  const groups: Record<string, EventBrowserItem[]> = {};
  for (const e of events) {
    const year = new Date(e.created_at).getFullYear().toString();
    (groups[year] ??= []).push(e);
  }
  return Object.entries(groups).sort((a, b) => Number(b[0]) - Number(a[0]));
}

// Read-only event browser for adviser home + admin Events tab — mirrors the
// treasurer home: fake search bar → search mode with Type/Treasurer/Date/
// Budget filters, grid/list view toggle, active folder-card grid, archive
// rows grouped by year with a Sort dropdown. State-based instead of the
// treasurer's URL `?search=1` mode (that exists for its searchable mobile
// top bar, which adviser/admin layouts don't have).
export function EventBrowser({
  events,
  basePath,
  emptyTitle = "No events yet",
  emptyDescription = "No events match this department yet.",
}: Props) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const [typeFilter, setTypeFilter] = useState("all");
  const [treasurerFilter, setTreasurerFilter] = useState("all");
  const [modifiedFilter, setModifiedFilter] = useState("all");
  const [budgetFilter, setBudgetFilter] = useState("all");

  const deferredSearch = useDeferredValue(search);

  const treasurerOptions = useMemo(() => {
    const names = [...new Set(events.map((e) => e.created_by_name))];
    return [
      { value: "all", label: "All treasurers" },
      ...names
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({ value: name, label: name })),
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
    setSearch("");
    setTypeFilter("all");
    setTreasurerFilter("all");
    setModifiedFilter("all");
    setBudgetFilter("all");
  };

  const exitSearch = () => {
    clearFilters();
    setSearching(false);
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Search + Filters */}
      <div className="flex flex-col gap-3">
        {!searching ? (
          /* ── Default state: fake search bar ── */
          <div className="flex justify-center">
            <div
              className="flex w-full max-w-[480px] items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 transition-colors focus-within:border-accent focus-within:ring-1 focus-within:ring-accent"
              onClick={() => setSearching(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setSearching(true)}
            >
              <Search className="h-4 w-4 shrink-0 text-text-muted" />
              <span className="flex-1 text-sm text-text-muted">Search events...</span>
            </div>
          </div>
        ) : (
          /* ── Search mode: input + filters ── */
          <>
            <div className="flex justify-center">
              <div className="flex w-full max-w-[480px] items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
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
                  onChange={(e) => setSearch(e.target.value)}
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

      {/* Events — hidden when in search mode with no query/filters yet */}
      {searching && !hasActiveFilters ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Search className="h-10 w-10 text-text-muted" />
          <p className="text-sm font-medium text-text-primary">Search events</p>
          <p className="text-xs text-text-muted">Type a name or use filters above to find events.</p>
        </div>
      ) : events.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No events match your filters"
          description="Try adjusting your search or filters."
          action={
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <>
          {/* ── Active Events ── */}
          {activeEvents.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-text-primary">
                  Active Events
                </h2>
                <ViewToggle value={viewMode} onChange={setViewMode} />
              </div>
              {viewMode === "grid" ? (
                <motion.div
                  key={`active-grid-${activeEvents.length}`}
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
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
                        href={`${basePath}/${event.id}`}
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
                        href={`${basePath}/${event.id}`}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </section>
          )}

          {/* ── Archive ── */}
          {archivedEvents.length > 0 && (
            <section className="pt-4">
              <div className="mb-4 h-px bg-border" />
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-text-primary">
                  Archive
                </h2>
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
                    <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
                      {year}
                    </p>
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
                            href={`${basePath}/${event.id}`}
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
    </div>
  );
}
