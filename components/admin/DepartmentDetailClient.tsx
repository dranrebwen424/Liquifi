"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, CircleCheckBig, CircleMinus } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EventBrowser } from "@/components/events/EventBrowser";
import { ReportsOverview } from "@/components/reports/ReportsOverview";
import type { ReportOverviewItem } from "@/lib/report-overview";
import {
  DepartmentUsersTab,
  type DepartmentMemberSummary,
} from "@/components/admin/DepartmentUsersTab";
import {
  DepartmentAuditTab,
  type DepartmentAuditLog,
  type DepartmentAuditActor,
} from "@/components/admin/DepartmentAuditTab";
import { cn } from "@/lib/utils";

const TABS = ["Events", "Reports", "Users", "Audit Logs"] as const;
type Tab = (typeof TABS)[number];

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

type Props = {
  department: { id: string; name: string; code: string; is_active: boolean };
  events: Event[];
  reports: ReportOverviewItem[];
  users: DepartmentMemberSummary[];
  auditLogs: DepartmentAuditLog[];
  auditActors: DepartmentAuditActor[];
};

export function DepartmentDetailClient({
  department,
  events,
  reports,
  users,
  auditLogs,
  auditActors,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("Events");
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({
    Events: null,
    Reports: null,
    Users: null,
    "Audit Logs": null,
  });

  const counts: Record<Tab, number> = {
    Events: events.length,
    Reports: reports.length,
    Users: users.length,
    "Audit Logs": auditLogs.length,
  };

  const handleTabKeyDown = (tab: Tab, e: React.KeyboardEvent) => {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const index = TABS.indexOf(tab);
    const nextIndex =
      e.key === "Home" ? 0
      : e.key === "End" ? TABS.length - 1
      : e.key === "ArrowLeft" ? (index - 1 + TABS.length) % TABS.length
      : (index + 1) % TABS.length;
    const nextTab = TABS[nextIndex];
    setActiveTab(nextTab);
    tabRefs.current[nextTab]?.focus();
  };

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Back link */}
      <Link
        href="/admin/departments"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to departments
      </Link>

      {/* Identity surface */}
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-light text-accent">
          <Building2 className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold leading-7 text-text-primary md:text-2xl">
            {department.name}
          </h1>
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            {department.code}
          </p>
        </div>
        <StatusBadge
          icon={department.is_active ? CircleCheckBig : CircleMinus}
          variant={department.is_active ? "success" : "neutral"}
          label={department.is_active ? "Active" : "Inactive"}
        />
      </div>

      {/* Tablist — horizontally scrollable with arrow-key navigation */}
      <div
        role="tablist"
        aria-label="Department sections"
        className="-mx-4 overflow-x-auto px-4 scrollbar-hide md:mx-0 md:px-0"
      >
        <div className="flex gap-2 border-b border-border">
          {TABS.map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                ref={(el) => {
                  tabRefs.current[tab] = el;
                }}
                role="tab"
                id={`dept-tab-${tab.toLowerCase().replace(/\s+/g, "-")}`}
                aria-selected={active}
                aria-controls="dept-tabpanel"
                tabIndex={active ? 0 : -1}
                onClick={() => setActiveTab(tab)}
                onKeyDown={(e) => handleTabKeyDown(tab, e)}
                className={cn(
                  "shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "border-accent text-accent"
                    : "border-transparent text-text-secondary hover:text-text-primary",
                )}
              >
                {tab}
                <span
                  className={cn(
                    "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    active ? "bg-accent/10 text-accent" : "bg-surface-tertiary text-text-muted",
                  )}
                >
                  {counts[tab]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div id="dept-tabpanel" role="tabpanel" aria-labelledby={`dept-tab-${activeTab.toLowerCase().replace(/\s+/g, "-")}`}>
        {activeTab === "Events" && (
          <EventBrowser
            events={events}
            basePath={`/admin/departments/${department.id}/events`}
            emptyTitle="No events"
            emptyDescription="This department has no events yet."
          />
        )}
        {activeTab === "Reports" && (
          <ReportsOverview
            role="admin"
            items={reports}
            basePath={`/admin/departments/${department.id}/reports`}
            embedded
          />
        )}
        {activeTab === "Users" && (
          <DepartmentUsersTab departmentId={department.id} users={users} />
        )}
        {activeTab === "Audit Logs" && (
          <DepartmentAuditTab logs={auditLogs} actors={auditActors} />
        )}
      </div>
    </div>
  );
}