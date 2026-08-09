import { requireLayoutRole } from "@/lib/layout-guard";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminMobileBottomNav } from "@/components/admin/MobileBottomNav";
import { SidebarShell } from "@/components/layout/SidebarShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireLayoutRole("admin");

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />

      {/* Mobile top bar */}
      <div className="lg:hidden flex h-16 items-center gap-2 border-b border-border bg-surface px-4">
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
          Admin
        </span>
      </div>

      {/* Mobile bottom nav */}
      <AdminMobileBottomNav />

      {/* Main content */}
      <SidebarShell>{children}</SidebarShell>
    </div>
  );
}
