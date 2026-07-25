"use client";

import { usePathname } from "next/navigation";
import { NavItem, type NavItemConfig } from "@/components/layout/NavItem";

type MobileBottomNavProps = {
  navItems: NavItemConfig[];
};

export function MobileBottomNav({ navItems }: MobileBottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface md:hidden">
      {navItems.map((item) => (
        <NavItem
          key={item.href}
          {...item}
          isActive={
            pathname === item.href || pathname.startsWith(item.href + "/")
          }
          variant="bottom"
        />
      ))}
    </nav>
  );
}
