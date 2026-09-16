import { requireLayoutRole } from "@/lib/layout-guard";
import { PushSubscriber } from "@/components/notifications/PushSubscriber";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminMobileTopBar } from "@/components/admin/AdminMobileTopBar";
import { SidebarShell } from "@/components/layout/SidebarShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireLayoutRole("admin");

  return (
    <div className="min-h-screen bg-background">
      <PushSubscriber />

      <AdminSidebar />

      <AdminMobileTopBar />

      {/* Main content */}
      <SidebarShell mobileBottomNav={false}>{children}</SidebarShell>
    </div>
  );
}
