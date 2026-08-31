"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { EmptyState } from "@/components/ui/EmptyState";
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

// ─── Animation variants ──────────────────────────────────────────────

const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

const fadeUpItem = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 20, duration: 0.2 },
  },
};

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
    async (userId: string, action: (uid: string) => Promise<{ success: boolean; error?: string }>, isReject: boolean) => {
      // If reject, take the same instant path — the confirm was removed so the
      // row disappears on click; the server purge runs in the background.
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
      void runOptimistic(userId, (uid) => approveAdviserSignup(uid), false);
    },
    [runOptimistic],
  );

  const handleReject = useCallback(
    (userId: string) => {
      void runOptimistic(userId, (uid) => rejectAdviserSignup(uid), true);
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
      <AnimatePresence>
        {actionError && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-lg border border-error-light bg-error-lightest px-4 py-2 text-sm text-error"
          >
            {actionError}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Desktop: table */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="hidden overflow-x-auto rounded-xl border border-border-strong bg-surface md:block"
      >
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-text-muted">
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Email</th>
              <th className="px-6 py-3 font-medium">Department</th>
              <th className="px-6 py-3 font-medium">Applied</th>
              <th className="px-6 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {localApplicants.map((a) => (
              <tr
                key={a.id}
                className="border-b border-border transition-colors last:border-0 hover:bg-surface-secondary"
              >
                <td className="px-6 py-3 font-medium text-text-primary">
                  {a.first_name} {a.last_name}
                </td>
                <td className="px-6 py-3 text-text-secondary">{a.email}</td>
                <td className="px-6 py-3 text-text-secondary">
                  {a.department_name ?? "—"}
                </td>
                <td className="px-6 py-3 text-text-muted">
                  {new Date(a.created_at).toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="px-6 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleApprove(a.id)}
                      disabled={togglingId === a.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-[color,transform] hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {togglingId === a.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(a.id)}
                      disabled={togglingId === a.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-error bg-surface px-3 py-1.5 text-xs font-medium text-error transition-colors hover:bg-error-lightest disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {togglingId === a.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {/* Mobile: stacked cards */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-4 md:hidden"
      >
        {localApplicants.map((a) => (
          <motion.div
            key={a.id}
            variants={fadeUpItem}
            className="rounded-xl border border-border-strong bg-surface p-4"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">
                {a.first_name} {a.last_name}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">{a.email}</p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-secondary">
                <span>
                  Dept: {a.department_name ?? "—"}
                </span>
                <span>
                  {new Date(a.created_at).toLocaleDateString("en-PH", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => handleApprove(a.id)}
                disabled={togglingId === a.id}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-accent px-3 py-2 text-xs font-medium text-accent-foreground transition-[color,transform] hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {togglingId === a.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Approve
              </button>
              <button
                onClick={() => handleReject(a.id)}
                disabled={togglingId === a.id}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-error bg-surface px-3 py-2 text-xs font-medium text-error transition-colors hover:bg-error-lightest disabled:cursor-not-allowed disabled:opacity-50"
              >
                {togglingId === a.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" />
                )}
                Reject
              </button>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </>
  );
}
