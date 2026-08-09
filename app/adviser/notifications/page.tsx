import { NotificationsPage } from "@/components/notifications/NotificationsPage";

export const dynamic = "force-dynamic";

export default function AdviserNotificationsPage() {
  return (
    <NotificationsPage
      role="adviser"
      title="Notifications"
      tagline="Report and entry approval updates."
    />
  );
}
