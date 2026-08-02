"use client";

import { LayoutGrid, CircleCheckBig } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import type { NavItemConfig } from "@/components/layout/NavItem";

const navItems: NavItemConfig[] = [
  { label: "Departments", href: "/admin/departments", icon: LayoutGrid },
  { label: "Approvals", href: "/admin/approvals", icon: CircleCheckBig },
];

export function AdminSidebar() {
  return <Sidebar navItems={navItems} role="admin" />;
}
