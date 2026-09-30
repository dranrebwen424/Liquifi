"use client";

import { Home, CircleCheckBig, FileText, Bell } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import type { NavItemConfig } from "@/components/layout/NavItem";
import type { SidebarAccount } from "@/lib/sidebar";

const sidebarNavItems = (unreadCount: number, pendingCount: number): NavItemConfig[] => [
  { label: "Home", href: "/adviser/home", icon: Home },
  { label: "Approvals", href: "/adviser/approvals", icon: CircleCheckBig, badge: pendingCount },
  { label: "Reports", href: "/adviser/reports", icon: FileText },
  { label: "Notifications", href: "/adviser/notifications", icon: Bell, badge: unreadCount },
];

export function AdviserSidebar({
  unreadCount = 0,
  pendingCount = 0,
  account,
}: {
  unreadCount?: number;
  pendingCount?: number;
  account: SidebarAccount;
}) {
  return <Sidebar navItems={sidebarNavItems(unreadCount, pendingCount)} role="adviser" account={account} />;
}
