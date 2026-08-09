"use client";

import { Home, FileText, Bell, User } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import type { NavItemConfig } from "@/components/layout/NavItem";

const baseNavItems: NavItemConfig[] = [
  { label: "Home", href: "/treasurer/home", icon: Home },
  { label: "Reports", href: "/treasurer/reports", icon: FileText },
  { label: "Notifications", href: "/treasurer/notifications", icon: Bell },
  { label: "Profile", href: "/treasurer/profile", icon: User },
];

export function TreasurerSidebar({ unreadCount = 0 }: { unreadCount?: number }) {
  const navItems = baseNavItems.map((item) =>
    item.href === "/treasurer/notifications" ? { ...item, badge: unreadCount } : item,
  );
  return <Sidebar navItems={navItems} role="treasurer" />;
}
