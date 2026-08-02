"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  approveTreasurerSignup,
  rejectTreasurerSignup,
  batchApproveEntries,
  rejectEntry,
} from "@/actions/approvals";
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
  created_by_name?: string | null;
  amount: number;
  category: string | null;
  created_at: string;
};

type Props = {
  pendingUsers: PendingUser[];
  pendingEntries: PendingEntry[];
};

type Tab = "expenses" | "users";

// ─── Client Component ─────────────────────────────────────────────────

export default function AdviserApprovalsClient({ pendingUsers: initialUsers, pendingEntries }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("expenses");
  const [pendingUsers, setPendingUsers] = useState(initialUsers);

  // Entry selections
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [approving, setApproving] = useState(false);

  // Reject modal
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [rejectError, setRejectError] = useState("");

  // Confirmation dialog state
  const [confirmingAction, setConfirmingAction] = useState<{
    type: "approve" | "reject";
    userId?: string;
    userName?: string;
  } | null>(null);

  // Generic error banner
  const [error, setError] = useState("");

  // ─── Selection helpers ────────────────────────────────────────────

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === pendingEntries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingEntries.map((e) => e.id)));
    }
  };

  // ─── Batch approve ─────────────────────────────────────────────────

  const handleBatchApprove = async () => {
    setConfirmingAction({ type: "approve" });
  };

  const executeBatchApprove = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setApproving(true);
    setError("");
    setConfirmingAction(null);

    const result = await batchApproveEntries(ids);
    if (!result.success) {
      setError(result.error);
      setApproving(false);
      return;
    }

    setSelectedIds(new Set());
    setApproving(false);
    router.refresh();
  };

  // ─── Reject single entry ──────────────────────────────────────────

  const openReject = (entryId: string) => {
    setRejectingId(entryId);
    setRejectReason("");
    setRejectError("");
  };

  const executeReject = async () => {
    if (!rejectingId || rejectReason.trim().length === 0) return;

    setRejecting(true);
    setError("");

    const result = await rejectEntry(rejectingId, rejectReason.trim());
    if (!result.success) {
      setError(result.error);
      setRejecting(false);
      return;
    }

    setRejectingId(null);
    setRejectReason("");
    setRejecting(false);
    router.refresh();
  };

  // ─── Approve / Reject user signups ─────────────────────────────────

  const confirmApproveUser = (user: PendingUser) => {
    setConfirmingAction({ type: "approve", userId: user.id, userName: `${user.first_name} ${user.last_name}` });
  };

  const confirmRejectUser = (user: PendingUser) => {
    setConfirmingAction({ type: "reject", userId: user.id, userName: `${user.first_name} ${user.last_name}` });
  };

  const executeUserAction = async () => {
    if (!confirmingAction || !confirmingAction.userId) return;

    setError("");

    const result =
      confirmingAction.type === "approve"
        ? await approveTreasurerSignup(confirmingAction.userId)
        : await rejectTreasurerSignup(confirmingAction.userId);

    if (!result.success) {
      setError(result.error);
      setConfirmingAction(null);
      return;
    }

    setConfirmingAction(null);
    setPendingUsers((prev) => prev.filter((u) => u.id !== confirmingAction.userId));
    router.refresh();
  };

  // ─── Tab bar ──────────────────────────────────────────────────────

  const tabClass = (t: Tab) =>
    cn(
      "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
      tab === t
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-muted",
    );

  // ─── Format helpers ───────────────────────────────────────────────

  const fmtAmount = (n: number) =>
    new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);

  const fmtDate = (s: string) => {
    const d = new Date(s);
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  };

  const allSelected = pendingEntries.length > 0 && selectedIds.size === pendingEntries.length;

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-2">
        <button className={tabClass("expenses")} onClick={() => setTab("expenses")}>
          Pending Expenses
          {pendingEntries.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs font-semibold">
              {pendingEntries.length}
            </span>
          )}
        </button>
        <button className={tabClass("users")} onClick={() => setTab("users")}>
          Pending Users
          {pendingUsers.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs font-semibold">
              {pendingUsers.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Pending Expenses tab ──────────────────────────────────── */}
      {tab === "expenses" && (
        <div className="space-y-4">
          {pendingEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
              <p className="text-sm text-muted-foreground">No pending expenses to review.</p>
              <p className="text-xs text-muted-foreground mt-1">
                New manual entries will appear here when treasurers submit them.
              </p>
            </div>
          ) : (
            <>
              {/* Batch action bar */}
              {selectedIds.size > 0 && (
                <div className="sticky top-0 z-10 -mx-2 rounded-lg border bg-card px-4 py-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {selectedIds.size} of {pendingEntries.length} selected
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedIds(new Set())}
                      >
                        Clear
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleBatchApprove}
                        disabled={approving}
                      >
                        {approving ? "Approving…" : `Approve Selected (${selectedIds.size})`}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Table — desktop */}
              <div className="hidden sm:block rounded-lg border">
                <table className="min-w-full divide-y">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="w-10 px-4 py-3">
                        <Checkbox checked={allSelected} onCheckedChange={() => toggleAll()} />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Event / Description
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Date
                      </th>
                      <th className="w-24 px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {pendingEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selectedIds.has(entry.id)}
                            onCheckedChange={() => toggleSelection(entry.id)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium">{entry.event_name}</p>
                          {entry.created_by_name && (
                            <p className="text-xs text-muted-foreground">by {entry.created_by_name}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {entry.category || "—"}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-right">
                          {fmtAmount(entry.amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                          {fmtDate(entry.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => openReject(entry.id)}
                          >
                            Reject
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards — mobile */}
              <div className="sm:hidden space-y-3">
                {pendingEntries.map((entry) => (
                  <div key={entry.id} className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedIds.has(entry.id)}
                        onCheckedChange={() => toggleSelection(entry.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{entry.event_name}</p>
                        {entry.created_by_name && (
                          <p className="text-xs text-muted-foreground">by {entry.created_by_name}</p>
                        )}
                        <p className="text-sm font-semibold mt-1">{fmtAmount(entry.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.category || "—"} · {fmtDate(entry.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => openReject(entry.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Pending Users tab ──────────────────────────────────────── */}
      {tab === "users" && (
        <div className="space-y-4">
          {pendingUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
              <p className="text-sm text-muted-foreground">No pending user approvals.</p>
              <p className="text-xs text-muted-foreground mt-1">
                New treasurer signups will appear here when they register.
              </p>
            </div>
          ) : (
            <>
              {/* Table — desktop */}
              <div className="hidden sm:block rounded-lg border">
                <table className="min-w-full divide-y">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Registered
                      </th>
                      <th className="w-48 px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {pendingUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium">
                            {user.first_name} {user.last_name}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{user.email}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                          {fmtDate(user.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-destructive/30 text-destructive hover:bg-destructive/10"
                              onClick={() => confirmRejectUser(user)}
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => confirmApproveUser(user)}
                            >
                              Approve
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards — mobile */}
              <div className="sm:hidden space-y-3">
                {pendingUsers.map((user) => (
                  <div key={user.id} className="rounded-lg border p-4 space-y-2">
                    <p className="text-sm font-medium">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">Registered {fmtDate(user.created_at)}</p>
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => confirmRejectUser(user)}
                      >
                        Reject
                      </Button>
                      <Button size="sm" className="flex-1" onClick={() => confirmApproveUser(user)}>
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Confirm Action Dialog ──────────────────────────────────── */}
      {confirmingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold">
              {confirmingAction.type === "approve" ? "Approve" : "Reject"}{" "}
              {confirmingAction.userName ? "User" : "Entries"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {confirmingAction.userName ? (
                <>Are you sure you want to {confirmingAction.type} <strong>{confirmingAction.userName}</strong>?</>
              ) : (
                <>Approve {selectedIds.size} selected entr{selectedIds.size === 1 ? "y" : "ies"}?</>
              )}
            </p>
            {confirmingAction.type === "reject" && confirmingAction.userId && (
              <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-md px-3 py-2">
                This action cannot be undone. The user will be notified via email.
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setConfirmingAction(null)}>
                Cancel
              </Button>
              <Button
                variant={confirmingAction.type === "reject" ? "destructive" : "default"}
                onClick={executeUserAction}
              >
                {confirmingAction.type === "approve" ? "Approve" : "Reject"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Entry Modal ──────────────────────────────────────── */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold">Reject Entry</h3>
            <p className="text-sm text-muted-foreground">
              Provide a reason for rejecting this entry. The treasurer will see this explanation.
            </p>

            {rejectError && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{rejectError}</p>
            )}

            <textarea
              className="w-full min-h-[100px] rounded-lg border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Enter rejection reason…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              autoFocus
            />

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectingId(null);
                  setRejectReason("");
                  setRejectError("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={rejectReason.trim().length === 0 || rejecting}
                onClick={executeReject}
              >
                {rejecting ? "Rejecting…" : "Reject Entry"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
