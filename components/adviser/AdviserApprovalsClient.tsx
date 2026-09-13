"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { FadeIn } from "@/components/ui/FadeIn";
import { EntryDetailModal } from "@/components/entries/EntryDetailModal";
import { ApprovalDecisionDialog } from "@/components/adviser/ApprovalDecisionDialog";
import {
  approveTreasurerSignup,
  rejectTreasurerSignup,
  batchApproveEntries,
  rejectEntry,
} from "@/actions/approvals";
import { formatPHP } from "@/lib/format";
import { CATEGORIES, type ExpenseType } from "@/components/entries/manual-categories";
import { entryTitle } from "@/components/entries/entry-title";
import { formatOriginalSubmissionAge } from "@/lib/adviser-approval-inbox";
import { cn } from "@/lib/utils";
import { Inbox, TriangleAlert, UserCheck, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────

type PendingUser = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
};

type PendingEntry = {
  id: string;
  event_id: string;
  event_name: string;
  created_by_name: string | null;
  amount: number;
  category: string | null;
  resubmission_explanation: string | null;
  created_at: string;
  type: "manual";
  status: "pending_approval" | "resubmitted";
  imageUrl: string | null;
  documentType: string | null;
  documentNumber: string | null;
  issueDate: string | null;
  issueTime: string | null;
  supplierName: string | null;
  itemBreakdown: unknown;
  formPayload: unknown;
  rejectionReason: string | null;
  causesOverspend: boolean;
  overspendExplanation: string | null;
};

type Props = {
  pendingUsers: PendingUser[];
  pendingEntries: PendingEntry[];
  queueErrors: { expenses?: string; users?: string };
};

type Tab = "expenses" | "users";

type DialogState =
  | { kind: "approve-batch"; count: number }
  | { kind: "approve-entry"; entry: PendingEntry }
  | { kind: "reject-entry"; entry: PendingEntry }
  | { kind: "approve-user"; user: PendingUser }
  | { kind: "reject-user"; user: PendingUser }
  | null;

// ─── Small helpers ────────────────────────────────────────────────────

function categoryLabel(category: string | null): string {
  if (!category) return "Other";
  return CATEGORIES[category as ExpenseType]?.label ?? category;
}

/** Compact row-age label ("3d ago"); the full wording lives in the detail. */
function dayAgeLabel(createdAt: string): string {
  const time = Date.parse(createdAt);
  if (!Number.isFinite(time)) return "";
  const days = Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
  return days === 0 ? "today" : `${days}d ago`;
}

function toEntryDetail(e: PendingEntry) {
  return {
    id: e.id,
    type: "manual" as const,
    status: e.status,
    amount: e.amount,
    supplierName: e.supplierName,
    documentType: e.documentType,
    documentNumber: e.documentNumber,
    category: e.category,
    issueDate: e.issueDate,
    issueTime: e.issueTime,
    imageUrl: e.imageUrl,
    itemBreakdown: e.itemBreakdown,
    formPayload: e.formPayload,
    rejectionReason: e.rejectionReason,
    resubmissionExplanation: e.resubmission_explanation,
    createdAt: e.created_at,
  };
}

// ─── Queue error state ────────────────────────────────────────────────

function QueueError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <EmptyState
      icon={<TriangleAlert />}
      title="Queue unavailable"
      description={message}
      action={
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      }
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────

