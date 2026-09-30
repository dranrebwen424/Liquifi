"use client";

import { Home, CircleCheckBig, FileText, Bell } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import type { NavItemConfig } from "@/components/layout/NavItem";
import type { SidebarAccount } from "@/lib/sidebar";

const baseNavItems: NavItemConfig[] = [
  { label: "Home", href: "/adviser/home", icon: Home },
  { label: "Approvals", href: "/adviser/approvals", icon: CircleCheckBig },
  { label: "Reports", href: "/adviser/reports", icon: FileText },
  { label: "Notifications", href: "/adviser/notifications", icon: Bell },
];

export function AdviserSidebar({ unreadCount = 0, account }: { unreadCount?: number; account: SidebarAccount }) {
  const navItems = baseNavItems.map((item) =>
    item.href === "/adviser/notifications" ? { ...item, badge: unreadCount } : item,
  );
  return <Sidebar navItems={navItems} role="adviser" account={account} />;
}
