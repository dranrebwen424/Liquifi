"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, ListFilter, Search } from "lucide-react";
import { ArchiveEventRow } from "@/components/events/ArchiveEventRow";
import { EventBrowser, type EventBrowserItem } from "@/components/events/EventBrowser";
import { FolderCard } from "@/components/events/FolderCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { getDepartmentEventSections } from "@/lib/admin-department-detail";

type Props = {
  departmentId: string;
  events: EventBrowserItem[];
};

export function DepartmentEventsTab({ departmentId, events }: Props) {
  const [query, setQuery] = useState("");
  const [archiveSort, setArchiveSort] = useState<"newest" | "oldest">("newest");
  const sections = useMemo(
    () => getDepartmentEventSections(events, query, archiveSort),
    [events, query, archiveSort],
  );
  const eventBasePath = `/admin/departments/${departmentId}/events`;
  const noMatches = query.trim().length > 0 && sections.activeEvents.length === 0 && sections.archivedEvents.length === 0;

  return (
    <>
      <div className="md:hidden">
        <label className="relative block">
          <Search className="sr-only" aria-hidden="true" />
          <span className="sr-only">Search events</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Events"
            className="h-11 w-full rounded-full border border-border-strong bg-background px-5 text-sm text-text-primary outline-none placeholder:text-text-primary focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </label>

        {noMatches ? (
          <EmptyState title="No matching events" description="Try a different event name." />
        ) : (
          <>
            <section className="mt-8">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Active Events</h2>
                  <p className="text-xs text-text-muted">
                    Total of {sections.activeEvents.length} {sections.activeEvents.length === 1 ? "Event" : "Events"}
                  </p>
                </div>
                <Link
                  href={eventBasePath}
                  prefetch={false}
                  className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  View all
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>

              {sections.recentActiveEvents.length === 0 ? (
                <EmptyState title="No active events" description="Open events will appear here." />
              ) : (
                <div className="mx-auto grid max-w-xs grid-cols-2 gap-x-11 gap-y-7">
                  {sections.recentActiveEvents.map((event) => (
                    <div key={event.id} className="mx-auto w-32">
                      <FolderCard id={event.id} name={event.name} href={`${eventBasePath}/${event.id}`} />
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-14">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Archive Events</h2>
                  <p className="text-xs text-text-muted">
                    Total of {sections.archivedEvents.length} {sections.archivedEvents.length === 1 ? "Event" : "Events"}
                  </p>
                </div>
                <label className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-text-primary focus-within:ring-2 focus-within:ring-accent">
                  <span className="sr-only">Sort archive events</span>
                  <ListFilter className="h-6 w-6" aria-hidden="true" />
                  <select
                    value={archiveSort}
                    onChange={(event) => setArchiveSort(event.target.value as "newest" | "oldest")}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    aria-label="Sort archive events"
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                  </select>
                </label>
              </div>

              {sections.archivedEvents.length === 0 ? (
                <p className="py-8 text-center text-sm text-text-muted">No archived events.</p>
              ) : (
                <div>
                  {sections.archivedEvents.map((event) => (
                    <ArchiveEventRow
                      key={event.id}
                      id={event.id}
                      name={event.name}
                      createdAt={event.created_at}
                      href={`${eventBasePath}/${event.id}`}
                      compact
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <div className="hidden md:block">
        <EventBrowser
          events={events}
          basePath={eventBasePath}
          emptyTitle="No events"
          emptyDescription="This department has no events yet."
        />
      </div>
    </>
  );
}
