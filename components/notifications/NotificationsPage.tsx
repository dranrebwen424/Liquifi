import { requireRole } from "@/lib/auth-guard";
import { createInsforgeServer } from "@/lib/insforge-server";
import { notificationContent } from "@/lib/notifications";
import { NotificationsList } from "@/components/notifications/NotificationsList";
import { TestPushButton } from "@/components/notifications/TestPushButton";
import type { NotificationRow } from "@/components/notifications/types";

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
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary md:text-2xl">{title}</h1>
          <p className="mt-1 text-sm text-text-muted">{tagline}</p>
        </div>
        <TestPushButton />
      </div>
      <NotificationsList items={rows} unreadCount={unreadCount} />
    </div>
  );
}
