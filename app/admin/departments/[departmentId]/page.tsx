"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Folder } from "lucide-react";
import {
  StatusBadge,
  AccountStatusBadge,
  RoleBadge,
} from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPHP } from "@/lib/format";

// ─── Mock department lookup ────────────────────────────────────────
const MOCK_DEPARTMENTS: Record<
  string,
  { id: string; name: string; code: string; is_active: boolean }
> = {
  "dept-1": {
    id: "dept-1",
    name: "College of Computer Studies",
    code: "CCS",
    is_active: true,
  },
  "dept-2": {
    id: "dept-2",
    name: "College of Education",
    code: "EDU",
    is_active: true,
  },
  "dept-3": {
    id: "dept-3",
    name: "College of Business Administration",
    code: "CBA",
    is_active: false,
  },
};

const MOCK_USERS: Record<
  string,
  Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    account_status: string;
  }>
> = {
  "dept-1": [
    {
      id: "u1",
      first_name: "Juan",
      last_name: "Dela Cruz",
      email: "juan@mabini.edu.ph",
      role: "adviser",
      account_status: "active",
    },
    {
      id: "u2",
      first_name: "Maria",
      last_name: "Santos",
      email: "maria@mabini.edu.ph",
      role: "treasurer",
      account_status: "active",
    },
    {
      id: "u3",
      first_name: "Jose",
      last_name: "Rizal",
      email: "jose@mabini.edu.ph",
      role: "treasurer",
      account_status: "pending_approval",
    },
  ],
  "dept-2": [
    {
      id: "u4",
      first_name: "Pedro",
      last_name: "Reyes",
      email: "pedro@mabini.edu.ph",
      role: "adviser",
      account_status: "active",
    },
  ],
  "dept-3": [],
};

const MOCK_EVENTS: Record<
  string,
  Array<{ id: string; name: string; status: string; budget_total: number; spent: number }>
> = {
  "dept-1": [
    { id: "e1", name: "Tech Summit 2026", status: "open", budget_total: 50000, spent: 12500 },
    { id: "e2", name: "Hackathon Night", status: "archived", budget_total: 20000, spent: 18750 },
  ],
  "dept-2": [
    { id: "e3", name: "Education Week", status: "open", budget_total: 30000, spent: 0 },
  ],
  "dept-3": [],
};

const MOCK_REPORTS: Record<
  string,
  Array<{ id: string; fs_document_number: string; status: string; event_name: string }>
> = {
  "dept-1": [
    {
      id: "r1",
      fs_document_number: "FS-CCS-2026-00001",
      status: "approved",
      event_name: "Hackathon Night",
    },
  ],
  "dept-2": [],
  "dept-3": [],
};

const MOCK_AUDIT: Record<
  string,
  Array<{ id: string; action: string; target_type: string; actor: string; created_at: string }>
> = {
  "dept-1": [
    {
      id: "a1",
      action: "user.approved",
      target_type: "user",
      actor: "Admin",
      created_at: "2026-07-10T08:00:00Z",
    },
    {
      id: "a2",
      action: "event.created",
      target_type: "event",
      actor: "Maria Santos",
      created_at: "2026-07-12T10:30:00Z",
    },
  ],
  "dept-2": [],
  "dept-3": [],
};

const TABS = ["Events", "Reports", "Audit Logs", "Users"] as const;
type Tab = (typeof TABS)[number];

export default function DepartmentDetail() {
  const params = useParams();
  const deptId = params.departmentId as string;
  const dept = MOCK_DEPARTMENTS[deptId];

  const [activeTab, setActiveTab] = useState<Tab>("Users");
  const [users, setUsers] = useState(
    MOCK_USERS[deptId as keyof typeof MOCK_USERS] ?? [],
  );

  if (!dept) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          href="/admin/departments"
          className="text-sm text-text-muted hover:text-text-primary"
        >
          &larr; Back to departments
        </Link>
        <EmptyState
          title="Department not found"
          description="This department may have been removed."
        />
      </div>
    );
  }

  const handleToggleUserStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              account_status:
                u.account_status === "active" ? "deactivated" : "active",
            }
          : u,
      ),
    );
  };

  return (
    <div className="flex flex-col gap-8 pb-24 md:pb-0">
      {/* Back link */}
      <Link
        href="/admin/departments"
        className="text-sm text-text-muted hover:text-text-primary"
      >
        &larr; Back to departments
      </Link>

      {/* Department header — compact hierarchy */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold leading-6 text-text-primary md:text-2xl">
            {dept.name}
          </h1>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-text-muted">
            {dept.code}
          </p>
        </div>
        <StatusBadge variant={dept.is_active ? "success" : "neutral"}>
          {dept.is_active ? "Active" : "Inactive"}
        </StatusBadge>
      </div>

      {/* Tabs — scrollable on mobile */}
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
      {activeTab === "Users" && (
        <UsersTab users={users} onToggleStatus={handleToggleUserStatus} />
      )}
      {activeTab === "Events" && (
        <EventsTab events={MOCK_EVENTS[deptId as keyof typeof MOCK_EVENTS] ?? []} />
      )}
      {activeTab === "Reports" && (
        <ReportsTab reports={MOCK_REPORTS[deptId as keyof typeof MOCK_REPORTS] ?? []} />
      )}
      {activeTab === "Audit Logs" && (
        <AuditTab logs={MOCK_AUDIT[deptId as keyof typeof MOCK_AUDIT] ?? []} />
      )}
    </div>
  );
}

