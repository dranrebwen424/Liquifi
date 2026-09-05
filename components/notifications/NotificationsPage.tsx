import { requireRole } from "@/lib/auth-guard";
import { createInsforgeServer } from "@/lib/insforge-server";
import { notificationContent } from "@/lib/notifications";
import { NotificationsList } from "@/components/notifications/NotificationsList";
import type { NotificationRow } from "@/components/notifications/types";
import { NotificationHeader } from "@/components/notifications/NotificationHeader";

// Shared server view for the treasurer + adviser notifications pages.
// Fetches the acting user's notifications and renders the client list.

type DbNotification = {
  id: string;
  read: boolean;
  created_at: string;
  type: string;
  payload_json: Record<string, unknown> | null;
};

export async function NotificationsPage({
  role,
  title,
  tagline,
}: {
  role: "treasurer" | "adviser";
  title: string;
  tagline: string;
}) {
  const user = await requireRole(role);
  const insforge = await createInsforgeServer();

  const { data } = await insforge.database
    .from("notifications")
    .select("id, read, created_at, type, payload_json")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const rows: NotificationRow[] = ((data ?? []) as DbNotification[]).map((row) => {
    const content = notificationContent(row.type, row.payload_json ?? {});
    return {
      id: row.id,
      read: row.read,
      created_at: row.created_at,
      title: content.title,
      body: content.body,
      url: content.url,
    };
  });

  const unreadCount = rows.filter((row) => !row.read).length;

  return (
    <div className="mt-6 flex flex-col gap-5 pb-16 md:pb-24">
      <NotificationHeader role={role} title={title} tagline={tagline} unreadCount={unreadCount} />
      <NotificationsList items={rows} unreadCount={unreadCount} />
    </div>
  );
}
