"use client";

import { Home, FileText, Bell, User } from "lucide-react";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import type { NavItemConfig } from "@/components/layout/NavItem";

const navItems: NavItemConfig[] = [
  { label: "Home", href: "/treasurer/home", icon: Home },
  { label: "Reports", href: "/treasurer/reports", icon: FileText },
  { label: "Notifications", href: "/treasurer/notifications", icon: Bell },
  { label: "Profile", href: "/treasurer/profile", icon: User },
];

export function TreasurerMobileBottomNav() {
  return <MobileBottomNav navItems={navItems} />;
}
