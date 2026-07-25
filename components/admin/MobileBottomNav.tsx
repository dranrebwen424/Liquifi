"use client";

import { LayoutGrid, CircleCheckBig, User } from "lucide-react";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import type { NavItemConfig } from "@/components/layout/NavItem";

const navItems: NavItemConfig[] = [
  { label: "Departments", href: "/admin/departments", icon: LayoutGrid },
  { label: "Approvals", href: "/admin/approvals", icon: CircleCheckBig },
  { label: "Profile", href: "/admin/profile", icon: User },
];

export function AdminMobileBottomNav() {
  return <MobileBottomNav navItems={navItems} />;
}
