import { TreasurerHomeClient } from "@/app/treasurer/home/client";
import { requireRole } from "@/lib/auth-guard";
import { getDepartmentEvents } from "@/lib/queries/events";

export const dynamic = "force-dynamic";

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
    <TreasurerHomeClient
      events={events}
      readOnly
      paths={{
        home: "/adviser/home",
        events: "/adviser/events",
        event: "/adviser/events",
      }}
    />
  );
}
