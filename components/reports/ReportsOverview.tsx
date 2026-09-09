"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Archive, ChevronRight, CircleMinus, FileSignature, FileText, FolderArchive, Inbox, Search, SearchX } from "lucide-react";
import LottiePlayer from "@/components/LottiePlayer";
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

export function ReportsOverview({ role, items }: Props) {
  const [filter, setFilter] = useState<ReportOverviewFilter>("all");
  // ponytail: query comes from the mobile top bar via ?q= (debounced URL sync)
  const searchParams = useSearchParams();
  const isSearching = searchParams.get("search") === "1";
  const query = searchParams.get("q") ?? "";
  const featured = useMemo(() => getFeaturedReportItems(items, role), [items, role]);
  const actionRequired = useMemo(() => getActionRequiredReport(items, role), [items, role]);
  const filtered = useMemo(() => filterReportItems(items, filter, query), [items, filter, query]);
  const searchResults = useMemo(() => filterReportItems(items, "all", query), [items, query]);
  const archived = useMemo(
    () =>
      items
        .filter((item) => item.eventStatus === "archived")
        .sort((a, b) =>
          (b.report?.generatedAt ?? b.createdAt).localeCompare(
            a.report?.generatedAt ?? a.createdAt,
          ),
        ),
    [items],
  );
  const detailHref = (eventId: string) => `/${role}/reports/${eventId}`;
  const featuredTitle = role === "adviser" ? "Pending Reports" : "Ready for Signing";

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
                {searchResults.length} {searchResults.length === 1 ? "event" : "events"} matching "{query}"
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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 pb-10">
      <FadeIn delay={0}>
        <header>
          <p className="hidden text-xs font-medium uppercase tracking-[0.12em] text-text-secondary md:block">
            Financial documents
          </p>
          <h1 className="sr-only font-semibold text-text-primary md:not-sr-only md:mt-1 md:text-[28px] md:leading-9">Reports</h1>
          <p className="mt-1 hidden text-sm text-text-secondary md:block">
            {role === "adviser"
              ? "Review pending reports and revisit your department's report history."
              : "Track approvals, prepare signed documents, and revisit archived reports."}
          </p>
        </header>
      </FadeIn>

      {actionRequired?.report && (
        <FadeIn delay={30}>
          <section className="relative isolate overflow-hidden rounded-2xl bg-surface-inverse px-5 py-5 text-text-inverse shadow-card sm:px-6">
            <div className="relative z-10 max-w-[78%] sm:max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-inverse/70">
                Action required
              </p>
              <h2 className="mt-2 text-lg font-semibold leading-6">
                {actionRequired.eventName} needs your attention
              </h2>
              <p className="mt-1.5 text-xs leading-5 text-text-inverse/70 sm:text-sm">
                Your report was <span className="font-semibold text-error">rejected</span> by the Adviser.
                <span className="hidden sm:inline"> Review the comments and regenerate the report.</span>
              </p>
              <Link
                href={detailHref(actionRequired.eventId)}
                className="mt-4 inline-flex items-center rounded-full bg-surface px-4 py-2 text-xs font-semibold text-text-primary transition-transform active:scale-[0.98]"
              >
                Review report
              </Link>
            </div>
            <LottiePlayer
              src="/mascot.json"
              className="absolute -bottom-2 -right-2 z-0 h-28 w-28 motion-reduce:hidden sm:right-5 sm:h-32 sm:w-32"
            />
          </section>
        </FadeIn>
      )}

      <FadeIn delay={actionRequired?.report ? 60 : 30}>
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
            <div className="mt-4 grid grid-cols-2 justify-items-center gap-x-8 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {featured.map((item) => (
                <div key={item.eventId} className="w-full max-w-[132px] sm:max-w-[180px]">
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
              icon={role === "adviser" ? <Inbox aria-hidden="true" /> : <FileSignature aria-hidden="true" />}
              title={role === "adviser" ? "No reports waiting for review" : "Nothing waiting to be signed"}
              description={
                role === "adviser"
                  ? "Reports your treasurer generates will land here for review."
                  : "Once your adviser approves a report, it will appear here for signing."
              }
              className="py-10"
            />
          )}
        </section>
      </FadeIn>

      {/* ponytail: no FadeIn — transform breaks position: sticky */}
      <div className="sticky top-16 z-30 -mx-4 border-y border-border bg-background/95 px-4 py-3 shadow-sm backdrop-blur md:mx-0 md:rounded-xl md:border lg:top-0">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide" role="group" aria-label="Filter reports by status">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              aria-pressed={filter === option.value}
              className={cn(
                "shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                filter === option.value
                  ? "bg-accent text-accent-foreground"
                  : "bg-surface-tertiary text-text-secondary hover:text-text-primary",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <FadeIn delay={actionRequired?.report ? 120 : 90}>
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
        <section aria-labelledby="reports-list-title">
          <h2 id="reports-list-title" className="text-lg font-semibold text-text-primary md:text-xl">Reports</h2>

          <p className="mt-2 text-xs text-text-secondary">
            {filtered.length} {filtered.length === 1 ? "event" : "events"}
            {query && <> matching "{query}"</>}
          </p>

          {filtered.length > 0 ? (
            <div className="mt-4 flex flex-col gap-2">
              {filtered.map((item) => (
                <ReportRow key={item.eventId} item={item} href={detailHref(item.eventId)} />
              ))}
            </div>
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
        </section>

        <section aria-labelledby="archive-reports-title" className="lg:rounded-2xl lg:border lg:border-border lg:bg-surface lg:p-5 lg:shadow-card">
          <div>
            <h2 id="archive-reports-title" className="text-lg font-semibold text-text-primary md:text-xl">Archive Reports</h2>
            <p className="text-xs text-text-secondary">
              Total of {archived.length} {archived.length === 1 ? "event" : "events"}
            </p>
          </div>

          {archived.length > 0 ? (
            <div className="mt-3 flex flex-col">
              {archived.map((item) => (
                <Link
                  key={item.eventId}
                  href={detailHref(item.eventId)}
                  className="group flex items-center gap-3 border-b border-border py-3 last:border-0 hover:text-accent"
                >
                  <FolderArchive className="h-5 w-5 shrink-0 text-text-muted group-hover:text-text-primary" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-text-primary">{item.eventName}</span>
                    <span className="mt-0.5 block text-xs text-text-secondary">
                      {new Date(item.report?.generatedAt ?? item.createdAt).toLocaleDateString("en-PH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Archive aria-hidden="true" />}
              title="No archived reports yet"
              description="Events archived with reports will show up here."
              className="py-8"
            />
          )}
        </section>
      </div>
      </FadeIn>
    </div>
  );
}
