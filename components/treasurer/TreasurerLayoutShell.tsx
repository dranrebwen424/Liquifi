"use client";

import { useCallback, useState } from "react";
import { Home, FileText } from "lucide-react";
import { MobileSidebarDrawer } from "@/components/layout/MobileSidebarDrawer";
import { MobileTopBar } from "@/components/treasurer/MobileTopBar";
import { SidebarShell } from "@/components/layout/SidebarShell";
import type { NavItemConfig } from "@/components/layout/NavItem";
import type { SidebarAccount } from "@/lib/sidebar";

const baseNavItems: NavItemConfig[] = [
  { label: "Home", href: "/treasurer/home", icon: Home },
  { label: "Reports", href: "/treasurer/reports", icon: FileText },
];

type Props = {
  children: React.ReactNode;
  unreadCount: number;
  account: SidebarAccount;
};

export function TreasurerLayoutShell({ children, unreadCount, account }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);


  return (
    <>
      <MobileSidebarDrawer
        open={sidebarOpen}
        onClose={closeSidebar}
        navItems={baseNavItems}
        role="treasurer"
        account={account}
      />
      <MobileTopBar onOpenSidebar={openSidebar} unreadCount={unreadCount} />
      <SidebarShell mobileBottomNav={false}>{children}</SidebarShell>
    </>
  );
}
