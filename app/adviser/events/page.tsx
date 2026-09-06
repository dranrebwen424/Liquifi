import { ActiveEventsClient } from "@/app/treasurer/events/client";
import { EventPageEntrance } from "@/components/events/EventPageEntrance";
import { requireRole } from "@/lib/auth-guard";
import { getDepartmentEvents } from "@/lib/queries/events";

export const dynamic = "force-dynamic";

export default async function AdviserEventsPage() {
  const user = await requireRole("adviser");
  if (!user.departmentId) {
    return <p className="py-20 text-center text-sm text-text-muted">You are not assigned to a department.</p>;
  }

  const events = await getDepartmentEvents(user.departmentId);

  return (
    <EventPageEntrance>
      <ActiveEventsClient events={events} basePath="/adviser/events" homePath="/adviser/home" />
    </EventPageEntrance>
  );
}
