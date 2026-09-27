"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, ChevronRight, Download, Eye, History, ReceiptText } from "lucide-react";
import LottiePlayer from "@/components/LottiePlayer";
import { ApprovalDecisionDialog } from "@/components/adviser/ApprovalDecisionDialog";
import { FolderCard } from "@/components/events/FolderCard";
import { entryTitle } from "@/components/entries/entry-title";
import { StatusBadge, reportStatusMap } from "@/components/ui/StatusBadge";
import type { getEventDashboard } from "@/lib/queries/events";
import type { ReportForDashboard } from "@/lib/queries/reports";
import { formatPHP } from "@/lib/format";
import { isUnresolvedOverspendEntry } from "@/lib/overspend";

type EventDashboard = NonNullable<Awaited<ReturnType<typeof getEventDashboard>>>;
type Props = {
  event: EventDashboard;
  report: ReportForDashboard & { rejection_reason?: string | null };
};
type Decision = "approve" | "reject";

export function AdviserReportReview({ event, report }: Props) {
  const router = useRouter();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [comments, setComments] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [completed, setCompleted] = useState<"approved" | "rejected" | null>(null);
  const submitting = useRef(false);
  const [lastDecision, setLastDecision] = useState<Decision>("approve");
  const reportPanel = useRef<HTMLElement>(null);
  const approveButton = useRef<HTMLButtonElement>(null);
  const rejectButton = useRef<HTMLButtonElement>(null);
  const displayStatus = completed ?? report.status;
  const status = reportStatusMap[displayStatus];
  const canReview = displayStatus === "pending_adviser_approval" && event.status !== "archived";
  const basePath = `/adviser/reports/${event.id}`;
  const unresolved = event.entries.filter((entry) =>
    isUnresolvedOverspendEntry(entry.status, entry.causes_overspend, entry.overspend_resolved_at),
  );
  const showOverspend = unresolved.length > 0 && displayStatus !== "approved";
  const activeDecision = decision ?? lastDecision;
  const titleFor = (entry: EventDashboard["entries"][number]): string => entryTitle({
    supplierName: entry.supplier_name, category: entry.category,
    formPayload: entry.form_payload_json, itemBreakdown: entry.item_breakdown,
  });

  function openDecision(next: Decision): void {
    setLastDecision(next);
    setError(undefined);
    setDecision(next);
  }

  async function submitDecision(): Promise<void> {
    if (!decision || !canReview || submitting.current || (decision === "reject" && !reason.trim())) return;
    submitting.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/reports/${report.id}/${decision}`, {
        method: "POST",
        ...(decision === "reject" ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rejection_reason: reason.trim(),
            comments: unresolved.filter((entry) => comments[entry.id]?.trim()).map((entry) => ({
              entry_id: entry.id, text: comments[entry.id].trim(),
            })),
          }),
        } : {}),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.success !== true) {
        setError(response.status === 409
          ? "This report has changed. Close this dialog and refresh the page before reviewing it."
          : `Couldn't ${decision} this report. Please try again.`);
        return;
      }
      setCompleted(decision === "approve" ? "approved" : "rejected");
      setDecision(null);
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-2 pb-16 pt-6 sm:px-4 sm:pt-10">
      <header className="mb-8 flex items-start gap-2 sm:gap-3">
        <Link href="/adviser/reports" prefetch aria-label="Back to reports" title="Back to reports"
          className="-ml-3 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-primary transition-colors hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-accent">
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1 pt-2">
          <h1 className="break-words text-lg font-semibold leading-6 text-text-primary sm:text-2xl">{event.name}</h1>
          <p className="mt-2 text-[10px] leading-4 text-text-secondary sm:text-xs sm:leading-5">By: {event.created_by_name}</p>
          <p className="mt-1 text-[10px] leading-4 text-text-secondary sm:text-xs sm:leading-5">Created {new Date(event.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</p>
        </div>
        <Link href={`/adviser/events/${event.id}`} prefetch
          className="mt-1 inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-border-strong px-3 text-xs font-medium text-text-primary transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent sm:px-4">
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> View Event
        </Link>
      </header>

      {showOverspend && (
        <section aria-labelledby="overspend-title" className="relative mb-6 overflow-hidden rounded-xl bg-surface-inverse p-5 text-text-inverse sm:p-6">
          <h2 id="overspend-title" className="relative z-10 text-sm font-semibold"><span className="text-error">Overspend</span> Reason</h2>
          <ul className="relative z-10 mt-3 space-y-4 pr-16 sm:pr-24">
            {unresolved.map((entry) => (
              <li key={entry.id}>
                <p className="break-words text-xs font-medium leading-5">{titleFor(entry)} <span className="whitespace-nowrap text-text-inverse/70">{formatPHP(Number(entry.amount))}</span></p>
                <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-text-inverse/80">{entry.overspend_explanation?.trim() || "No explanation was provided for this entry."}</p>
              </li>
            ))}
          </ul>
          <LottiePlayer src="/mascot.json" className="pointer-events-none absolute bottom-1 right-1 h-24 w-24 sm:h-32 sm:w-32" />
        </section>
      )}

      <section ref={reportPanel} tabIndex={-1} aria-labelledby="report-number" className="rounded-2xl bg-surface-inverse px-5 py-6 text-text-inverse outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 sm:p-7">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-text-inverse/65">Control Number</p>
            <h2 id="report-number" className="mt-1 break-words text-base font-semibold tracking-tight sm:text-lg">{report.fs_document_number}</h2>
            <p className="mt-2 text-xs text-text-inverse/65">Event Financial Statement Report</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <a href={`/api/reports/${report.id}/pdf`} target="_blank" rel="noopener noreferrer" aria-label="View report PDF" title="View report PDF"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-text-inverse/80 transition-colors hover:bg-text-inverse/10 hover:text-text-inverse focus-visible:outline-2 focus-visible:outline-text-inverse">
              <Eye className="h-5 w-5" aria-hidden />
            </a>
            <a href={`/api/reports/${report.id}/pdf?dl=1`} download aria-label="Download report PDF" title="Download report PDF"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-text-inverse/80 transition-colors hover:bg-text-inverse/10 hover:text-text-inverse focus-visible:outline-2 focus-visible:outline-text-inverse">
              <Download className="h-5 w-5" aria-hidden />
            </a>
          </div>
        </div>
        <div aria-live="polite" className="mt-5 flex items-center gap-2 text-xs text-text-inverse/80">
          <StatusBadge {...status} /> {event.status === "archived" ? "Archived" : status.label}
        </div>
        {canReview && (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button ref={approveButton} type="button" onClick={() => openDecision("approve")} disabled={busy}
              className="min-h-11 rounded-full bg-surface px-4 py-3 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-inverse disabled:opacity-50">Approve</button>
            <button ref={rejectButton} type="button" onClick={() => openDecision("reject")} disabled={busy}
              className="min-h-11 rounded-full border border-error/70 px-4 py-3 text-sm font-medium text-error transition-colors hover:bg-error/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error disabled:opacity-50">Reject</button>
          </div>
        )}
      </section>

      <nav aria-label="Report details" className="mt-8">
        <div className="grid grid-cols-2 gap-8 sm:gap-12">
          <FolderCard id={event.id} name="Expenses" href={`${basePath}/expenses`} />
          <FolderCard id={event.id} name="Budget History" href={`${basePath}/budget-history`} />
        </div>
        <div className="mt-7 flex flex-col gap-3">
          {[
            { label: "Spending Summary", path: "spending-summary", icon: ReceiptText },
            { label: "Previous Revisions", path: "previous-revisions", icon: History },
          ].map(({ label, path, icon: Icon }) => (
            <Link key={path} href={`${basePath}/${path}`} prefetch className="flex min-h-14 items-center gap-3 rounded-sm bg-surface px-4 py-3.5 text-sm font-medium text-text-primary shadow-card transition-colors hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-accent">
              <Icon className="h-5 w-5 shrink-0 text-text-secondary" aria-hidden />
              <span className="flex-1">{label}</span><ChevronRight className="h-4 w-4 text-text-secondary" aria-hidden />
            </Link>
          ))}
        </div>
      </nav>

      <ApprovalDecisionDialog modal open={decision !== null} title={activeDecision === "reject" ? "Reject this report?" : "Approve this report?"}
        description={activeDecision === "reject" ? "Tell the treasurer what needs to change before they submit a new revision." : unresolved.length > 0 ? "Approving acknowledges all unresolved overspend shown on this report. This decision cannot be undone." : "The report will be ready for signing. This decision cannot be undone."}
        confirmLabel={activeDecision === "reject" ? "Reject report" : unresolved.length > 0 ? "Acknowledge & approve" : "Approve report"}
        busyLabel={activeDecision === "reject" ? "Rejecting…" : "Approving…"} tone={activeDecision}
        reason={activeDecision === "reject" ? reason : undefined} onReasonChange={setReason} reasonLabel="Rejection reason (required)" reasonPlaceholder="Explain what needs to be corrected" reasonMaxLength={1000}
        busy={busy} error={error} finalFocus={completed ? reportPanel : lastDecision === "reject" ? rejectButton : approveButton}
        onClose={() => { if (!submitting.current) { setDecision(null); setError(undefined); } }} onConfirm={submitDecision}>
        {activeDecision === "reject" && unresolved.map((entry) => (
          <label key={entry.id} className="block space-y-2">
            <span className="text-xs font-medium text-text-secondary">Note on {titleFor(entry)} (optional)</span>
            <textarea value={comments[entry.id] ?? ""} onChange={(change) => setComments((previous) => ({ ...previous, [entry.id]: change.target.value }))}
              disabled={busy} rows={2} maxLength={1000} placeholder="Add a note about this expense"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent" />
          </label>
        ))}
      </ApprovalDecisionDialog>
    </div>
  );
}
