"use client";

import { useCallback, useState } from "react";
import { CircleCheckBig, FileText, Home } from "lucide-react";
import { AdviserMobileTopBar } from "@/components/adviser/AdviserMobileTopBar";
import { MobileSidebarDrawer } from "@/components/layout/MobileSidebarDrawer";
import { SidebarShell } from "@/components/layout/SidebarShell";
import type { NavItemConfig } from "@/components/layout/NavItem";
import type { SidebarAccount } from "@/lib/sidebar";

const drawerNavItems = (pendingCount: number): NavItemConfig[] => [
  { label: "Home", href: "/adviser/home", icon: Home },
  { label: "Approvals", href: "/adviser/approvals", icon: CircleCheckBig, badge: pendingCount },
  { label: "Reports", href: "/adviser/reports", icon: FileText },
];

type Props = {
  children: React.ReactNode;
  unreadCount: number;
  pendingCount?: number;
  account: SidebarAccount;
};

export function AdviserLayoutShell({ children, unreadCount, pendingCount = 0, account }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <>
      <MobileSidebarDrawer
        open={sidebarOpen}
        onClose={closeSidebar}
        navItems={drawerNavItems(pendingCount)}
        role="adviser"
        account={account}
      />
      <AdviserMobileTopBar onOpenSidebar={openSidebar} unreadCount={unreadCount} />
      <SidebarShell mobileBottomNav={false}>{children}</SidebarShell>
    </>
  );
}
