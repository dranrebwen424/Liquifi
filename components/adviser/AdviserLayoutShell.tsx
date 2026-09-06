"use client";

import { useCallback, useState } from "react";
import { Bell, CircleCheckBig, FileText, Home, User } from "lucide-react";
import { AdviserMobileTopBar } from "@/components/adviser/AdviserMobileTopBar";
import { MobileSidebarDrawer } from "@/components/layout/MobileSidebarDrawer";
import { SidebarShell } from "@/components/layout/SidebarShell";
import type { NavItemConfig } from "@/components/layout/NavItem";

const baseNavItems: NavItemConfig[] = [
  { label: "Home", href: "/adviser/home", icon: Home },
  { label: "Approvals", href: "/adviser/approvals", icon: CircleCheckBig },
  { label: "Reports", href: "/adviser/reports", icon: FileText },
  { label: "Notifications", href: "/adviser/notifications", icon: Bell },
  { label: "Profile", href: "/adviser/profile", icon: User },
];

type Props = {
  children: React.ReactNode;
  unreadCount: number;
};

export function AdviserLayoutShell({ children, unreadCount }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const navItems = baseNavItems.map((item) =>
    item.href === "/adviser/notifications" ? { ...item, badge: unreadCount } : item,
  );

  return (
    <>
      <MobileSidebarDrawer
        open={sidebarOpen}
        onClose={closeSidebar}
        navItems={navItems}
        role="adviser"
      />
      <AdviserMobileTopBar onOpenSidebar={openSidebar} unreadCount={unreadCount} />
      <SidebarShell mobileBottomNav={false}>{children}</SidebarShell>
    </>
  );
}
