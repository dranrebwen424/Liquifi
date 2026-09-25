import { requireLayoutRole } from "@/lib/layout-guard";
import { createInsforgeServer } from "@/lib/insforge-server";
import { getAvatarUrl } from "@/lib/storage";
import { PushSubscriber } from "@/components/notifications/PushSubscriber";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminMobileTopBar } from "@/components/admin/AdminMobileTopBar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { SidebarShell } from "@/components/layout/SidebarShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireLayoutRole("admin");
  const insforge = await createInsforgeServer();
  const { data: pendingApprovals } = await insforge.database
    .from("users")
    .select("id")
    .eq("role", "adviser")
    .eq("account_status", "pending_approval");
  const pendingApprovalsCount = pendingApprovals?.length ?? 0;
  const adminInitial = user.email.slice(0, 1).toUpperCase() || "A";
  const adminAvatarUrl = getAvatarUrl(user.avatarKey, insforge);

  return (
    <div className="min-h-[calc(100dvh+8rem)] bg-background md:min-h-screen">
      <PushSubscriber />

      <AdminSidebar />

      <AdminMobileTopBar
        adminInitial={adminInitial}
        adminAvatarUrl={adminAvatarUrl}
        pendingApprovalsCount={pendingApprovalsCount}
      />

      {/* Main content */}
      <SidebarShell mobileBottomNav={false}>
        <AdminTopBar
          adminInitial={adminInitial}
          adminAvatarUrl={adminAvatarUrl}
          pendingApprovalsCount={pendingApprovalsCount}
        />
        {children}
      </SidebarShell>
    </div>
  );
}
