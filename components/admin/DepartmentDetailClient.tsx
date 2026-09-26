"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, FileText, Search, ScrollText, Users } from "lucide-react";
import LottiePlayer from "@/components/LottiePlayer";
import { DepartmentEventsTab } from "@/components/admin/DepartmentEventsTab";
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
export type DepartmentTab = (typeof TABS)[number];
const TAB_ICONS = {
  Events: CalendarDays,
  Reports: FileText,
  Users,
  "Audit Logs": ScrollText,
} as const;

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
  initialTab?: DepartmentTab;
};

export function DepartmentDetailClient({
  department,
  events,
  reports,
  users,
  auditLogs,
  auditActors,
  initialTab = "Events",
}: Props) {
  const [activeTab, setActiveTab] = useState<DepartmentTab>(initialTab);
  const [userQuery, setUserQuery] = useState("");
  const desktopTabRefs = useRef<Record<DepartmentTab, HTMLButtonElement | null>>({
    Events: null,
    Reports: null,
    Users: null,
    "Audit Logs": null,
  });
  const mobileTabRefs = useRef<Record<DepartmentTab, HTMLButtonElement | null>>({
    Events: null,
    Reports: null,
    Users: null,
    "Audit Logs": null,
  });

  const counts: Record<DepartmentTab, number> = {
    Events: events.length,
    Reports: reports.length,
    Users: users.length,
    "Audit Logs": auditLogs.length,
  };

  const handleTabKeyDown = (
    tab: DepartmentTab,
    e: React.KeyboardEvent,
    refs: React.RefObject<Record<DepartmentTab, HTMLButtonElement | null>>,
  ) => {
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
    refs.current[nextTab]?.focus();
  };

  return (
    <div className="flex flex-col gap-6 pb-[calc(4rem+1px+var(--safe-bottom))] md:pb-10">
      <div className="relative flex min-h-11 items-center justify-center md:hidden">
        <Link
          href="/admin/departments"
          className="absolute left-0 flex h-11 w-11 items-center justify-center rounded-full text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Back to departments"
        >
          <ArrowLeft className="h-6 w-6" aria-hidden="true" />
        </Link>
        <p className="text-lg font-medium text-text-primary">Department Detail</p>
      </div>

      <Link
        href="/admin/departments"
        className="hidden w-fit items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text-primary md:inline-flex"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to departments
      </Link>

      <div className="relative min-h-28 overflow-hidden rounded-xl bg-surface-inverse px-6 py-5 shadow-card md:min-h-40 md:px-8 md:py-6">
        <div className="relative z-10 max-w-[75%] md:max-w-[70%]">
          <h1 className="text-sm font-bold leading-5 text-text-inverse md:text-2xl md:leading-8">
            {department.name}
          </h1>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-text-inverse md:text-sm">
            {department.code}
          </p>
          <span className="sr-only">{department.is_active ? "Active department" : "Inactive department"}</span>
        </div>
        <LottiePlayer
          src="/Loudspeaker.json"
          className="absolute right-0 top-1/2 h-28 w-36 -translate-y-1/2 md:right-4 md:h-32 md:w-40"
        />
      </div>

      {activeTab === "Users" && (
        <label className="relative block">
          <span className="sr-only">Search users</span>
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <input
            id="department-user-search"
            name="department-user-search"
            type="search"
            value={userQuery}
            onChange={(event) => setUserQuery(event.target.value)}
            placeholder="Search users"
            className="h-11 w-full rounded-full border border-border-strong bg-surface pl-11 pr-4 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </label>
      )}

      <div
        role="tablist"
        aria-label="Department sections"
        className="hidden overflow-x-auto scrollbar-hide md:block"
      >
        <div className="flex gap-2 border-b border-border">
          {TABS.map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                ref={(el) => {
                  desktopTabRefs.current[tab] = el;
                }}
                role="tab"
                id={`dept-tab-${tab.toLowerCase().replace(/\s+/g, "-")}`}
                aria-selected={active}
                aria-controls="dept-tabpanel"
                tabIndex={active ? 0 : -1}
                onClick={() => setActiveTab(tab)}
                onKeyDown={(e) => handleTabKeyDown(tab, e, desktopTabRefs)}
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

      <div
        id="dept-tabpanel"
        role="tabpanel"
        aria-labelledby={`dept-tab-${activeTab.toLowerCase().replace(/\s+/g, "-")}`}
      >
        {activeTab === "Events" && (
          <DepartmentEventsTab
            departmentId={department.id}
            events={events}
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
          <DepartmentUsersTab departmentId={department.id} users={users} query={userQuery} />
        )}
        {activeTab === "Audit Logs" && (
          <DepartmentAuditTab logs={auditLogs} actors={auditActors} />
        )}
      </div>

      {/* Reserve the tab height and stable safe area once, on the page wrapper.
          Only bottom follows Chrome's dynamic inset, so retracting its browser
          bar does not resize the tabs or the document padding. The 36px fallback
          covers browsers without safe-area-max-inset-bottom support.
          SidebarShell supplies the remaining 24px of space after the content. */}
      <div
        role="tablist"
        aria-label="Department sections"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-surface pb-[var(--safe-bottom)] shadow-card md:hidden"
      >
        {TABS.map((tab) => {
          const active = activeTab === tab;
          const Icon = TAB_ICONS[tab];
          return (
            <button
              key={tab}
              ref={(el) => {
                mobileTabRefs.current[tab] = el;
              }}
              type="button"
              role="tab"
              id={`dept-mobile-tab-${tab.toLowerCase().replace(/\s+/g, "-")}`}
              aria-selected={active}
              aria-controls="dept-tabpanel"
              tabIndex={active ? 0 : -1}
              onClick={() => setActiveTab(tab)}
              onKeyDown={(e) => handleTabKeyDown(tab, e, mobileTabRefs)}
              className={cn(
                "flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
                active ? "text-accent" : "text-text-muted hover:text-text-primary",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
              <span>{tab}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