export function AdviserApprovalsClient({ pendingUsers: initialUsers, pendingEntries, queueErrors }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("expenses");
  const [pendingUsers, setPendingUsers] = useState(initialUsers);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailEntry, setDetailEntry] = useState<PendingEntry | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const expensesError = queueErrors.expenses;
  const usersError = queueErrors.users;
  const allSelected = pendingEntries.length > 0 && selectedIds.size === pendingEntries.length;

  // ─── Selection ──────────────────────────────────────────────────────

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(pendingEntries.map((e) => e.id)));
  };

  // ─── Dialog plumbing ────────────────────────────────────────────────

  const openDialog = (next: Exclude<DialogState, null>) => {
    setRejectReason("");
    setError("");
    setDialog(next);
  };

  const closeDialog = () => {
    if (busy) return;
    setDialog(null);
  };

  const finishAction = (result: { success: boolean; error?: string }) => {
    if (!result.success) {
      setError(result.error ?? "Something went wrong. Please try again.");
      setBusy(false);
      return false;
    }
    setSelectedIds(new Set());
    setDetailEntry(null);
    setDialog(null);
    setBusy(false);
    setRejectReason("");
    router.refresh();
    return true;
  };

  // ─── Batch approve ──────────────────────────────────────────────────

  const executeBatchApprove = async () => {
    if (dialog?.kind !== "approve-batch") return;
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBusy(true);
    setError("");
    finishAction(await batchApproveEntries(ids));
  };

  // ─── Single entry actions (from detail) ─────────────────────────────

  const executeEntryApprove = async () => {
    if (dialog?.kind !== "approve-entry") return;
    setBusy(true);
    setError("");
    finishAction(await batchApproveEntries([dialog.entry.id]));
  };

  const executeEntryReject = async () => {
    if (dialog?.kind !== "reject-entry" || rejectReason.trim().length === 0) return;
    setBusy(true);
    setError("");
    finishAction(await rejectEntry(dialog.entry.id, rejectReason.trim()));
  };

  // ─── User signup actions (optimistic) ───────────────────────────────

  const userActionRef = useRef<Promise<void> | null>(null);

  const executeUserAction = async () => {
    if (!dialog || dialog.kind === "approve-batch" || dialog.kind === "approve-entry" || dialog.kind === "reject-entry" || userActionRef.current) return;
    const type = dialog.kind === "approve-user" ? ("approve" as const) : ("reject" as const);
    const userId = dialog.user.id;
    const removed = pendingUsers.find((u) => u.id === userId);
    setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
    setDialog(null);

    const promise = (async () => {
      const result = type === "approve"
        ? await approveTreasurerSignup(userId)
        : await rejectTreasurerSignup(userId);
      if (!result.success) {
        setError(result.error ?? "Something went wrong. Please try again.");
        if (removed) setPendingUsers((prev) => (prev.some((u) => u.id === userId) ? prev : [removed, ...prev]));
      } else {
        router.refresh();
      }
    })().finally(() => {
      userActionRef.current = null;
    });
    userActionRef.current = promise;
  };

  // ─── Entry row ──────────────────────────────────────────────────────

  const renderExpenseRow = (entry: PendingEntry) => (
    <div
      key={entry.id}
      className="rounded-xl border border-border bg-surface transition-colors hover:border-border-strong"
    >
      <div className="flex items-start gap-3 p-4">
        <Checkbox
          checked={selectedIds.has(entry.id)}
          onCheckedChange={() => toggleSelection(entry.id)}
          className="mt-1"
          aria-label={`Select ${entryTitle({ supplierName: entry.supplierName, category: entry.category, formPayload: entry.formPayload, itemBreakdown: entry.itemBreakdown })}`}
        />
        <button
          type="button"
          onClick={() => setDetailEntry(entry)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-text-primary">{entry.event_name}</p>
            {entry.status === "resubmitted" && (
              <span className="shrink-0 rounded-full bg-warning-light px-2 py-0.5 text-[11px] font-medium text-warning-foreground">
                Resubmitted
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-text-secondary">
            {entryTitle({ supplierName: entry.supplierName, category: entry.category, formPayload: entry.formPayload, itemBreakdown: entry.itemBreakdown })}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {categoryLabel(entry.category)} · {entry.created_by_name ?? "Treasurer"} · {dayAgeLabel(entry.created_at)}
          </p>
          {entry.resubmission_explanation && (
            <p className="mt-1 line-clamp-2 text-xs text-warning-foreground">
              Resubmission: {entry.resubmission_explanation}
            </p>
          )}
        </button>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <p className="text-sm font-semibold text-text-primary">{formatPHP(entry.amount)}</p>
          <Button
            variant="outline"
            size="sm"
            className="border-border text-error hover:bg-error-lightest hover:text-error-foreground"
            onClick={() => openDialog({ kind: "reject-entry", entry })}
          >
            Reject
          </Button>
        </div>
      </div>
    </div>
  );

  // ─── Tabs ───────────────────────────────────────────────────────────

  const segmentClass = (t: Tab) =>
    cn(
      "flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
      tab === t
        ? "bg-surface text-text-primary shadow-card"
        : "text-text-muted hover:text-text-primary",
    );

  const countPill = (count: number, active: boolean) =>
    count > 0 ? (
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
          active ? "bg-accent text-accent-foreground" : "bg-surface-tertiary text-text-secondary",
        )}
      >
        {count}
      </span>
    ) : null;

  return (
    <div className="space-y-6">
      {/* Generic action error banner */}
      {error && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-error bg-error-lightest px-4 py-3 text-sm text-error-foreground">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Segmented control */}
      <div className="flex max-w-md gap-1 rounded-full bg-surface-secondary p-1" role="tablist" aria-label="Approval queues">
        <button type="button" role="tab" aria-selected={tab === "expenses"} className={segmentClass("expenses")} onClick={() => setTab("expenses")}>
          Needs Review
          {countPill(pendingEntries.length, tab === "expenses")}
        </button>
        <button type="button" role="tab" aria-selected={tab === "users"} className={segmentClass("users")} onClick={() => setTab("users")}>
          Treasurer Requests
          {countPill(pendingUsers.length, tab === "users")}
        </button>
      </div>

      {/* ── Expenses queue ─────────────────────────────────────────── */}
      {tab === "expenses" && (
        <FadeIn key="expenses">
          {expensesError ? (
            <QueueError message={expensesError} onRetry={() => router.refresh()} />
          ) : pendingEntries.length === 0 ? (
            <EmptyState
              icon={<Inbox />}
              title="No expenses need review"
              description="New manual entries will appear here when treasurers submit them."
            />
          ) : (
            <div className="space-y-4">
              {/* Batch action bar */}
              {selectedIds.size > 0 && (
                <div className="sticky top-2 z-10 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-card">
                  <p className="text-sm text-text-secondary">
                    {selectedIds.size} of {pendingEntries.length} selected
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
                      Clear
                    </Button>
                    <Button size="sm" onClick={() => openDialog({ kind: "approve-batch", count: selectedIds.size })}>
                      Approve Selected ({selectedIds.size})
                    </Button>
                  </div>
                </div>
              )}

              {/* Select-all helper row */}
              <div className="flex items-center gap-2 px-1">
                <Checkbox checked={allSelected} onCheckedChange={() => toggleAll()} />
                <button type="button" onClick={toggleAll} className="text-xs font-medium text-text-secondary hover:text-text-primary">
                  {allSelected ? "Clear all" : "Select all pending"}
                </button>
              </div>

              <div className="space-y-3">{pendingEntries.map(renderExpenseRow)}</div>
            </div>
          )}
        </FadeIn>
      )}

      {/* ── Treasurer requests queue ───────────────────────────────── */}
      {tab === "users" && (
        <FadeIn key="users">
          {usersError ? (
            <QueueError message={usersError} onRetry={() => router.refresh()} />
          ) : pendingUsers.length === 0 ? (
            <EmptyState
              icon={<UserCheck />}
              title="No treasurer requests"
              description="New treasurer signups will appear here when they register."
            />
          ) : (
            <div className="space-y-3">
              {pendingUsers.map((user) => (
                <div key={user.id} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text-primary">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-text-muted">{user.email}</p>
                      <p className="mt-0.5 text-xs text-text-muted">Registered {dayAgeLabel(user.created_at)}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-border text-error hover:bg-error-lightest hover:text-error-foreground"
                        onClick={() => openDialog({ kind: "reject-user", user })}
                      >
                        Reject
                      </Button>
                      <Button size="sm" onClick={() => openDialog({ kind: "approve-user", user })}>
                        Approve
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </FadeIn>
      )}

      {/* ── Entry detail (desktop modal + mobile bottom sheet) ─────── */}
      <EntryDetailModal
        open={detailEntry !== null}
        onClose={() => setDetailEntry(null)}
        entry={detailEntry ? toEntryDetail(detailEntry) : null}
        reviewContext={
          detailEntry
            ? {
                eventName: detailEntry.event_name,
                treasurerName: detailEntry.created_by_name,
                ageLabel: formatOriginalSubmissionAge(detailEntry.created_at),
              }
            : undefined
        }
        reviewActions={
          detailEntry ? (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                className="border-border text-error hover:bg-error-lightest hover:text-error-foreground"
                onClick={() => openDialog({ kind: "reject-entry", entry: detailEntry })}
              >
                Reject
              </Button>
              <Button onClick={() => openDialog({ kind: "approve-entry", entry: detailEntry })}>
                Approve
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* ── Decision dialogs ───────────────────────────────────────── */}
      {dialog?.kind === "approve-batch" && (
        <ApprovalDecisionDialog
          open
          title={`Approve ${dialog.count} expense${dialog.count === 1 ? "" : "s"}?`}
          description="All selected expenses will be approved and counted toward their event budgets."
          confirmLabel="Approve"
          busyLabel="Approving…"
          busy={busy}
          error={error}
          onClose={closeDialog}
          onConfirm={executeBatchApprove}
        />
      )}
      {dialog?.kind === "approve-entry" && (
        <ApprovalDecisionDialog
          open
          title="Approve this expense?"
          description={`${entryTitle({ supplierName: dialog.entry.supplierName, category: dialog.entry.category, formPayload: dialog.entry.formPayload, itemBreakdown: dialog.entry.itemBreakdown })} · ${formatPHP(dialog.entry.amount)} · ${dialog.entry.event_name}`}
          confirmLabel="Approve"
          busyLabel="Approving…"
          busy={busy}
          error={error}
          onClose={closeDialog}
          onConfirm={executeEntryApprove}
        />
      )}
      {dialog?.kind === "reject-entry" && (
        <ApprovalDecisionDialog
          open
          tone="reject"
          title="Reject this expense?"
          description="The treasurer will see your reason and can correct and resubmit the entry."
          confirmLabel="Reject Entry"
          busyLabel="Rejecting…"
          reason={rejectReason}
          reasonLabel="Rejection reason"
          reasonPlaceholder="What should the treasurer correct?"
          busy={busy}
          error={error}
          onReasonChange={setRejectReason}
          onClose={closeDialog}
          onConfirm={executeEntryReject}
        />
      )}
      {dialog?.kind === "approve-user" && (
        <ApprovalDecisionDialog
          open
          title="Approve treasurer request?"
          description={`${dialog.user.first_name} ${dialog.user.last_name} will be granted treasurer access for this department.`}
          confirmLabel="Approve"
          busyLabel="Approving…"
          busy={busy}
          error={error}
          onClose={closeDialog}
          onConfirm={executeUserAction}
        />
      )}
      {dialog?.kind === "reject-user" && (
        <ApprovalDecisionDialog
          open
          tone="reject"
          title="Reject treasurer request?"
          description={`${dialog.user.first_name} ${dialog.user.last_name} will be notified by email. This cannot be undone.`}
          confirmLabel="Reject"
          busyLabel="Rejecting…"
          busy={busy}
          error={error}
          onClose={closeDialog}
          onConfirm={executeUserAction}
        />
      )}
    </div>
  );
}