"use client";

import { ClipboardCheck, LayoutGrid } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import type { NavItemConfig } from "@/components/layout/NavItem";
import type { SidebarAccount } from "@/lib/sidebar";

const navItems: NavItemConfig[] = [
  { label: "Departments", href: "/admin/departments", icon: LayoutGrid },
  { label: "Approvals", href: "/admin/approvals", icon: ClipboardCheck },
];

export function AdminSidebar({ account }: { account: SidebarAccount }) {
  return <Sidebar navItems={navItems} role="admin" account={account} />;
}
