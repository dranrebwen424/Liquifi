"use client";

import { Home, CircleCheckBig, FileText, Bell, User } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import type { NavItemConfig } from "@/components/layout/NavItem";

const baseNavItems: NavItemConfig[] = [
  { label: "Home", href: "/adviser/home", icon: Home },
  { label: "Approvals", href: "/adviser/approvals", icon: CircleCheckBig },
  { label: "Reports", href: "/adviser/reports", icon: FileText },
  { label: "Notifications", href: "/adviser/notifications", icon: Bell },
  { label: "Profile", href: "/adviser/profile", icon: User },
];

export function AdviserSidebar({ unreadCount = 0 }: { unreadCount?: number }) {
  const navItems = baseNavItems.map((item) =>
    item.href === "/adviser/notifications" ? { ...item, badge: unreadCount } : item,
  );
  return <Sidebar navItems={navItems} role="adviser" />;
}
