"use client";

import { useState, useCallback, useMemo, Fragment } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Folder, Loader2, CircleCheckBig, CircleMinus, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  StatusBadge,
  AccountStatusBadge,
  RoleBadge,
  reportStatusMap,
} from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { EventBrowser } from "@/components/events/EventBrowser";
import { staggerContainer, fadeUpItem } from "@/lib/motion-variants";
import { setUserAccountStatus } from "@/actions/departments";
import { auditLogView } from "@/lib/audit-log-view";
import type { AccountStatus } from "@/types";

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
  status: "open" | "archived";
  budget_total: number;
  total_spent: number;
  num_entries: number;
  created_by_name: string;
  created_at: string;
};

type Report = {
  id: string;
  event_id: string;
  fs_document_number: string;
  status: string;
  event_name: string;
};

type AuditLog = {
  id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  actor_id: string | null;
  actor: string;
  actor_role: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
};

type AuditActor = { id: string; name: string };

type Props = {
  department: Department;
  initialUsers: User[];
  events?: Event[];
  reports?: Report[];
  auditLogs?: AuditLog[];
  auditActors?: AuditActor[];
};

const TABS = ["Users", "Events", "Reports", "Audit Logs"] as const;
type Tab = (typeof TABS)[number];

export function DepartmentDetailClient({
  department,
  initialUsers,
  events = [],
  reports = [],
  auditLogs = [],
  auditActors = [],
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
        <StatusBadge
          icon={CircleCheckBig}
          variant={department.is_active ? "success" : "neutral"}
          label={department.is_active ? "Active" : "Inactive"}
        />
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
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
        >
          {activeTab === "Users" && (
            <UsersTab
              users={users}
              onToggleStatus={handleToggleStatus}
              togglingId={togglingId}
            />
          )}
          {activeTab === "Events" && (
            <EventBrowser
              events={events}
              basePath={`/admin/departments/${department.id}/events`}
              emptyTitle="No events"
              emptyDescription="This department has no events yet."
            />
          )}
          {activeTab === "Reports" && (
            <ReportsTab departmentId={department.id} reports={reports} />
          )}
          {activeTab === "Audit Logs" && (
            <AuditTab logs={auditLogs} actors={auditActors} />
          )}
        </motion.div>
      </AnimatePresence>
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

// ─── Tab: Reports ──────────────────────────────────────────────────

function ReportsTab({
  departmentId,
  reports,
}: {
  departmentId: string;
  reports: Report[];
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
      <div className="hidden grid-cols-1 gap-x-5 gap-y-8 sm:grid md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {reports.map((report) => (
          <Link
            key={report.id}
            href={`/admin/departments/${departmentId}/reports/${report.event_id}`}
            className="mx-auto flex h-[180px] w-full max-w-[280px] flex-col rounded-xl border border-border-strong bg-surface p-6 transition-all duration-200 hover:border-accent hover:shadow-lg hover:scale-[1.02]"
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
                icon={reportStatusMap[report.status]?.icon ?? CircleMinus}
                variant={reportStatusMap[report.status]?.variant ?? "neutral"}
                label={reportStatusMap[report.status]?.label ?? report.status}
              />
            </div>
          </Link>
        ))}
      </div>
      <div className="flex flex-col gap-4 md:hidden">
        {reports.map((report) => (
          <Link
            key={report.id}
            href={`/admin/departments/${departmentId}/reports/${report.event_id}`}
            className="flex items-start justify-between gap-3 rounded-xl border border-border-strong bg-surface p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-text-primary">
                {report.fs_document_number}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">{report.event_name}</p>
              <div className="mt-2">
                <StatusBadge
                  icon={reportStatusMap[report.status]?.icon ?? CircleMinus}
                  variant={reportStatusMap[report.status]?.variant ?? "neutral"}
                  label={reportStatusMap[report.status]?.label ?? report.status}
                />
              </div>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-light text-accent">
              <Folder className="h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

// ─── Tab: Audit Logs ───────────────────────────────────────────────

function AuditTab({ logs, actors }: { logs: AuditLog[]; actors: AuditActor[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actorFilter, setActorFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  if (logs.length === 0) {
    return (
      <EmptyState
        title="No audit logs"
        description="No actions have been recorded for this department."
      />
    );
  }

  // Distinct categories derived from the mapper for the filter dropdown.
  const categories = useMemo(() => {
    const set = new Set(logs.map((log) => auditLogView(log.action, log.metadata_json).category));
    return Array.from(set).sort();
  }, [logs]);

  const { filterActorList, hasActiveFilters, filteredLogs } = useMemo(() => {
    const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const to = toDate ? new Date(`${toDate}T23:59:59`) : null;
    const list = logs.filter((log) => {
      if (actorFilter !== "all" && (log.actor_id ?? "unknown") !== actorFilter) return false;
      if (categoryFilter !== "all" && auditLogView(log.action, log.metadata_json).category !== categoryFilter)
        return false;
      if (from) {
        const t = new Date(log.created_at).getTime();
        if (t < from.getTime()) return false;
      }
      if (to) {
        const t = new Date(log.created_at).getTime();
        if (t > to.getTime()) return false;
      }
      return true;
    });
    return {
      filterActorList: actors,
      hasActiveFilters:
        actorFilter !== "all" || categoryFilter !== "all" || !!fromDate || !!toDate,
      filteredLogs: list,
    };
  }, [logs, actors, actorFilter, categoryFilter, fromDate, toDate]);

  const clearFilters = () => {
    setActorFilter("all");
    setCategoryFilter("all");
    setFromDate("");
    setToDate("");
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const FilterBar = (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
      <label className="flex min-w-[180px] flex-col gap-1 text-xs font-medium text-text-secondary">
        Who (actor)
        <select
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
        >
          <option value="all">All actors</option>
          {filterActorList.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-[150px] flex-col gap-1 text-xs font-medium text-text-secondary">
        Category
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-[160px] flex-col gap-1 text-xs font-medium text-text-secondary">
        From date
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
        />
      </label>

      <label className="flex min-w-[160px] flex-col gap-1 text-xs font-medium text-text-secondary">
        To date
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
        />
      </label>

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary md:mb-0.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Clear
        </button>
      )}
    </div>
  );

  const toneIcon = (tone: string) => {
    switch (tone) {
      case "success": return "bg-success-light text-success";
      case "error": return "bg-error-light text-error";
      case "warning": return "bg-warning-light text-warning";
      case "neutral": return "bg-neutral-light text-neutral";
      default: return "bg-info-light text-info";
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {FilterBar}

      {hasActiveFilters && (
        <p className="text-xs text-text-muted">
          Showing {filteredLogs.length} of {logs.length} log{logs.length === 1 ? "" : "s"}.
        </p>
      )}

      {filteredLogs.length === 0 ? (
        <EmptyState
          title="No matching logs"
          description="No audit logs match the current filters."
        />
      ) : (
        <>
          {/* Desktop: table */}
          <div className="hidden overflow-x-auto rounded-xl border border-border-strong bg-surface md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-text-muted">
                  <th className="px-6 py-3 font-medium">Action</th>
                  <th className="px-6 py-3 font-medium">Actor</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const view = auditLogView(log.action, log.metadata_json);
                  const Icon = view.icon;
                  const isExpanded = expandedId === log.id;
                  return (
                    <Fragment key={log.id}>
                      <tr className="border-b border-border transition-colors last:border-0 hover:bg-surface-secondary">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${toneIcon(view.tone)}`}>
                              <Icon className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="font-medium text-text-primary">{view.label}</p>
                              <p className="truncate text-xs text-text-muted">{view.summary}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex flex-col">
                            <span className="whitespace-nowrap font-medium text-text-primary">{log.actor}</span>
                            {log.actor_role && (
                              <span className="text-xs capitalize text-text-muted">{log.actor_role}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-text-muted">{fmtDate(log.created_at)}</td>
                        <td className="px-4 py-3 text-right">
                          {view.details.length > 0 && (
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : log.id)}
                              aria-label={isExpanded ? "Hide details" : "Show details"}
                              className="rounded-md p-1 text-text-muted transition-colors hover:bg-surface-tertiary hover:text-text-primary"
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && view.details.length > 0 && (
                        <tr className="border-b border-border bg-surface-secondary/50 last:border-0">
                          <td colSpan={4} className="px-6 py-4">
                            <table className="w-full text-left text-sm">
                              <tbody>
                                {view.details.map((d) => (
                                  <tr key={d.label} className="border-t border-border/60 first:border-t-0">
                                    <td className="w-44 py-1.5 pr-4 text-xs font-medium uppercase tracking-wide text-text-muted">{d.label}</td>
                                    <td className="py-1.5 text-text-secondary">{d.value}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked cards */}
          <div className="flex flex-col gap-4 md:hidden">
            {filteredLogs.map((log) => {
              const view = auditLogView(log.action, log.metadata_json);
              const Icon = view.icon;
              const isExpanded = expandedId === log.id;
              return (
                <div key={log.id} className="rounded-xl border border-border-strong bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneIcon(view.tone)}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-primary">{view.label}</p>
                        <p className="text-xs text-text-muted">
                          {log.actor}
                          {log.actor_role && <span className="capitalize"> · {log.actor_role}</span>}
                        </p>
                      </div>
                    </div>
                    {view.details.length > 0 && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        aria-label={isExpanded ? "Hide details" : "Show details"}
                        className="shrink-0 rounded-md p-1 text-text-muted transition-colors hover:bg-surface-tertiary hover:text-text-primary"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-text-secondary">{view.summary}</p>
                  <p className="mt-1 text-xs text-text-muted">{fmtDate(log.created_at)}</p>
                  {isExpanded && view.details.length > 0 && (
                    <dl className="mt-3 space-y-1.5 rounded-lg border border-border bg-surface-secondary/50 p-3">
                      {view.details.map((d) => (
                        <div key={d.label} className="flex flex-col">
                          <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">{d.label}</dt>
                          <dd className="text-sm text-text-primary">{d.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
