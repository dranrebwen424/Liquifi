"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { EventCard } from "@/components/events/EventCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { staggerContainer, fadeUpItem } from "@/lib/motion-variants";
import type { EventWithMeta } from "@/lib/queries/events";

type Props = {
  events: EventWithMeta[];
};

export function TreasurerHomeClient({ events }: Props) {
  const [filter, setFilter] = useState<"all" | "open" | "archived">("all");

  const filtered = events.filter(
    (e) => filter === "all" || e.status === filter,
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary md:text-2xl">
            Events
          </h1>
          <p className="mt-0.5 text-xs text-text-muted">
            Manage your department event budgets and expenses
          </p>
        </div>
        <Link
          href="/treasurer/events/new"
          className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" />
          New Event
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["all", "open", "archived"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 pb-3 text-sm font-medium transition-colors ${
              filter === f
                ? "border-b-2 border-accent text-accent"
                : "border-b-2 border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            {f === "all" ? "All" : f === "open" ? "Open" : "Archived"}
          </button>
        ))}
      </div>

      {/* Events grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={
            <svg className="h-10 w-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          }
          title="No events yet"
          description="Create your first event to start tracking expenses."
          action={
            <Link
              href="/treasurer/events/new"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
            >
              <Plus className="h-4 w-4" />
              New Event
            </Link>
          }
        />
      ) : (
        <motion.div
          key={filter}
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
        >
          {filtered.map((event) => (
            <motion.div key={event.id} variants={fadeUpItem}>
              <EventCard
                id={event.id}
                name={event.name}
                status={event.status}
                budgetTotal={event.budget_total}
                totalSpent={event.total_spent}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
