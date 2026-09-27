import Link from "next/link";
import { ArrowLeft, ArrowUpRight, ChartNoAxesCombined, ChevronRight, Download, Eye, FileSignature, History, ScrollText } from "lucide-react";
import LottiePlayer from "@/components/LottiePlayer";
import { CancelReportButton } from "@/components/reports/CancelReportButton";
import { PrintReportButton } from "@/components/reports/PrintReportButton";
import { ReportGenerationFlow } from "@/components/reports/ReportGenerationFlow";
import type { getEventDashboard } from "@/lib/queries/events";
import type { ReportForDashboard } from "@/lib/queries/reports";
import { getReportWorkspaceState } from "@/lib/report-workspace";
import { entryTitle } from "@/components/entries/entry-title";
import { formatPHP } from "@/lib/format";
import type { EntryComment } from "@/types";

type Props = {
  event: NonNullable<Awaited<ReturnType<typeof getEventDashboard>>>;
  latestReport: (ReportForDashboard & { rejection_reason: string | null }) | null;
  entryComments: EntryComment[];
};

const STEPS = ["Create Report", "Adviser Review", "Sign & Archive"];
const DESTINATIONS = [
  { label: "Budget History", path: "budget-history", icon: History },
  { label: "Spending Summary", path: "spending-summary", icon: ChartNoAxesCombined },
  { label: "Previous Revisions", path: "previous-revisions", icon: ScrollText },
];
const STATUS_COPY = {
  pending: {
    title: "Your report is awaiting approval",
    description: "No action needed right now. We'll notify you when it's approved or returned.",
  },
  approved: {
    title: "Your report is ready for signing",
    description: "Collect every signature, then upload the signed pages from your event to archive it.",
  },
  archived: {
    title: "Your report is complete",
    description: "This event is archived. Your final report is always available here.",
  },
};

