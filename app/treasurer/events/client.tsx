"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Archive } from "lucide-react";
import { FolderCard } from "@/components/events/FolderCard";
import { EventCard } from "@/components/events/EventCard";
import { ArchiveEventRow } from "@/components/events/ArchiveEventRow";
import { EventListItem } from "@/components/events/EventListItem";
import { ViewToggle } from "@/components/events/ViewToggle";
import { EmptyState } from "@/components/ui/EmptyState";
import { staggerContainer, fadeUpItem } from "@/lib/motion-variants";
import type { EventWithMeta } from "@/lib/queries/events";

type Props = { events: EventWithMeta[] };

export function ActiveEventsClient({ events }: Props) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Only active events on this page.
  const activeEvents = events
    .filter((e) => e.status === "open")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="mt-6 flex flex-col gap-5 pb-16 md:gap-7 md:pb-24">
      {/* ── Page header: back arrow (mobile) + title/subtitle + View Toggle ── */}
      <div className="flex items-center gap-3 md:gap-4">
        <button
          type="button"
          onClick={() => router.push("/treasurer/home")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold leading-tight text-text-primary md:text-xl">
            Active Events
          </h1>
          <p className="mt-0.5 text-xs text-text-muted md:text-sm">
            Total of {activeEvents.length} {activeEvents.length === 1 ? "Event" : "Events"}
          </p>
        </div>

        <ViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {/* ── Body: grid/list of active events ── */}
      {activeEvents.length === 0 ? (
        <EmptyState
          icon={<Archive className="h-10 w-10 text-text-muted" />}
          title="No active events"
          description="Events you open will appear here."
        />
      ) : viewMode === "grid" ? (
        <motion.div
          key={`active-grid-${viewMode}`}
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        >
          {activeEvents.map((event) => (
            <motion.div key={event.id} variants={fadeUpItem}>
              {/* Mobile uses the folder card; desktop uses the event card. */}
              <div className="md:hidden">
                <FolderCard id={event.id} name={event.name} />
              </div>
              <div className="hidden md:block">
                <EventCard
                  id={event.id}
                  name={event.name}
                  status={event.status}
                  budgetTotal={event.budget_total}
                  totalSpent={event.total_spent}
                  numEntries={event.num_entries}
                  createdByName={event.created_by_name}
                />
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          key={`active-list-${viewMode}`}
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-3 md:gap-2"
        >
          {activeEvents.map((event) => (
            <motion.div key={event.id} variants={fadeUpItem}>
              {/* Mobile matches the archive row look; desktop uses the full list item. */}
              <div className="md:hidden">
                <ArchiveEventRow id={event.id} name={event.name} createdAt={event.created_at} />
              </div>
              <div className="hidden md:block">
                <EventListItem
                  id={event.id}
                  name={event.name}
                  status={event.status}
                  budgetTotal={event.budget_total}
                  totalSpent={event.total_spent}
                  numEntries={event.num_entries}
                  createdAt={event.created_at}
                />
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}