// ─── Tab: Users ────────────────────────────────────────────────────

function UsersTab({
  users,
  onToggleStatus,
}: {
  users: Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    account_status: string;
  }>;
  onToggleStatus: (userId: string) => void;
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
              <tr key={user.id} className="border-b border-border last:border-0">
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
                      className="rounded-full border border-error bg-surface px-3 py-1 text-xs font-medium text-error transition-colors hover:bg-error-lightest"
                    >
                      Deactivate
                    </button>
                  ) : user.account_status === "deactivated" ? (
                    <button
                      onClick={() => onToggleStatus(user.id)}
                      className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-primary transition-colors hover:bg-surface-tertiary"
                    >
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
          <div
            key={user.id}
            className="rounded-xl border border-border-strong bg-surface p-4"
          >
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
                    className="rounded-full border border-error bg-surface px-3 py-1 text-xs font-medium text-error transition-colors hover:bg-error-lightest"
                  >
                    Deactivate
                  </button>
                ) : user.account_status === "deactivated" ? (
                  <button
                    onClick={() => onToggleStatus(user.id)}
                    className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-primary transition-colors hover:bg-surface-tertiary"
                  >
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

function EventsTab({
  events,
}: {
  events: Array<{
    id: string;
    name: string;
    status: string;
    budget_total: number;
    spent: number;
  }>;
}) {
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
      {/* Web: folder cards */}
      <div className="hidden grid-cols-1 gap-x-5 gap-y-8 sm:grid md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {events.map((event) => {
          const isOpen = event.status === "open";
          return (
            <div
              key={event.id}
              className="mx-auto flex h-[180px] w-full max-w-[280px] flex-col rounded-xl border border-border-strong bg-surface p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="min-w-0 text-base font-semibold leading-6 text-text-primary line-clamp-2">
                  {event.name}
                </h3>
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    isOpen ? "bg-success-light text-success" : "bg-accent-light text-accent"
                  }`}
                >
                  <Folder className="h-4 w-4" />
                </div>
              </div>

              <p
                className={`mt-2 text-xs font-medium uppercase tracking-wide ${
                  isOpen ? "text-success" : "text-text-muted"
                }`}
              >
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

      {/* Mobile: folder card stack */}
      <div className="flex flex-col gap-4 md:hidden">
        {events.map((event) => {
          const isOpen = event.status === "open";
          return (
            <div
              key={event.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border-strong bg-surface p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-text-primary">
                  {event.name}
                </p>
                <p
                  className={`mt-0.5 text-xs font-medium uppercase tracking-wide ${
                    isOpen ? "text-success" : "text-text-muted"
                  }`}
                >
                  {isOpen ? "Open" : "Archived"}
                </p>
                <p className="mt-2 text-[11px] leading-4 text-text-muted">
                  {formatPHP(event.budget_total)} · {formatPHP(event.spent)} spent
                </p>
              </div>
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  isOpen ? "bg-success-light text-success" : "bg-accent-light text-accent"
                }`}
              >
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

function ReportsTab({
  reports,
}: {
  reports: Array<{
    id: string;
    fs_document_number: string;
    status: string;
    event_name: string;
  }>;
}) {
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
      {/* Web: folder cards */}
      <div className="hidden grid-cols-1 gap-x-5 gap-y-8 sm:grid md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {reports.map((report) => (
          <div
            key={report.id}
            className="mx-auto flex h-[180px] w-full max-w-[280px] flex-col rounded-xl border border-border-strong bg-surface p-6"
          >
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

      {/* Mobile: folder card stack */}
      <div className="flex flex-col gap-4 md:hidden">
        {reports.map((report) => (
          <div
            key={report.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-border-strong bg-surface p-4"
          >
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

function AuditTab({
  logs,
}: {
  logs: Array<{
    id: string;
    action: string;
    target_type: string;
    actor: string;
    created_at: string;
  }>;
}) {
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
      {/* Desktop: table */}
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
              <tr key={log.id} className="border-b border-border last:border-0">
                <td className="px-6 py-3 font-medium text-text-primary">
                  {log.action}
                </td>
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

      {/* Mobile: stacked cards */}
      <div className="flex flex-col gap-4 md:hidden">
        {logs.map((log) => (
          <div
            key={log.id}
            className="rounded-xl border border-border-strong bg-surface p-4"
          >
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
