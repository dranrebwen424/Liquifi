"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { ChevronRight, ChevronUp, Inbox, TriangleAlert, UserCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CssBottomSheet } from "@/components/ui/CssBottomSheet";
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

function categoryIcon(category: string | null) {
  return CATEGORIES[(category ?? "others") as ExpenseType]?.icon ?? CATEGORIES.others.icon;
}

function entryName(entry: PendingEntry): string {
  return entryTitle({
    supplierName: entry.supplierName,
    category: entry.category,
    formPayload: entry.formPayload,
    itemBreakdown: entry.itemBreakdown,
  });
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

function groupByEvent(entries: PendingEntry[]): Array<{ eventId: string; eventName: string; entries: PendingEntry[] }> {
  const groups = new Map<string, { eventId: string; eventName: string; entries: PendingEntry[] }>();
  for (const entry of entries) {
    const existing = groups.get(entry.event_id);
    if (existing) existing.entries.push(entry);
    else groups.set(entry.event_id, { eventId: entry.event_id, eventName: entry.event_name, entries: [entry] });
  }
  return Array.from(groups.values());
}

function eventsLabel(count: number): string {
  return `${count} Event${count === 1 ? "" : "s"}`;
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
  const [selectionSheetOpen, setSelectionSheetOpen] = useState(false);
  const [detailEntry, setDetailEntry] = useState<PendingEntry | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const expensesError = queueErrors.expenses;
  const usersError = queueErrors.users;
  const allSelected = pendingEntries.length > 0 && selectedIds.size === pendingEntries.length;
  const eventGroups = useMemo(() => groupByEvent(pendingEntries), [pendingEntries]);
  const selectedEntries = useMemo(
    () => pendingEntries.filter((entry) => selectedIds.has(entry.id)),
    [pendingEntries, selectedIds],
  );
  const selectedEventCount = useMemo(
    () => new Set(selectedEntries.map((entry) => entry.event_id)).size,
    [selectedEntries],
  );

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

  const openBatchApproveDialog = () => {
    if (selectedIds.size === 0) return;
    setSelectionSheetOpen(false);
    openDialog({ kind: "approve-batch", count: selectedIds.size });
  };

  const finishAction = (result: { success: boolean; error?: string }) => {
    if (!result.success) {
      setError(result.error ?? "Something went wrong. Please try again.");
      setBusy(false);
      return false;
    }
    setSelectedIds(new Set());
    setSelectionSheetOpen(false);
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

  const renderExpenseRow = (entry: PendingEntry) => {
    const Icon = categoryIcon(entry.category);
    const title = entryName(entry);

    return (
      <div
        key={entry.id}
        className="rounded-[10px] border border-border-light bg-surface shadow-card transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-border-strong"
      >
        <div className="flex min-h-[84px] items-center gap-3 px-3 py-3 sm:px-4">
          <Checkbox
            checked={selectedIds.has(entry.id)}
            onCheckedChange={() => toggleSelection(entry.id)}
            aria-label={`Select ${title}`}
          />
          <button
            type="button"
            onClick={() => setDetailEntry(entry)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-light text-accent">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-start justify-between gap-2">
                <span className="truncate text-sm font-semibold leading-5 text-text-primary">{title}</span>
                <span className="shrink-0 text-[10px] leading-4 text-text-muted">{dayAgeLabel(entry.created_at)}</span>
              </span>
              <span className="mt-0.5 block text-sm font-semibold tabular-nums leading-5 text-text-primary">
                {formatPHP(entry.amount)}
              </span>
              <span className="mt-1 block truncate text-[11px] leading-4 text-text-muted">
                {categoryLabel(entry.category)}
              </span>
              <span className="block truncate text-[11px] leading-4 text-text-muted">
                {entry.created_by_name ?? "Treasurer"}
              </span>
              {entry.status === "resubmitted" && (
                <span className="mt-1 inline-flex rounded-full bg-warning-light px-2 py-0.5 text-[10px] font-medium leading-4 text-warning-foreground">
                  Resubmitted
                </span>
              )}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
          </button>
        </div>
        {entry.resubmission_explanation && (
          <p className="border-t border-border-light px-4 py-2 text-xs text-warning-foreground">
            {entry.resubmission_explanation}
          </p>
        )}
      </div>
    );
  };

  // ─── Tabs ───────────────────────────────────────────────────────────

  const tabClass = (t: Tab) =>
    cn(
      "border-b-2 px-1 pb-2 text-[15px] font-medium transition-colors sm:px-3",
      tab === t
        ? "border-accent text-text-primary"
        : "border-transparent text-text-muted hover:text-text-primary",
    );

  const countPill = (count: number, active: boolean) =>
    count > 0 ? (
      <span
        className={cn(
          "ml-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
          active ? "bg-accent text-accent-foreground" : "bg-surface-tertiary text-text-secondary",
        )}
      >
        {count}
      </span>
    ) : null;

  return (
    <div className="space-y-5 pb-24 md:pb-0">
      {/* Generic action error banner */}
      {error && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-error bg-error-lightest px-4 py-3 text-sm text-error-foreground">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-6 border-b border-border-light" role="tablist" aria-label="Approval queues">
        <button type="button" role="tab" aria-selected={tab === "expenses"} className={tabClass("expenses")} onClick={() => setTab("expenses")}>
          Needs Review
          {countPill(pendingEntries.length, tab === "expenses")}
        </button>
        <button type="button" role="tab" aria-selected={tab === "users"} className={tabClass("users")} onClick={() => setTab("users")}>
          User Requests
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
            <div className="space-y-6">
              <div className="hidden items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-5 py-4 shadow-card md:flex">
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  All
                </label>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text-primary">{selectedIds.size} Selected</p>
                  <p className="text-xs text-text-muted">From {eventsLabel(selectedEventCount)}</p>
                </div>
                <Button disabled={selectedIds.size === 0} onClick={openBatchApproveDialog}>
                  Approve
                </Button>
              </div>

              <div className="space-y-8">
                {eventGroups.map((group) => (
                  <section key={group.eventId} className="space-y-3">
                    <div className="flex items-end justify-between gap-3 px-1">
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold leading-6 text-text-primary">{group.eventName}</h2>
                        <p className="text-xs leading-4 text-text-muted">
                          Total of {group.entries.length} Pending entr{group.entries.length === 1 ? "y" : "ies"}
                        </p>
                      </div>
                      <Link
                        href={`/adviser/events/${group.eventId}`}
                        className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-text-muted transition-colors hover:text-text-primary"
                      >
                        View event
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                    <div className="space-y-2">{group.entries.map(renderExpenseRow)}</div>
                  </section>
                ))}
              </div>

              <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-4 py-3 shadow-card md:hidden">
                <div className="mx-auto flex max-w-md items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-text-muted" onClick={(event) => event.stopPropagation()}>
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                    All
                  </label>
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setSelectionSheetOpen(true)}
                  >
                    <span className="flex items-center gap-1 text-sm font-semibold text-text-primary">
                      {selectedIds.size} Selected
                      <ChevronUp className="h-3.5 w-3.5" />
                    </span>
                    <span className="block text-[10px] leading-4 text-text-muted">From {eventsLabel(selectedEventCount)}</span>
                  </button>
                  <Button disabled={selectedIds.size === 0} onClick={openBatchApproveDialog}>
                    Approve
                  </Button>
                </div>
              </div>

              {selectionSheetOpen && (
                <button
                  type="button"
                  aria-label="Close selected expenses sheet"
                  className="fixed inset-0 z-40 bg-overlay-alpha md:hidden"
                  onClick={() => setSelectionSheetOpen(false)}
                />
              )}
              <CssBottomSheet open={selectionSheetOpen} hideAt="md" onClose={() => setSelectionSheetOpen(false)}>
                <div className="max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-5 pb-8 shadow-card">
                  <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border-strong" />
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-text-primary">Selected expenses</h2>
                      <p className="text-xs text-text-muted">{selectedIds.size} selected from {eventsLabel(selectedEventCount)}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())} disabled={selectedIds.size === 0}>
                      Clear
                    </Button>
                  </div>
                  {selectedEntries.length === 0 ? (
                    <p className="rounded-xl bg-surface-secondary px-4 py-5 text-center text-sm text-text-muted">
                      Select expenses to approve them in one batch.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedEntries.map((entry) => (
                        <button
                          type="button"
                          key={entry.id}
                          onClick={() => {
                            setSelectionSheetOpen(false);
                            setDetailEntry(entry);
                          }}
                          className="flex w-full items-center justify-between gap-3 rounded-xl border border-border-light bg-surface px-3 py-3 text-left"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-text-primary">{entryName(entry)}</span>
                            <span className="block truncate text-xs text-text-muted">{entry.event_name} · {formatPHP(entry.amount)}</span>
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
                        </button>
                      ))}
                    </div>
                  )}
                  <Button className="mt-5 w-full" disabled={selectedIds.size === 0} onClick={openBatchApproveDialog}>
                    Approve
                  </Button>
                </div>
              </CssBottomSheet>
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