export function TreasurerReportWorkspace({ event, latestReport, entryComments }: Props) {
  const workspace = getReportWorkspaceState(event.status, latestReport?.status ?? null);
  const canGenerate = workspace.step === 1;
  const copy = !canGenerate ? STATUS_COPY[workspace.state as keyof typeof STATUS_COPY] : null;
  const pdfUrl = latestReport ? `/api/reports/${latestReport.id}/pdf` : null;
  const createdDate = new Date(event.created_at).toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
  });
  const pendingEntries = event.entries.filter((entry) => entry.status === "pending_approval").length;
  const entryById = new Map(event.entries.map((entry) => [entry.id, entry]));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-2 pb-16 pt-6 sm:px-4 sm:pt-10">
      <header className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-1">
          <Link href="/treasurer/reports" aria-label="Back to reports" title="Back to reports"
            className="-ml-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-primary transition-colors hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
          <div className="min-w-0 pt-2">
            <h1 className="break-words text-xl font-semibold leading-7 text-text-primary sm:text-2xl">{event.name}</h1>
            <div className="mt-1 text-[10px] leading-4 text-text-muted sm:text-xs sm:leading-5">
              {event.created_by_name !== "Unknown" && <p className="break-words">By: {event.created_by_name}</p>}
              <p>Created {createdDate}</p>
            </div>
          </div>
        </div>
        <Link href={`/treasurer/events/${event.id}`}
          className="mt-1 inline-flex min-h-10 shrink-0 items-center justify-center gap-1 rounded-full border border-border-strong px-3 text-[10px] font-medium text-text-primary transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:px-4 sm:text-xs">
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> View Event
        </Link>
      </header>

      {workspace.state === "rejected" && (
        <aside aria-label="Adviser feedback" className="relative isolate overflow-hidden rounded-lg bg-surface-inverse p-5 text-text-inverse sm:p-6">
          <div className="relative z-10 pr-16 sm:pr-24">
            <h2 className="break-words text-xs font-medium leading-5 sm:text-sm">
              {event.name} <span className="text-error">rejected</span>
            </h2>
            {latestReport?.rejection_reason?.trim() && (
              <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-text-inverse/80">
                {latestReport.rejection_reason.trim()}
              </p>
            )}

            {entryComments.length > 0 && (
              <div className="mt-4 border-t border-text-inverse/15 pt-3">
                <p className="text-xs font-medium text-text-inverse/60">Notes on your entries</p>
                <ul className="mt-2 flex flex-col gap-3">
                  {entryComments.map((note) => {
                    const entry = entryById.get(note.entry_id);
                    return (
                      <li key={note.id}>
                        {entry && (
                          <p className="break-words text-xs font-medium leading-5 text-text-inverse">
                            {entryTitle({
                              supplierName: entry.supplier_name,
                              description: undefined,
                              category: entry.category,
                              formPayload: entry.form_payload_json,
                              itemBreakdown: entry.item_breakdown,
                            })}
                            <span className="ml-1.5 font-normal tabular-nums text-text-inverse/60">
                              {formatPHP(entry.amount)}
                            </span>
                          </p>
                        )}
                        <p className="mt-0.5 whitespace-pre-wrap break-words text-xs leading-5 text-text-inverse/80">
                          {note.comment}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
          <LottiePlayer src="/mascot.json"
            className="pointer-events-none absolute -bottom-3 -right-2 h-28 w-28 sm:right-0 sm:h-32 sm:w-32" />
        </aside>
      )}

      <ol className="grid grid-cols-3 gap-2 px-2" aria-label="Report progress">
        {STEPS.map((label, index) => {
          const complete = workspace.state === "archived" || index + 1 < workspace.step;
          const current = workspace.state !== "archived" && index + 1 === workspace.step;
          return (
            <li key={label} aria-current={current ? "step" : undefined}>
              <div className={`h-1 rounded-full ${complete ? "bg-success" : current ? "bg-accent" : "bg-border-strong"}`} />
              <p className={`mt-2 text-center text-[10px] leading-4 sm:text-xs ${complete ? "text-success-dark" : current ? "text-text-primary" : "text-text-secondary"}`}>
                {label}<span className="sr-only">{complete ? ", complete" : current ? ", current step" : ", upcoming"}</span>
              </p>
            </li>
          );
        })}
      </ol>

      <section aria-label={canGenerate ? "Create report" : "Report status"}
        className="rounded-2xl bg-surface-inverse px-5 py-6 text-text-inverse sm:px-8 sm:py-8">
        {canGenerate ? (
          <ReportGenerationFlow eventId={event.id} previousReport={latestReport}
            disabledReason={pendingEntries > 0 ? "Your adviser needs to resolve the pending expenses before you can generate a report." : undefined} />
        ) : copy && (
          <>
            <h2 className="max-w-md text-2xl font-semibold leading-8">{copy.title}</h2>
            <p className="mt-3 max-w-md text-xs leading-5 text-text-inverse/65">{copy.description}</p>
            {latestReport && pdfUrl && (
              <>
                <div className="mt-7 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] text-text-inverse/65">FS Control Number</p>
                    <p className="mt-1 break-all text-xs font-medium tabular-nums">{latestReport.fs_document_number}</p>
                  </div>
                  <a href={`${pdfUrl}?dl=1`} download aria-label="Download report" title="Download report"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-inverse/75 transition-colors hover:bg-text-inverse/10 hover:text-text-inverse focus-visible:outline-2 focus-visible:outline-text-inverse">
                    <Download className="h-4 w-4" aria-hidden />
                  </a>
                </div>
                <div className="mt-5 grid grid-cols-2 items-start gap-2">
                  <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-surface px-4 py-3 text-xs font-medium text-text-primary transition-colors hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-inverse">
                    <Eye className="h-3.5 w-3.5" aria-hidden /> View
                  </a>
                  {workspace.state === "pending" ? (
                    <CancelReportButton reportId={latestReport.id} inverse />
                  ) : latestReport.status === "approved" ? (
                    <PrintReportButton pdfUrl={pdfUrl} inverse />
                  ) : null}
                </div>
                {workspace.state === "approved" && (
                  <Link href={`/treasurer/events/${event.id}`} className="mt-5 inline-flex min-h-11 items-center gap-2 text-xs text-text-inverse/80 underline underline-offset-4 hover:text-text-inverse">
                    Continue to Sign & Archive <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                )}
              </>
            )}
          </>
        )}
      </section>

      <nav aria-label="Report details" className="flex flex-col gap-2.5 px-3 sm:px-4">
        {DESTINATIONS.map(({ label, path, icon: Icon }) => (
          // prefetch: full RSC warmed by Next's viewport-first scheduler, so
          // these open from the router cache instead of a cold server render.
          // Same treatment as the event-detail links.
          <Link key={path} href={`/treasurer/reports/${event.id}/${path}`} prefetch
            className="group flex min-h-14 items-center gap-3 rounded-sm bg-surface px-4 py-3.5 shadow-card transition-colors hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
            <Icon className="h-4 w-4 shrink-0 text-text-secondary" strokeWidth={1.5} aria-hidden />
            <span className="min-w-0 flex-1 text-xs font-medium text-text-primary sm:text-sm">{label}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
          </Link>
        ))}
        {workspace.state === "archived" && (
          <Link href={`/treasurer/reports/${event.id}/signed-report`} prefetch
            className="group flex min-h-14 items-center gap-3 rounded-sm bg-surface px-4 py-3.5 shadow-card transition-colors hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
            <FileSignature className="h-4 w-4 shrink-0 text-text-secondary" strokeWidth={1.5} aria-hidden />
            <span className="min-w-0 flex-1 text-xs font-medium text-text-primary sm:text-sm">Signed Report</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
          </Link>
        )}
      </nav>
    </div>
  );
}
