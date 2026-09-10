import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  Download,
  Eye,
} from "lucide-react";
import { ReportFileCard } from "@/components/reports/ReportFileCard";
import { ReportGenerationFlow } from "@/components/reports/ReportGenerationFlow";
import { ReportViewer } from "@/components/reports/ReportViewer";
import { formatPHP } from "@/lib/format";
import { getEventDashboard } from "@/lib/queries/events";
import { getAllReportsByEvent } from "@/lib/queries/reports";
import {
  getReportWorkspaceState,
  type ReportWorkspaceState,
} from "@/lib/report-workspace";
import { computeSpendingBreakdown } from "@/lib/spending-breakdown";
import { requireRole } from "@/lib/auth-guard";

type Props = {
  params: Promise<{ eventId: string }>;
};

const STEPS = ["Create report", "Adviser review", "Sign & archive"];

const WORKSPACE_COPY: Record<
  ReportWorkspaceState,
  { eyebrow: string; title: string; description: string }
> = {
  empty: {
    eyebrow: "Next step · Create report",
    title: "Create your event report",
    description: "Add the people who will sign, then generate the document for adviser review.",
  },
  rejected: {
    eyebrow: "Action required · Adviser returned report",
    title: "Update and regenerate",
    description: "Create a new revision after addressing the adviser’s feedback. Your FS number stays the same.",
  },
  cancelled: {
    eyebrow: "Next step · Create new revision",
    title: "Generate the report again",
    description: "Your saved signatories are ready to reuse, and the existing FS number will be preserved.",
  },
  pending: {
    eyebrow: "Current step · Adviser review",
    title: "Your report is awaiting approval",
    description: "No action is needed right now. We’ll notify you when it is approved or returned.",
  },
  approved: {
    eyebrow: "Next step · Physical signing",
    title: "Your report is ready for signing",
    description: "Download or print the approved report, collect every signature, then return to the event to archive it.",
  },
  archived: {
    eyebrow: "Complete · Archived",
    title: "This report is complete",
    description: "The signed event record is permanently read-only. The approved report remains available anytime.",
  },
};

