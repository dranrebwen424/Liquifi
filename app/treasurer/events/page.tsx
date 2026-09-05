import { createInsforgeServer } from "@/lib/insforge-server";
import { requireRole } from "@/lib/auth-guard";
import { getDepartmentEvents } from "@/lib/queries/events";
import { ActiveEventsClient } from "./client";

export default async function ActiveEventsPage() {
  const user = await requireRole("treasurer");
  const departmentId = user.departmentId;
  if (!departmentId) {
    return (
      <div className="py-20 text-center text-sm text-text-muted">
        You are not assigned to a department.
      </div>
    );
  }

  const events = await getDepartmentEvents(departmentId);

  return <ActiveEventsClient events={events} />;
}