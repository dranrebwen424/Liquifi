import { requireLayoutRole } from "@/lib/layout-guard";
import { createInsforgeServer } from "@/lib/insforge-server";
import { AdviserSidebar } from "@/components/adviser/AdviserSidebar";
import { AdviserMobileBottomNav } from "@/components/adviser/AdviserMobileBottomNav";
import { PushSubscriber } from "@/components/notifications/PushSubscriber";

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
      <AdviserSidebar unreadCount={unreadCount} />

      {/* Mobile top bar */}
      <div className="flex h-16 items-center gap-2 border-b border-border bg-surface px-4 lg:hidden">
        <svg className="h-8 w-8 text-accent" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="currentColor" />
          <path
            d="M10 22V10l6 6 6-6v12"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-lg font-bold text-text-primary">Liquifi</span>
        <span className="ml-auto rounded-full bg-accent-light px-2 py-0.5 text-xs font-medium text-accent">
          Adviser
        </span>
      </div>

      {/* Mobile bottom nav */}
      <AdviserMobileBottomNav unreadCount={unreadCount} />

      {/* Main content */}
      <main className="lg:pl-60">
        <div className="mx-auto max-w-[1440px] px-4 py-6 pb-20 md:px-8 md:py-8 md:pb-0">
          {children}
        </div>
      </main>
    </div>
  );
}
