import { requireLayoutRole } from "@/lib/layout-guard";
import { createInsforgeServer } from "@/lib/insforge-server";
import { getAvatarUrl } from "@/lib/storage";
import { TreasurerSidebar } from "@/components/treasurer/TreasurerSidebar";
import { TreasurerLayoutShell } from "@/components/treasurer/TreasurerLayoutShell";
import { PushSubscriber } from "@/components/notifications/PushSubscriber";
import { PushEnableToast } from "@/components/notifications/PushEnableToast";

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
  const account = {
    name: user.displayName || user.email,
    email: user.email,
    avatarUrl: getAvatarUrl(user.avatarKey, insforge),
  };

  return (
    <div className="min-h-screen bg-background">
      <PushSubscriber />
      <PushEnableToast />
      <TreasurerSidebar unreadCount={unreadCount} account={account} />

      <TreasurerLayoutShell unreadCount={unreadCount} account={account}>
        {children}
      </TreasurerLayoutShell>
    </div>
  );
}
