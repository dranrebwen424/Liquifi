"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import type { getEventDashboard } from "@/lib/queries/events";
import type { getLatestReportByEvent } from "@/lib/queries/reports";
import { formatPHP } from "@/lib/format";
import { isUnresolvedOverspendEntry } from "@/lib/overspend";
import { entryTitle } from "@/components/entries/entry-title";
import { EntryList, type EntryListItem } from "@/components/entries/EntryList";
import { ReportFileCard } from "@/components/reports/ReportFileCard";
import { StatusBadge, reportStatusMap } from "@/components/ui/StatusBadge";

type EventDashboard = NonNullable<Awaited<ReturnType<typeof getEventDashboard>>>;
type LatestReport = NonNullable<Awaited<ReturnType<typeof getLatestReportByEvent>>>;

type Props = {
  event: EventDashboard;
  report: LatestReport;
};

export function AdviserReportReview({ event, report }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [comments, setComments] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const statusEntry = reportStatusMap[report.status] ?? null;

  const unresolved = useMemo(
    () =>
      event.entries.filter((entry) =>
        isUnresolvedOverspendEntry(
          entry.status,
          entry.causes_overspend,
          entry.overspend_resolved_at,
        ),
      ),
    [event.entries],
  );

  const listItems: EntryListItem[] = useMemo(
    () =>
      event.entries.map((entry) => ({
        id: entry.id,
        type: entry.type,
        status: entry.status,
        amount: Number(entry.amount),
        supplierName: entry.supplier_name,
        documentType: entry.document_type_raw,
        documentNumber: entry.document_number,
        category: entry.category,
        issueDate: entry.issue_date,
        issueTime: entry.issue_time,
        imageUrl: entry.image_url,
        itemBreakdown: entry.item_breakdown,
        formPayload: entry.form_payload_json,
        rejectionReason: entry.rejection_reason,
        resubmissionExplanation: entry.resubmission_explanation,
        createdAt: entry.created_at,
        voidReason: entry.void_reason,
        voidedBy: entry.voided_by,
        voidedAt: entry.voided_at,
        voidedByName: entry.voidedByName,
      })),
    [event.entries],
  );

  async function approve() {
    const hasOverspend = unresolved.length > 0;
    const ok = window.confirm(
      hasOverspend
        ? "This report has unresolved overspend entries. Approving acknowledges that overspend. Continue?"
        : "Approve this report? This cannot be undone.",
    );
    if (!ok) return;

    setBusy("approve");
    setError(null);
    try {
      const res = await fetch(`/api/reports/${report.id}/approve`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setError(json.error ?? "Failed to approve report.");
        return;
      }
      router.refresh();
    } catch {
      setError("Failed to approve report.");
    } finally {
      setBusy(null);
    }
  }

  async function reject(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectionReason.trim()) return;

    setBusy("reject");
    setError(null);
    try {
      const res = await fetch(`/api/reports/${report.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rejection_reason: rejectionReason.trim(),
          comments: unresolved
            .filter((entry) => comments[entry.id]?.trim())
            .map((entry) => ({
              entry_id: entry.id,
              text: comments[entry.id].trim(),
            })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setError(json.error ?? "Failed to reject report.");
        return;
      }
      router.refresh();
    } catch {
      setError("Failed to reject report.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-16">
      {/* Back link */}
      <Link
        href="/adviser/reports"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to reports
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-text-primary md:text-[28px]">
              {event.name}
            </h1>
            {statusEntry && (
              <StatusBadge
                icon={statusEntry.icon}
                variant={statusEntry.variant}
                label={statusEntry.label}
              />
            )}
          </div>
          <p className="mt-1 text-xs text-text-muted">
            {report.fs_document_number} · {formatPHP(event.total_spent)} of{" "}
            {formatPHP(event.budget_total)} spent
          </p>
        </div>

        {/* Round-trip to the full event dashboard */}
        <Link
          href={`/adviser/events/${event.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          View event
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Unresolved overspend banner */}
      {unresolved.length > 0 && (
        <div className="rounded-xl border border-warning bg-warning-lightest p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-warning-foreground">
            <AlertTriangle className="h-4 w-4" />
            Unresolved overspend ({unresolved.length})
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {unresolved.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-warning/40 bg-surface px-3 py-2 text-xs text-text-secondary"
              >
                <span className="font-medium text-text-primary">
                  {entryTitle({
                    supplierName: entry.supplier_name,
                    description: undefined,
                    category: entry.category,
                    formPayload: entry.form_payload_json,
                    itemBreakdown: entry.item_breakdown,
                  })}
                </span>{" "}
                — {formatPHP(Number(entry.amount))}
                {entry.overspend_explanation && (
                  <p className="mt-1 text-text-muted">
                    {entry.overspend_explanation}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Signed report — a file card with View (full PDF) + Download */}
      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-text-primary">
          Signed report
        </h2>
        <ReportFileCard report={report} />
      </section>

      {/* Entries */}
      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-text-primary">
          Entries ({event.entries.length})
        </h2>
        <EntryList
          entries={listItems}
          isArchived={event.status === "archived"}
          canMutate={false}
        />
      </section>

      {/* Review actions */}
      {report.status === "pending_adviser_approval" && (
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
          {error && (
            <p className="rounded-lg border border-error/30 bg-error-lightest px-3 py-2 text-xs text-error">
              {error}
            </p>
          )}

          {!showReject ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={busy !== null}
                onClick={approve}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                {busy === "approve" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {unresolved.length > 0
                  ? "Acknowledge overspend & Approve"
                  : "Approve Report"}
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => {
                  setError(null);
                  setShowReject(true);
                }}
                className="rounded-full border border-error px-6 py-3 text-sm font-medium text-error transition-colors hover:bg-error-lightest disabled:opacity-50"
              >
                Reject Report
              </button>
            </div>
          ) : (
            <form onSubmit={reject} className="flex flex-col gap-3">
              <div>
                <label
                  htmlFor="rejection-reason"
                  className="mb-1 block text-xs font-medium text-text-secondary"
                >
                  Rejection reason{" "}
                  <span className="text-error">*</span>
                </label>
                <textarea
                  id="rejection-reason"
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  maxLength={1000}
                  placeholder="Why is this report being rejected?"
                  className="min-h-20 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>

              {unresolved.map((entry) => (
                <div key={entry.id}>
                  <label
                    htmlFor={`comment-${entry.id}`}
                    className="mb-1 block text-xs font-medium text-text-secondary"
                  >
                    Comment on{" "}
                    {entryTitle({
                      supplierName: entry.supplier_name,
                      description: undefined,
                      category: entry.category,
                      formPayload: entry.form_payload_json,
                      itemBreakdown: entry.item_breakdown,
                    })}
                    {" "}
                    (optional)
                  </label>
                  <textarea
                    id={`comment-${entry.id}`}
                    value={comments[entry.id] ?? ""}
                    onChange={(e) =>
                      setComments((prev) => ({
                        ...prev,
                        [entry.id]: e.target.value,
                      }))
                    }
                    maxLength={1000}
                    placeholder="Optional note for this flagged entry"
                    className="min-h-16 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>
              ))}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={busy !== null || !rejectionReason.trim()}
                  className="rounded-full border border-error px-6 py-3 text-sm font-medium text-error transition-colors hover:bg-error-lightest disabled:opacity-50"
                >
                  {busy === "reject" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Confirm Rejection
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => {
                    setShowReject(false);
                    setError(null);
                  }}
                  className="rounded-full border border-border px-6 py-3 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary disabled:opacity-50"
                >
                  Keep Report
                </button>
              </div>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
