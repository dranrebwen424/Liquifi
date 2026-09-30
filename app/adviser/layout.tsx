import { requireLayoutRole } from "@/lib/layout-guard";
import { createInsforgeServer } from "@/lib/insforge-server";
import { getAvatarUrl } from "@/lib/storage";
import { countPendingApprovals } from "@/lib/adviser-approval-inbox";
import { AdviserSidebar } from "@/components/adviser/AdviserSidebar";
import { AdviserLayoutShell } from "@/components/adviser/AdviserLayoutShell";
import { PushSubscriber } from "@/components/notifications/PushSubscriber";
import { PushEnableToast } from "@/components/notifications/PushEnableToast";

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
  const pendingApprovalCount = await countPendingApprovals(insforge, user.departmentId);
  const account = {
    name: user.displayName || user.email,
    email: user.email,
    avatarUrl: getAvatarUrl(user.avatarKey, insforge),
  };

  return (
    <div className="min-h-screen bg-background">
      <PushSubscriber />
      <PushEnableToast />
      <AdviserSidebar unreadCount={unreadCount} pendingCount={pendingApprovalCount} account={account} />
      <AdviserLayoutShell unreadCount={unreadCount} pendingCount={pendingApprovalCount} account={account}>{children}</AdviserLayoutShell>
    </div>
  );
}
