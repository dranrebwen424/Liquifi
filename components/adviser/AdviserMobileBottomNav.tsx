"use client";

import { Home, CircleCheckBig, FileText, Bell, User } from "lucide-react";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import type { NavItemConfig } from "@/components/layout/NavItem";

const navItems: NavItemConfig[] = [
  { label: "Home", href: "/adviser/home", icon: Home },
  { label: "Approvals", href: "/adviser/approvals", icon: CircleCheckBig },
  { label: "Reports", href: "/adviser/reports", icon: FileText },
  { label: "Notifications", href: "/adviser/notifications", icon: Bell },
  { label: "Profile", href: "/adviser/profile", icon: User },
];

export function AdviserMobileBottomNav() {
  return <MobileBottomNav navItems={navItems} />;
}
