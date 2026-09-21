"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FadeIn } from "@/components/ui/FadeIn";
import { approveAdviserSignup, rejectAdviserSignup } from "@/actions/approvals";

// ─── Types ───────────────────────────────────────────────────────────

type PendingApplicant = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  department_id: string | null;
  department_name: string | null;
  created_at: string;
};

type Props = {
  applicants: PendingApplicant[];
};

/** Compact row-age label ("3d ago"); mirrors the adviser approval inbox. */
function dayAgeLabel(createdAt: string): string {
  const time = Date.parse(createdAt);
  if (!Number.isFinite(time)) return "";
  const days = Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
  return days === 0 ? "today" : `${days}d ago`;
}

// ─── Component ───────────────────────────────────────────────────────

export function AdminApprovalsClient({ applicants }: Props) {
  const router = useRouter();
  const [localApplicants, setLocalApplicants] = useState(applicants);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  // Refs guard against a rapid double-click firing the background action twice
  // before React re-renders the row away (the row itself is removed instantly).
  const pendingRef = useRef<Set<string>>(new Set());

  const runOptimistic = useCallback(
    async (userId: string, action: (uid: string) => Promise<{ success: boolean; error?: string }>) => {
      if (pendingRef.current.has(userId)) return;
      pendingRef.current.add(userId);
      setActionError("");

      // Optimistic: remove immediately, mutate in the background
      const removed = localApplicants.find((a) => a.id === userId);
      setLocalApplicants((prev) => prev.filter((a) => a.id !== userId));
      setTogglingId(userId);

      const result = await action(userId);
      pendingRef.current.delete(userId);

      if (result.success) {
        router.refresh();
        setTogglingId(null);
      } else {
        // Roll back + surface error
        if (removed) setLocalApplicants((prev) => (prev.some((a) => a.id === userId) ? prev : [removed, ...prev]));
        setActionError(result.error ?? "Something went wrong.");
        setTogglingId(null);
      }
    },
    [router, localApplicants],
  );

  const handleApprove = useCallback(
    (userId: string) => {
      void runOptimistic(userId, (uid) => approveAdviserSignup(uid));
    },
    [runOptimistic],
  );

  const handleReject = useCallback(
    (userId: string) => {
      void runOptimistic(userId, (uid) => rejectAdviserSignup(uid));
    },
    [runOptimistic],
  );

  if (localApplicants.length === 0) {
    return (
      <EmptyState
        title="No pending approvals"
        description="All adviser signup requests have been reviewed."
      />
    );
  }

  return (
    <>
      {/* Error banner */}
      {actionError && (
        <div className="rounded-lg border border-error bg-error-lightest px-4 py-3 text-sm text-error-foreground">
          {actionError}
        </div>
      )}

      {/* Card list — mirrors the adviser User Requests queue */}
      <FadeIn>
        <div className="space-y-3">
          {localApplicants.map((a) => (
            <div key={a.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {a.first_name} {a.last_name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-text-muted">{a.email}</p>
                  <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-text-muted">
                    <span>Registered {dayAgeLabel(a.created_at)}</span>
                    {a.department_name && <span>Dept: {a.department_name}</span>}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border text-error hover:bg-error-lightest hover:text-error-foreground"
                    onClick={() => handleReject(a.id)}
                    disabled={togglingId === a.id}
                  >
                    {togglingId === a.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Reject
                  </Button>
                  <Button size="sm" onClick={() => handleApprove(a.id)} disabled={togglingId === a.id}>
                    {togglingId === a.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Approve
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </FadeIn>
    </>
  );
}