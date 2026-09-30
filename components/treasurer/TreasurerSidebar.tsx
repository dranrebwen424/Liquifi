"use client";

import { Home, FileText, Bell } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import type { NavItemConfig } from "@/components/layout/NavItem";
import type { SidebarAccount } from "@/lib/sidebar";

const baseNavItems: NavItemConfig[] = [
  { label: "Home", href: "/treasurer/home", icon: Home },
  { label: "Reports", href: "/treasurer/reports", icon: FileText },
  { label: "Notifications", href: "/treasurer/notifications", icon: Bell },
];

export function TreasurerSidebar({ unreadCount = 0, account }: { unreadCount?: number; account: SidebarAccount }) {
  const navItems = baseNavItems.map((item) =>
    item.href === "/treasurer/notifications" ? { ...item, badge: unreadCount } : item,
  );
  return <Sidebar navItems={navItems} role="treasurer" account={account} />;
}
