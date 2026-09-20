import { requireLayoutRole } from "@/lib/layout-guard";
import { createInsforgeServer } from "@/lib/insforge-server";
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
  await requireLayoutRole("admin");
  const insforge = await createInsforgeServer();
  const { data: pendingApprovals } = await insforge.database
    .from("users")
    .select("id")
    .eq("role", "adviser")
    .eq("account_status", "pending_approval");
  const pendingApprovalsCount = pendingApprovals?.length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <PushSubscriber />

      <AdminSidebar />

      <AdminMobileTopBar pendingApprovalsCount={pendingApprovalsCount} />

      {/* Main content */}
      <SidebarShell mobileBottomNav={false}>
        <AdminTopBar pendingApprovalsCount={pendingApprovalsCount} />
        {children}
      </SidebarShell>
    </div>
  );
}
