import { NotificationsPage } from "@/components/notifications/NotificationsPage";

export const dynamic = "force-dynamic";

export default function TreasurerNotificationsPage() {
  return (
    <NotificationsPage
      role="treasurer"
      title="Notifications"
      tagline="Report approvals, rejections, and updates."
    />
  );
}
