"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Folder, Loader2 } from "lucide-react";
import {
  StatusBadge,
  AccountStatusBadge,
  RoleBadge,
} from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPHP } from "@/lib/format";
import { setUserAccountStatus } from "@/actions/departments";
import type { AccountStatus } from "@/types";
import gsap from "gsap";

// ─── Types ───────────────────────────────────────────────────────────

type Department = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
};

type User = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  account_status: string;
};

type Event = {
  id: string;
  name: string;
  status: string;
  budget_total: number;
  spent: number;
};

type Report = {
  id: string;
  fs_document_number: string;
  status: string;
  event_name: string;
};

type AuditLog = {
  id: string;
  action: string;
  target_type: string;
  actor: string;
  created_at: string;
};

type Props = {
  department: Department;
  initialUsers: User[];
  mockEvents?: Event[];
  mockReports?: Report[];
  mockAuditLogs?: AuditLog[];
};

const TABS = ["Users", "Events", "Reports", "Audit Logs"] as const;
type Tab = (typeof TABS)[number];

export function DepartmentDetailClient({
  department,
  initialUsers,
  mockEvents = [],
  mockReports = [],
  mockAuditLogs = [],
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("Users");
  const [users, setUsers] = useState(initialUsers);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState("");

  const handleToggleStatus = useCallback(async (userId: string) => {
    setTogglingId(userId);
    setToggleError("");
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    const newStatus: AccountStatus =
      user.account_status === "active" ? "deactivated" : "active";

    const result = await setUserAccountStatus(userId, department.id, newStatus);
    if (result.success) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, account_status: newStatus } : u,
        ),
      );
      router.refresh();
    } else {
      setToggleError(result.error);
    }
    setTogglingId(null);
  }, [users, department.id, router]);

  // ─── Micro-interaction: tab content stagger ───────────────────────
  const tabContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tabContentRef.current) return;
    const items = tabContentRef.current.children;
    if (items.length > 0) {
      gsap.fromTo(
        items,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, stagger: 0.04, duration: 0.3, ease: "power2.out" },
      );
    }
  }, [activeTab]);

  return (
    <div className="flex flex-col gap-8 pb-24 md:pb-0">
      {/* Back link */}
      <Link
        href="/admin/departments"
        className="text-sm text-text-muted hover:text-text-primary"
      >
        &larr; Back to departments
      </Link>

      {/* Department header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold leading-6 text-text-primary md:text-2xl">
            {department.name}
          </h1>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-text-muted">
            {department.code}
          </p>
        </div>
        <StatusBadge variant={department.is_active ? "success" : "neutral"}>
          {department.is_active ? "Active" : "Inactive"}
        </StatusBadge>
      </div>

      {toggleError && (
        <p className="rounded-lg border border-error-light bg-error-lightest px-4 py-2 text-sm text-error">
          {toggleError}
        </p>
      )}

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="-mb-px flex gap-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "border-accent text-accent"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div key={activeTab} ref={tabContentRef}>
        {activeTab === "Users" && (
          <UsersTab
            users={users}
            onToggleStatus={handleToggleStatus}
            togglingId={togglingId}
          />
        )}
        {activeTab === "Events" && (
          <EventsTab events={mockEvents} />
        )}
        {activeTab === "Reports" && (
          <ReportsTab reports={mockReports} />
        )}
        {activeTab === "Audit Logs" && (
          <AuditTab logs={mockAuditLogs} />
        )}
      </div>
    </div>
  );
}

// ─── Tab: Users ────────────────────────────────────────────────────

function UsersTab({
  users,
  onToggleStatus,
  togglingId,
}: {
  users: User[];
  onToggleStatus: (userId: string) => void;
  togglingId: string | null;
}) {
  if (users.length === 0) {
    return (
      <EmptyState
        title="No users"
        description="No users are associated with this department yet."
      />
    );
  }

  return (
    <>
      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-xl border border-border-strong bg-surface md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-text-muted">
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Email</th>
              <th className="px-6 py-3 font-medium">Role</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-border transition-colors last:border-0 hover:bg-surface-secondary">
                <td className="px-6 py-3 font-medium text-text-primary">
                  {user.first_name} {user.last_name}
                </td>
                <td className="px-6 py-3 text-text-secondary">{user.email}</td>
                <td className="px-6 py-3">
                  <RoleBadge role={user.role} />
                </td>
                <td className="px-6 py-3">
                  <AccountStatusBadge status={user.account_status} />
                </td>
                <td className="px-6 py-3 text-right">
                  {user.account_status === "active" ? (
                    <button
                      onClick={() => onToggleStatus(user.id)}
                      disabled={togglingId === user.id}
                      className="inline-flex items-center gap-1 rounded-full border border-error bg-surface px-3 py-1 text-xs font-medium text-error transition-colors hover:bg-error-lightest disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {togglingId === user.id && <Loader2 className="h-3 w-3 animate-spin" />}
                      Deactivate
                    </button>
                  ) : user.account_status === "deactivated" ? (
                    <button
                      onClick={() => onToggleStatus(user.id)}
                      disabled={togglingId === user.id}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-primary transition-colors hover:bg-surface-tertiary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {togglingId === user.id && <Loader2 className="h-3 w-3 animate-spin" />}
                      Reactivate
                    </button>
                  ) : (
                    <span className="text-xs text-text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <div className="flex flex-col gap-4 md:hidden">
        {users.map((user) => (
          <div key={user.id} className="rounded-xl border border-border-strong bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary">
                  {user.first_name} {user.last_name}
                </p>
                <p className="mt-0.5 text-xs text-text-muted">{user.email}</p>
              </div>
              <div className="shrink-0">
                {user.account_status === "active" ? (
                  <button
                    onClick={() => onToggleStatus(user.id)}
                    disabled={togglingId === user.id}
                    className="inline-flex items-center gap-1 rounded-full border border-error bg-surface px-3 py-1 text-xs font-medium text-error transition-colors hover:bg-error-lightest disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {togglingId === user.id && <Loader2 className="h-3 w-3 animate-spin" />}
                    Deactivate
                  </button>
                ) : user.account_status === "deactivated" ? (
                  <button
                    onClick={() => onToggleStatus(user.id)}
                    disabled={togglingId === user.id}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-primary transition-colors hover:bg-surface-tertiary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {togglingId === user.id && <Loader2 className="h-3 w-3 animate-spin" />}
                    Reactivate
                  </button>
                ) : (
                  <span className="text-xs text-text-muted">—</span>
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <RoleBadge role={user.role} />
              <AccountStatusBadge status={user.account_status} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Tab: Events ───────────────────────────────────────────────────

function EventsTab({ events }: { events: Event[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="No events"
        description="This department has no events yet."
      />
    );
  }

  return (
    <>
      <div className="hidden grid-cols-1 gap-x-5 gap-y-8 sm:grid md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {events.map((event) => {
          const isOpen = event.status === "open";
          return (
            <div key={event.id} className="mx-auto flex h-[180px] w-full max-w-[280px] flex-col rounded-xl border border-border-strong bg-surface p-6 transition-all duration-200 hover:border-accent hover:shadow-lg hover:scale-[1.02]">
              <div className="flex items-start justify-between gap-3">
                <h3 className="min-w-0 text-base font-semibold leading-6 text-text-primary line-clamp-2">
                  {event.name}
                </h3>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isOpen ? "bg-success-light text-success" : "bg-accent-light text-accent"}`}>
                  <Folder className="h-4 w-4" />
                </div>
              </div>
              <p className={`mt-2 text-xs font-medium uppercase tracking-wide ${isOpen ? "text-success" : "text-text-muted"}`}>
                {isOpen ? "Open" : "Archived"}
              </p>
              <div className="mt-auto flex items-end justify-between gap-2 pt-4 text-[11px] leading-4 text-text-muted">
                <span>Budget: {formatPHP(event.budget_total)}</span>
                <span>Spent: {formatPHP(event.spent)}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-col gap-4 md:hidden">
        {events.map((event) => {
          const isOpen = event.status === "open";
          return (
            <div key={event.id} className="flex items-start justify-between gap-3 rounded-xl border border-border-strong bg-surface p-4">
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-text-primary">{event.name}</p>
                <p className={`mt-0.5 text-xs font-medium uppercase tracking-wide ${isOpen ? "text-success" : "text-text-muted"}`}>
                  {isOpen ? "Open" : "Archived"}
                </p>
                <p className="mt-2 text-[11px] leading-4 text-text-muted">
                  {formatPHP(event.budget_total)} · {formatPHP(event.spent)} spent
                </p>
              </div>
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isOpen ? "bg-success-light text-success" : "bg-accent-light text-accent"}`}>
                <Folder className="h-4 w-4" />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Tab: Reports ──────────────────────────────────────────────────

function ReportsTab({ reports }: { reports: Report[] }) {
  if (reports.length === 0) {
    return (
      <EmptyState
        title="No reports"
        description="No reports have been generated for this department."
      />
    );
  }

  return (
    <>
      <div className="hidden grid-cols-1 gap-x-5 gap-y-8 sm:grid md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {reports.map((report) => (
          <div key={report.id} className="mx-auto flex h-[180px] w-full max-w-[280px] flex-col rounded-xl border border-border-strong bg-surface p-6 transition-all duration-200 hover:border-accent hover:shadow-lg hover:scale-[1.02]">
            <div className="flex items-start justify-between gap-3">
              <h3 className="min-w-0 truncate text-base font-semibold text-text-primary">
                {report.fs_document_number}
              </h3>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-light text-accent">
                <Folder className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-xs text-text-muted">{report.event_name}</p>
            <div className="mt-auto pt-4">
              <StatusBadge
                variant={
                  report.status === "approved"
                    ? "success"
                    : report.status === "rejected"
                      ? "error"
                      : "warning"
                }
              >
                {report.status.replace(/_/g, " ")}
              </StatusBadge>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-4 md:hidden">
        {reports.map((report) => (
          <div key={report.id} className="flex items-start justify-between gap-3 rounded-xl border border-border-strong bg-surface p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-text-primary">
                {report.fs_document_number}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">{report.event_name}</p>
              <div className="mt-2">
                <StatusBadge
                  variant={
                    report.status === "approved"
                      ? "success"
                      : report.status === "rejected"
                        ? "error"
                        : "warning"
                  }
                >
                  {report.status.replace(/_/g, " ")}
                </StatusBadge>
              </div>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-light text-accent">
              <Folder className="h-4 w-4" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Tab: Audit Logs ───────────────────────────────────────────────

function AuditTab({ logs }: { logs: AuditLog[] }) {
  if (logs.length === 0) {
    return (
      <EmptyState
        title="No audit logs"
        description="No actions have been recorded for this department."
      />
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-border-strong bg-surface md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-text-muted">
              <th className="px-6 py-3 font-medium">Action</th>
              <th className="px-6 py-3 font-medium">Type</th>
              <th className="px-6 py-3 font-medium">Actor</th>
              <th className="px-6 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-border transition-colors last:border-0 hover:bg-surface-secondary">
                <td className="px-6 py-3 font-medium text-text-primary">{log.action}</td>
                <td className="px-6 py-3 text-text-secondary">{log.target_type}</td>
                <td className="px-6 py-3 text-text-secondary">{log.actor}</td>
                <td className="px-6 py-3 text-text-muted">
                  {new Date(log.created_at).toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-4 md:hidden">
        {logs.map((log) => (
          <div key={log.id} className="rounded-xl border border-border-strong bg-surface p-4">
            <p className="text-sm font-semibold text-text-primary">{log.action}</p>
            <p className="mt-1 text-xs text-text-muted">
              {log.target_type} · {log.actor}
            </p>
            <p className="mt-2 text-xs text-text-secondary">
              {new Date(log.created_at).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
