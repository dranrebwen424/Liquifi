"use client";

import { usePathname } from "next/navigation";
import { NavItem, type NavItemConfig } from "@/components/layout/NavItem";
import { isEventPage } from "@/lib/event-route";
import { cn } from "@/lib/utils";

type MobileBottomNavProps = {
  navItems: NavItemConfig[];
};

export function MobileBottomNav({ navItems }: MobileBottomNavProps) {
  const pathname = usePathname();
  const hidden = isEventPage(pathname);

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface transition-transform duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] md:hidden",
        hidden ? "translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100",
      )}
    >
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
