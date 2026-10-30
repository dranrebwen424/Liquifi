"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Archive, ChevronRight, CircleMinus, FileSignature, FileText, FolderArchive, Inbox, Search, SearchX, X } from "lucide-react";
import LottiePlayer from "@/components/LottiePlayer";
import { ReportOverviewTable } from "@/components/reports/ReportOverviewTable";
import { FolderCard } from "@/components/events/FolderCard";
import { FadeIn } from "@/components/ui/FadeIn";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge, reportStatusMap } from "@/components/ui/StatusBadge";
import {
  filterReportItems,
  getActionRequiredReport,
  getFeaturedReportItems,
  type ReportOverviewFilter,
  type ReportOverviewItem,
  type ReportOverviewRole,
} from "@/lib/report-overview";
import { cn } from "@/lib/utils";

type Props = {
  role: ReportOverviewRole;
  items: ReportOverviewItem[];
  basePath?: string;
  embedded?: boolean;
};

const FILTERS: { value: ReportOverviewFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const statusTextClass = {
  pending_adviser_approval: "text-warning-foreground [&_svg]:text-warning-foreground",
  approved: "text-success-foreground [&_svg]:text-success-foreground",
  rejected: "text-error-foreground [&_svg]:text-error-foreground",
  cancelled: "text-error-foreground [&_svg]:text-error-foreground",
} as const;

function ReportRow({ item, href }: { item: ReportOverviewItem; href: string }) {
  const status = item.report ? reportStatusMap[item.report.status] : null;
  return (
    <Link
      href={href}
      prefetch
      className="group flex min-h-16 items-center gap-3 rounded-xl bg-surface-secondary px-4 py-3 transition-[background-color,transform] hover:bg-surface-tertiary active:scale-[0.99]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-text-primary shadow-sm">
        <FileText className="h-4.5 w-4.5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-text-primary">{item.eventName}</span>
          {status ? (
            <span className={cn("flex shrink-0 items-center gap-1 text-[10px] font-medium", statusTextClass[item.report!.status])}>
              <StatusBadge icon={status.icon} variant={status.variant} label={status.label} aria-hidden="true" />
              {status.label}
            </span>
          ) : (
            <span className="flex shrink-0 items-center gap-1 text-[10px] font-medium text-neutral-foreground [&_svg]:text-neutral-foreground">
              <StatusBadge icon={CircleMinus} variant="neutral" label="No report yet" aria-hidden="true" />
              No report yet
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-xs text-text-secondary">
          {item.report?.fsDocumentNumber ?? "Generate a financial report"}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}

export function ReportsOverview({ role, items, basePath, embedded }: Props) {
  const [filter, setFilter] = useState<ReportOverviewFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const workspace = role === "treasurer" || role === "adviser";
  // Mobile search remains owned by the top bar.
  const searchParams = useSearchParams();
  const isSearching = searchParams.get("search") === "1";
  const query = isSearching ? searchParams.get("q") ?? "" : workspace ? searchQuery : searchParams.get("q") ?? "";
  const matchesQuery = (item: ReportOverviewItem): boolean => {
    const term = query.trim().toLowerCase();
    return !term || item.eventName.toLowerCase().includes(term) || Boolean(item.report?.fsDocumentNumber.toLowerCase().includes(term));
  };
  const featured = getFeaturedReportItems(items, role).filter((item) => !workspace || matchesQuery(item));
  const actionRequired = useMemo(() => getActionRequiredReport(items, role), [items, role]);
  const filtered = useMemo(() => filterReportItems(items, filter, query), [items, filter, query]);
  const searchResults = useMemo(() => filterReportItems(items, "all", query), [items, query]);
  const archived = items
        .filter((item) => item.eventStatus === "archived" && (!workspace || matchesQuery(item)))
        .sort((a, b) =>
          (b.report?.generatedAt ?? b.createdAt).localeCompare(
            a.report?.generatedAt ?? a.createdAt,
          ),
        );
  const detailHref = (eventId: string) => `${basePath ?? `/${role}/reports`}/${eventId}`;
  const isReviewer = role === "adviser" || role === "admin";
  const featuredTitle = isReviewer ? "Pending Reports" : "Ready for Signing";

  const actionSection = (actionRequired?.report && (
        <FadeIn delay={30}>
          <section className="relative isolate overflow-hidden rounded-2xl bg-surface-inverse px-5 py-5 lg:min-h-52 lg:px-5 lg:py-5 text-text-inverse shadow-card sm:px-6">
            <div className="relative z-10 max-w-[78%] sm:max-w-xl lg:max-w-none lg:pr-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-inverse/70 lg:tracking-wide">
                Action required
              </p>
              <h2 className="mt-2 text-lg font-semibold leading-6 lg:mt-2 lg:max-w-none lg:leading-6 lg:wrap-anywhere">
                {actionRequired.eventName} needs your attention
              </h2>
              <p className="mt-1.5 text-xs leading-5 text-text-inverse/70 sm:text-sm lg:mt-2 lg:max-w-none lg:text-sm">
                Your report was <span className="font-semibold text-error">rejected</span> by the Adviser.
                <span className="hidden sm:inline"> Review the comments<span className="lg:block"> and regenerate the report.</span></span>
              </p>
              <Link
                href={detailHref(actionRequired.eventId)}
                prefetch
                className="mt-4 inline-flex items-center rounded-full bg-surface px-4 py-2 text-xs font-semibold text-text-primary transition-transform active:scale-[0.98] lg:mt-8 lg:min-h-9 lg:transition-colors lg:hover:bg-surface-secondary lg:focus-visible:outline-2 lg:focus-visible:outline-offset-4 lg:focus-visible:outline-text-inverse"
              >
                Review report
              </Link>
            </div>
            <LottiePlayer
              src="/mascot.json"
              className="absolute -bottom-2 -right-2 z-0 h-28 w-28 motion-reduce:hidden sm:right-5 sm:h-32 sm:w-32 lg:bottom-0 lg:right-0 lg:h-32 lg:w-32"
            />
          </section>
        </FadeIn>
      ));

  const featuredSection = (<FadeIn delay={actionRequired?.report ? 60 : 30}>
        <section aria-labelledby="featured-reports-title">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="featured-reports-title" className="text-lg font-semibold text-text-primary md:text-xl">
                {featuredTitle}
              </h2>
              <p className="text-xs text-text-secondary">
                Total of {featured.length} {featured.length === 1 ? "event" : "events"}
              </p>
            </div>
          </div>

          {featured.length > 0 ? (
            <div className={cn("mt-4 grid grid-cols-2 justify-items-center gap-x-8 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5", workspace && "lg:mt-4 lg:justify-items-start lg:justify-start lg:gap-x-4 lg:gap-y-7 lg:grid-cols-[repeat(auto-fill,11.25rem)] xl:grid-cols-[repeat(auto-fill,11.25rem)]")}>
              {featured.map((item) => (
                <div key={item.eventId} className={cn("w-full max-w-[132px] sm:max-w-[180px]", workspace && "lg:rounded-xl lg:transition-colors")}>
                  <FolderCard
                    id={item.eventId}
                    name={item.eventName}
                    href={detailHref(item.eventId)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={isReviewer ? <Inbox aria-hidden="true" /> : <FileSignature aria-hidden="true" />}
              title={query && workspace ? (isReviewer ? "No matching pending reports" : "No matching reports ready for signing") : isReviewer ? "No reports waiting for review" : "Nothing waiting to be signed"}
              description={
                isReviewer
                  ? "Reports your treasurer generates will land here for review."
                  : "Once your adviser approves a report, it will appear here for signing."
              }
              className="py-10"
            />
          )}
        </section>
      </FadeIn>);

  const filterChips = (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide" role="group" aria-label="Filter reports by status">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              aria-pressed={filter === option.value}
              className={cn(
                "shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                workspace && "lg:min-h-11 lg:rounded-full lg:px-4 lg:focus-visible:outline-2 lg:focus-visible:outline-offset-2 lg:focus-visible:outline-accent",
                filter === option.value
                  ? "bg-accent text-accent-foreground"
                  : workspace ? "bg-surface-tertiary text-text-secondary hover:text-text-primary lg:hover:bg-surface-secondary" : "bg-surface-tertiary text-text-secondary hover:text-text-primary",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
  );

  const filtersSection = (<FadeIn delay={actionRequired?.report ? 90 : 60}>
        <div className={cn("border-y border-border px-4 py-3 md:mx-0 md:rounded-xl md:border", workspace && "lg:hidden")}>
        {filterChips}
        </div>
      </FadeIn>);

  const reportsSection = (<section aria-labelledby="reports-list-title">
          <div className={cn(workspace && "lg:flex lg:items-center lg:gap-4")}>
            <div className="shrink-0">
              <h2 id="reports-list-title" className="text-lg font-semibold text-text-primary md:text-xl">Reports</h2>
              <p className={cn("mt-2 text-xs text-text-secondary", workspace && "lg:mt-1")} aria-live="polite" aria-atomic="true">
                {filtered.length} {filtered.length === 1 ? "event" : "events"}
                {query && <> matching &quot;{query}&quot;</>}
              </p>
            </div>
            {workspace && <div className="hidden min-w-0 lg:block">{filterChips}</div>}
          </div>

          {filtered.length > 0 ? (
            <>
              <div className={cn("mt-4 flex flex-col gap-2", workspace && "lg:hidden")}>
                {filtered.map((item) => (
                  <ReportRow key={item.eventId} item={item} href={detailHref(item.eventId)} />
                ))}
              </div>
              {workspace && <div className="mt-4 hidden lg:block"><ReportOverviewTable items={filtered} basePath={basePath ?? `/${role}/reports`} /></div>}
            </>
          ) : (
            <EmptyState
              icon={<SearchX aria-hidden="true" />}
              title="No matching reports"
              description={
                query
                  ? `No results for "${query}". Try a different search.`
                  : filter !== "all"
                    ? "Try another status filter."
                    : "Reports generated for your events will appear here."
              }
            />
          )}
        </section>);

  const archiveSection = (<section aria-labelledby="archive-reports-title" className={cn("lg:rounded-2xl lg:border lg:border-border lg:bg-surface lg:p-5 lg:shadow-card", workspace && "lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none")}>
          <div>
            <h2 id="archive-reports-title" className="text-lg font-semibold text-text-primary md:text-xl"><span className={workspace ? "lg:hidden" : undefined}>Archive Reports</span>{workspace && <span className="hidden lg:inline">Archived reports</span>}</h2>
            <p className="text-xs text-text-secondary">
              Total of {archived.length} {archived.length === 1 ? "event" : "events"}
            </p>
          </div>

          {archived.length > 0 ? (
            <>
            {workspace && <div className="mt-4 hidden lg:block"><ReportOverviewTable items={archived} basePath={basePath ?? `/${role}/reports`} archived /></div>}
            <div className={cn("mt-3 flex flex-col", workspace && "lg:hidden")}>
              {archived.map((item) => (
                <Link
                  key={item.eventId}
                  href={detailHref(item.eventId)}
                  prefetch
                  className="group flex items-center gap-3 border-b border-border py-3 last:border-0 hover:text-accent lg:rounded-lg lg:transition-colors lg:hover:bg-surface-secondary lg:focus-visible:outline-2 lg:focus-visible:outline-accent"
                >
                  <FolderArchive className="h-5 w-5 shrink-0 text-text-muted group-hover:text-text-primary" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-text-primary">{item.eventName}</span>
                    <span className="mt-0.5 block text-xs text-text-secondary">
                      {new Date(item.report?.generatedAt ?? item.createdAt).toLocaleDateString("en-PH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        timeZone: "Asia/Manila",
                      })}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              ))}
            </div>
            </>
          ) : (
            <EmptyState
              icon={<Archive aria-hidden="true" />}
              title={query && workspace ? "No matching archived reports" : "No archived reports yet"}
              description={query && workspace ? "Try another event name or control number." : "Events archived with reports will show up here."}
              className="py-8"
            />
          )}
        </section>);

  // Search mode (mobile top bar): replace the page with prompt/results so other events stay hidden
  if (isSearching) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 pb-10">
        <FadeIn delay={0}>
          {query ? (
            <section aria-labelledby="search-results-title">
              <h1 id="search-results-title" className="sr-only">
                Search results
              </h1>
              <p className="text-xs text-text-secondary">
                {searchResults.length} {searchResults.length === 1 ? "event" : "events"} matching &quot;{query}&quot;
              </p>
              {searchResults.length > 0 ? (
                <div className="mt-4 flex flex-col gap-2">
                  {searchResults.map((item) => (
                    <ReportRow key={item.eventId} item={item} href={detailHref(item.eventId)} />
                  ))}
                </div>
              ) : (
                <div className="mt-4">
                  <EmptyState
                    icon={<SearchX aria-hidden="true" />}
                    title="No matching reports"
                    description={`No results for "${query}". Try an event name or control number.`}
                  />
                </div>
              )}
            </section>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Search className="h-10 w-10 text-text-muted" aria-hidden="true" />
              <p className="text-sm font-medium text-text-primary">Search reports</p>
              <p className="text-xs text-text-muted">Type an event name or control number to find reports.</p>
            </div>
          )}
        </FadeIn>
      </div>
    );
  }

  if (workspace) {
    return (
      <div className="mx-auto w-full max-w-6xl pb-10 lg:max-w-none lg:pb-12 lg:pt-6">
        <header className="mb-7 lg:hidden">
          <p className="hidden text-xs font-medium uppercase tracking-[0.12em] text-text-secondary md:block">Financial documents</p>
          <h1 className="sr-only font-semibold text-text-primary md:not-sr-only md:mt-1 md:text-[28px] md:leading-9">Reports</h1>
          <p className="mt-1 hidden text-sm text-text-secondary md:block">{isReviewer ? "Review pending reports and revisit your department's report history." : "Track approvals, prepare signed documents, and revisit archived reports."}</p>
        </header>
        <div className="mx-auto hidden max-w-3xl lg:block">
          <p className="mb-4 text-center text-xs font-medium uppercase tracking-[0.12em] text-text-secondary">FINANCIAL DOCUMENTS</p>
        <div role="search" aria-label="Search financial reports" className="mx-auto mb-8 hidden lg:flex min-h-12 max-w-3xl items-center gap-3 rounded-full border border-border bg-surface px-5 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent lg:mb-12">
          <Search className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />
          <label htmlFor="report-search" className="sr-only">Search by event name or control number</label>
          <input id="report-search" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search events or control numbers" className="min-w-0 flex-1 bg-transparent py-3 text-sm text-text-primary outline-none placeholder:text-text-secondary [&::-webkit-search-cancel-button]:appearance-none" />
          {searchQuery && <button type="button" onClick={() => setSearchQuery("")} aria-label="Clear search" className="flex size-11 shrink-0 items-center justify-center rounded-full text-text-secondary hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"><X className="size-4" aria-hidden="true" /></button>}
        </div>
        </div>
        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)] lg:gap-x-10 lg:gap-y-10 xl:gap-x-14">
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">{featuredSection}</div>
          {actionRequired?.report && <div className="order-first min-w-0 lg:order-none lg:col-start-2 lg:row-start-1">{actionSection}</div>}
          <div className="min-w-0 space-y-7 lg:space-y-0 lg:col-start-1 lg:row-start-2">
            {filtersSection}
            {reportsSection}
          </div>
          <aside aria-label="Report archive" className={cn("min-w-0 lg:col-start-2", role === "adviser" ? "lg:row-span-2 lg:row-start-1" : "lg:row-start-2")}>{archiveSection}</aside>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-7", !embedded && "mx-auto w-full max-w-6xl pb-10")}>
      {!embedded && <FadeIn><header>
        <p className="hidden text-xs font-medium uppercase tracking-[0.12em] text-text-secondary md:block">Financial documents</p>
        <h1 className="sr-only font-semibold text-text-primary md:not-sr-only md:mt-1 md:text-[28px] md:leading-9">Reports</h1>
        <p className="mt-1 hidden text-sm text-text-secondary md:block">Review pending reports and revisit your department&apos;s report history.</p>
      </header></FadeIn>}
      {featuredSection}
      {filtersSection}
      <FadeIn delay={90}><div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">{reportsSection}{archiveSection}</div></FadeIn>
    </div>
  );
}
