import { EventBrowser } from "@/components/events/EventBrowser";
import { requireRole } from "@/lib/auth-guard";
import { getDepartmentEvents } from "@/lib/queries/events";

export const dynamic = "force-dynamic";

export default async function AdviserEventsPage() {
  const user = await requireRole("adviser");
  if (!user.departmentId) {
    return <p className="py-20 text-center text-sm text-text-muted">You are not assigned to a department.</p>;
  }

  const events = await getDepartmentEvents(user.departmentId);
  const activeEvents = events.filter((event) => event.status === "open");

  return (
    <div className="flex flex-col gap-6 pb-16">
      <div>
        <h1 className="text-xl font-semibold text-text-primary md:text-2xl">Active Events</h1>
        <p className="mt-1 text-xs text-text-muted">Review your department&apos;s current event budgets.</p>
      </div>
      <EventBrowser
        events={activeEvents}
        basePath="/adviser/events"
        emptyTitle="No active events"
        emptyDescription="Open events from your department will appear here."
      />
    </div>
  );
}
