"use client";

import { useCallback, useState } from "react";
import { Home, FileText, Bell, User } from "lucide-react";
import { MobileSidebarDrawer } from "@/components/layout/MobileSidebarDrawer";
import { MobileTopBar } from "@/components/treasurer/MobileTopBar";
import { SidebarShell } from "@/components/layout/SidebarShell";
import type { NavItemConfig } from "@/components/layout/NavItem";

const baseNavItems: NavItemConfig[] = [
  { label: "Home", href: "/treasurer/home", icon: Home },
  { label: "Reports", href: "/treasurer/reports", icon: FileText },
  { label: "Notifications", href: "/treasurer/notifications", icon: Bell },
  { label: "Profile", href: "/treasurer/profile", icon: User },
];

type Props = {
  children: React.ReactNode;
  unreadCount: number;
};

export function TreasurerLayoutShell({ children, unreadCount }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const navItems = baseNavItems.map((item) =>
    item.href === "/treasurer/notifications" ? { ...item, badge: unreadCount } : item,
  );

  return (
    <>
      <MobileSidebarDrawer
        open={sidebarOpen}
        onClose={closeSidebar}
        navItems={navItems}
        role="treasurer"
      />
      <MobileTopBar onOpenSidebar={openSidebar} />
      <SidebarShell mobileBottomNav={false}>{children}</SidebarShell>
    </>
  );
}
