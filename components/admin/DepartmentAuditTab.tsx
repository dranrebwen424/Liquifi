"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, FileSearch, ListFilter, RotateCcw } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { auditLogView } from "@/lib/audit-log-view";
import { cn } from "@/lib/utils";

export type DepartmentAuditLog = {
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

export type DepartmentAuditActor = { id: string; name: string };

export function DepartmentAuditTab({
  logs,
  actors,
}: {
  logs: DepartmentAuditLog[];
  actors: DepartmentAuditActor[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [actorFilter, setActorFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Distinct categories derived from the mapper for the filter dropdown.
  const categories = useMemo(() => {
    const set = new Set(logs.map((log) => auditLogView(log.action, log.metadata_json).category));
    return Array.from(set).sort();
  }, [logs]);

  const { hasActiveFilters, filteredLogs } = useMemo(() => {
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
      hasActiveFilters:
        actorFilter !== "all" || categoryFilter !== "all" || !!fromDate || !!toDate,
      filteredLogs: list,
    };
  }, [logs, actorFilter, categoryFilter, fromDate, toDate]);

  if (logs.length === 0) {
    return (
      <EmptyState
        icon={<FileSearch aria-hidden="true" />}
        title="No audit logs"
        description="No actions have been recorded for this department."
      />
    );
  }

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
    <div className="flex flex-col gap-6 md:gap-4">
      <div className="flex items-center justify-between md:hidden">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Audit activity</h2>
          <p className="text-xs text-text-muted">
            {logs.length} record{logs.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          onClick={() => setFiltersOpen((open) => !open)}
          aria-label="Filter audit logs"
          aria-expanded={filtersOpen}
          aria-controls="audit-mobile-filters"
          className={`relative inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${
            hasActiveFilters
              ? "border-accent bg-accent text-accent-foreground"
              : "border-border bg-surface text-text-secondary hover:bg-surface-tertiary hover:text-text-primary"
          }`}
        >
          <ListFilter className="h-5 w-5" />
          {hasActiveFilters && (
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-accent" aria-hidden="true" />
          )}
        </button>
      </div>

      <div
        id="audit-mobile-filters"
        className={cn(
          "flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-card md:flex-row md:flex-wrap md:items-end md:gap-3 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none",
          filtersOpen ? "flex" : "hidden md:flex",
        )}
      >
        <label className="flex min-w-[180px] flex-col gap-1 text-xs font-medium text-text-secondary">
          Who (actor)
          <select
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            className="min-h-11 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary focus:border-accent focus:outline-none md:rounded-lg md:py-2"
          >
            <option value="all">All actors</option>
            {actors.map((a) => (
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
            className="min-h-11 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary focus:border-accent focus:outline-none md:rounded-lg md:py-2"
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
            className="min-h-11 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary focus:border-accent focus:outline-none md:rounded-lg md:py-2"
          />
        </label>

        <label className="flex min-w-[160px] flex-col gap-1 text-xs font-medium text-text-secondary">
          To date
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="min-h-11 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary focus:border-accent focus:outline-none md:rounded-lg md:py-2"
          />
        </label>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary md:w-auto md:rounded-lg md:py-2 md:mb-0.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

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
        <div className="flex flex-col gap-3 md:gap-2">
          {filteredLogs.map((log) => {
            const view = auditLogView(log.action, log.metadata_json);
            const Icon = view.icon;
            const isExpanded = expandedId === log.id;
            return (
              <div
                key={log.id}
                className="rounded-2xl border border-border bg-surface p-4 shadow-card transition-[transform,border-color] hover:border-border-strong active:scale-[0.99] md:rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg md:h-9 md:w-9 ${toneIcon(view.tone)}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text-primary">{view.label}</p>
                    <p className="truncate text-xs text-text-muted md:hidden">
                      {log.actor}
                      {log.actor_role && <span className="capitalize"> · {log.actor_role}</span>}
                    </p>
                    <p className="mt-1 text-xs text-text-muted md:mt-0 md:truncate">
                      <span className="md:hidden">{fmtDate(log.created_at)}</span>
                      <span className="hidden md:inline">
                        {log.actor}
                        {log.actor_role && <span className="capitalize"> · {log.actor_role}</span>}
                        <span className="mx-1.5">·</span>
                        {fmtDate(log.created_at)}
                      </span>
                    </p>
                  </div>
                  {view.details.length > 0 && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? "Hide details" : "Show details"}
                      className="shrink-0 rounded-md p-1 text-text-muted transition-colors hover:bg-surface-tertiary hover:text-text-primary md:h-8 md:w-8 md:p-1.5"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  )}
                </div>
                {isExpanded && (
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="text-sm text-text-secondary">{view.summary}</p>
                    <dl className="mt-2 space-y-1.5">
                      {view.details.map((d) => (
                        <div key={d.label} className="flex flex-col">
                          <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">{d.label}</dt>
                          <dd className="text-sm text-text-primary">{d.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}