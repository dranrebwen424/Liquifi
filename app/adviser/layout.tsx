import { requireLayoutRole } from "@/lib/layout-guard";
import { createInsforgeServer } from "@/lib/insforge-server";
import { AdviserSidebar } from "@/components/adviser/AdviserSidebar";
import { AdviserMobileBottomNav } from "@/components/adviser/AdviserMobileBottomNav";
import { AdviserMobileTopBar } from "@/components/adviser/AdviserMobileTopBar";
import { PushSubscriber } from "@/components/notifications/PushSubscriber";
import { PushEnableToast } from "@/components/notifications/PushEnableToast";
import { SidebarShell } from "@/components/layout/SidebarShell";

export default async function AdviserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireLayoutRole("adviser");

  // Unread notification count for the nav badges. Refreshes on every
  // navigation/revalidation; mark-read actions also revalidate these routes.
  const insforge = await createInsforgeServer();
  const { data: unreadRows } = await insforge.database
    .from("notifications")
    .select("id")
    .eq("user_id", user.id)
    .eq("read", false);
  const unreadCount = unreadRows?.length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <PushSubscriber />
      <PushEnableToast />
      <AdviserSidebar unreadCount={unreadCount} />

      <AdviserMobileTopBar />

      {/* Mobile bottom nav */}
      <AdviserMobileBottomNav unreadCount={unreadCount} />

      {/* Main content */}
      <SidebarShell>{children}</SidebarShell>
    </div>
  );
}
