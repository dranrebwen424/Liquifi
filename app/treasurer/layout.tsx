import { requireLayoutRole } from "@/lib/layout-guard";
import { createInsforgeServer } from "@/lib/insforge-server";
import { TreasurerSidebar } from "@/components/treasurer/TreasurerSidebar";
import { TreasurerMobileBottomNav } from "@/components/treasurer/TreasurerMobileBottomNav";
import { MobileTopBar } from "@/components/treasurer/MobileTopBar";
import { PushSubscriber } from "@/components/notifications/PushSubscriber";

export default async function TreasurerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireLayoutRole("treasurer");

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
      <TreasurerSidebar unreadCount={unreadCount} />

      <MobileTopBar />

      {/* Mobile bottom nav */}
      <TreasurerMobileBottomNav unreadCount={unreadCount} />

      {/* Main content */}
      <main className="lg:pl-60">
        <div className="mx-auto max-w-[1440px] px-4 py-6 pb-20 md:px-8 md:py-8 md:pb-0">
          {children}
        </div>
      </main>
    </div>
  );
}
