import { requireRole } from "@/lib/auth-guard";
import { getDepartmentEvents } from "@/lib/queries/events";
import { EventBrowser } from "@/components/events/EventBrowser";

export const dynamic = "force-dynamic";

// Adviser home — read-only event browser mirroring the treasurer home
// (search bar, grid/list view toggle, folder-card grid, archive by year).
// No management controls: the adviser's job is review.
export default async function AdviserHomePage() {
  const user = await requireRole("adviser");
  const departmentId = user.departmentId;
  if (!departmentId) {
    return (
      <div className="py-20 text-center text-sm text-text-muted">
        You are not assigned to a department.
      </div>
    );
  }

  const events = await getDepartmentEvents(departmentId);

  return (
    <div className="flex flex-col gap-6 pb-16">
      <div>
        <h1 className="text-xl font-semibold text-text-primary md:text-2xl">
          Events
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          View your department&apos;s event budgets and reports
        </p>
      </div>

      <EventBrowser
        events={events}
        basePath="/adviser/events"
        emptyTitle="No events yet"
        emptyDescription="Your department has not created any events."
      />
    </div>
  );
}
