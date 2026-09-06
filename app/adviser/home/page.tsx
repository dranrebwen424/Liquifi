import { AdviserNotificationCard } from "@/components/adviser/AdviserNotificationCard";
import { TreasurerHomeClient } from "@/app/treasurer/home/client";
import { requireRole } from "@/lib/auth-guard";
import { createInsforgeServer } from "@/lib/insforge-server";
import { notificationContent } from "@/lib/notifications";
import { getDepartmentEvents } from "@/lib/queries/events";

export const dynamic = "force-dynamic";

type DbNotification = {
  id: string;
  type: string;
  payload_json: Record<string, unknown> | null;
};

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
  const insforge = await createInsforgeServer();
  const { data } = await insforge.database
    .from("notifications")
    .select("id, type, payload_json")
    .eq("user_id", user.id)
    .eq("read", false)
    .order("created_at", { ascending: false })
    .limit(12);
  const notifications = ((data ?? []) as DbNotification[]).map((notification) => {
    const content = notificationContent(notification.type, notification.payload_json ?? {});
    return { ...notification, ...content };
  });

  return (
    <TreasurerHomeClient
      events={events}
      readOnly
      paths={{
        home: "/adviser/home",
        events: "/adviser/events",
        event: "/adviser/events",
      }}
      topSlot={<AdviserNotificationCard notifications={notifications} />}
    />
  );
}
