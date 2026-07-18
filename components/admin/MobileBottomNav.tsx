"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, CheckCircle2, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Departments",
    href: "/admin/departments",
    icon: LayoutGrid,
  },
  {
    label: "Approvals",
    href: "/admin/approvals",
    icon: CheckCircle2,
  },
  {
    label: "Profile",
    href: "/login",
    icon: User,
  },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface md:hidden">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5",
              isActive ? "text-accent" : "text-text-muted",
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[11px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