export default async function ReportPage({ params }: Props) {
  const { eventId } = await params;
  const user = await requireRole("treasurer");
  const [event, reports] = await Promise.all([
    getEventDashboard(eventId),
    getAllReportsByEvent(eventId),
  ]);

  if (!event) notFound();
  if (user.departmentId && event.department_id !== user.departmentId) notFound();

  const latestReport = reports[0] ?? null;
  const olderReports = reports.slice(1);
  const breakdown = computeSpendingBreakdown(event.entries);
  const workspace = getReportWorkspaceState(event.status, latestReport?.status ?? null);
  const copy = WORKSPACE_COPY[workspace.state];
  const createdDate = new Date(event.created_at).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const remaining = event.budget_total - event.total_spent;
  const canGenerate = ["empty", "rejected", "cancelled"].includes(workspace.state);
  const pdfUrl = latestReport ? `/api/reports/${latestReport.id}/pdf` : null;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-3 pb-16 pt-6 sm:px-4 lg:px-0 lg:pt-0">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <Link
            href="/treasurer/reports"
            className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-primary transition-colors hover:bg-surface-secondary"
            aria-label="Back to reports"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold leading-tight text-text-primary sm:text-[28px]">
              {event.name}
            </h1>
            <p className="mt-1 text-[11px] text-text-muted sm:text-xs">
              Created {createdDate}
              {event.created_by_name !== "Unknown" && <> · by {event.created_by_name}</>}
            </p>
          </div>
        </div>
        <Link
          href={`/treasurer/events/${eventId}`}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-border-strong bg-surface px-3 py-2 text-xs font-medium text-text-primary transition-[color,transform] hover:bg-surface-secondary active:scale-[0.98] sm:px-4 sm:py-2.5"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
          View Event
        </Link>
      </header>

      <ol className="grid grid-cols-3 gap-2" aria-label="Report progress">
        {STEPS.map((label, index) => {
          const number = (index + 1) as 1 | 2 | 3;
          const complete = workspace.state === "archived" || number < workspace.step;
          const current = workspace.state !== "archived" && number === workspace.step;
          return (
            <li key={label} aria-current={current ? "step" : undefined}>
              <div
                className={`h-1 rounded-full ${complete ? "bg-success" : current ? "bg-accent" : "bg-border"}`}
              />
              <div className="mt-2 flex items-center gap-1.5">
                {complete && <Check className="h-3 w-3 shrink-0 text-success" />}
                <span className={`truncate text-[10px] sm:text-xs ${current ? "font-medium text-text-primary" : "text-text-muted"}`}>
                  {label}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      <section className="overflow-hidden rounded-2xl bg-surface-inverse p-5 text-text-inverse shadow-card sm:p-8">
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-inverse/55">
          {copy.eyebrow}
        </p>
        <h2 className="mt-3 max-w-2xl text-2xl font-semibold leading-tight sm:text-[32px]">
          {copy.title}
        </h2>
        <p className="mt-2 max-w-xl text-xs leading-5 text-text-inverse/65 sm:text-sm sm:leading-6">
          {copy.description}
        </p>

        {canGenerate ? (
          <div className="mt-7 border-t border-text-inverse/15 pt-6">
            <ReportGenerationFlow eventId={eventId} previousReport={latestReport} />
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            {pdfUrl && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-surface px-5 py-3 text-xs font-semibold text-text-primary transition-[color,transform] hover:bg-surface-secondary active:scale-[0.98]"
              >
                <Eye className="h-4 w-4" />
                {workspace.state === "archived" ? "View archived report" : "View report"}
              </a>
            )}
            {pdfUrl && workspace.state === "approved" && (
              <a
                href={`${pdfUrl}?dl=1`}
                download
                className="inline-flex items-center justify-center gap-2 rounded-full border border-text-inverse/25 px-5 py-3 text-xs font-semibold text-text-inverse transition-colors hover:bg-text-inverse/10"
              >
                <Download className="h-4 w-4" />
                Download for signing
              </a>
            )}
          </div>
        )}
      </section>

      {latestReport && (
        <section className="rounded-2xl border border-border bg-surface px-4 py-2 shadow-card sm:px-5">
          <div className="border-b border-border-light py-3">
            <h2 className="text-sm font-semibold text-text-primary">Latest report</h2>
            <p className="mt-0.5 text-xs text-text-muted">Your current report file and available actions</p>
          </div>
          <ReportViewer report={latestReport} isArchived={event.status === "archived"} />
        </section>
      )}

      <div className="flex flex-col gap-3">
        <details className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Spending summary</h2>
              <p className="mt-0.5 text-xs text-text-muted">
                {breakdown.length} {breakdown.length === 1 ? "category" : "categories"} · {formatPHP(event.total_spent)} spent
              </p>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-text-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-border px-5 py-5">
            <div className="grid grid-cols-3 gap-3 rounded-xl bg-surface-secondary p-4">
              <div><p className="text-[10px] uppercase tracking-wide text-text-muted">Budget</p><p className="mt-1 truncate text-xs font-semibold tabular-nums text-text-primary sm:text-sm">{formatPHP(event.budget_total)}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-text-muted">Spent</p><p className="mt-1 truncate text-xs font-semibold tabular-nums text-text-primary sm:text-sm">{formatPHP(event.total_spent)}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-text-muted">Remaining</p><p className={`mt-1 truncate text-xs font-semibold tabular-nums sm:text-sm ${remaining < 0 ? "text-error" : "text-text-primary"}`}>{remaining < 0 ? `-${formatPHP(Math.abs(remaining))}` : formatPHP(remaining)}</p></div>
            </div>
            {breakdown.length === 0 ? (
              <p className="py-8 text-center text-xs text-text-muted">No deducted expenses yet.</p>
            ) : (
              <div className="mt-5 flex flex-col gap-4">
                {breakdown.map((item) => (
                  <div key={item.name}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-medium text-text-primary">{item.name}</p>
                      <p className="shrink-0 text-sm tabular-nums text-text-primary">{formatPHP(item.amount)}</p>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border-light">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(item.percentage, 1)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>

        {olderReports.length > 0 && (
          <details className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <div>
                <h2 className="text-sm font-semibold text-text-primary">Previous revisions</h2>
                <p className="mt-0.5 text-xs text-text-muted">{olderReports.length} superseded {olderReports.length === 1 ? "report" : "reports"} kept for your records</p>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-text-muted transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-border px-5 py-1">
              {olderReports.map((report) => <ReportFileCard key={report.id} report={report} />)}
            </div>
          </details>
        )}
      </div>
    </main>
  );
}
