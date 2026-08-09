"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type NavItemConfig = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
};

type NavItemProps = NavItemConfig & {
  isActive: boolean;
  variant: "sidebar" | "bottom";
  collapsed?: boolean;
};

export function NavItem({ label, href, icon: Icon, isActive, variant, badge = 0, collapsed = false }: NavItemProps) {
  if (variant === "sidebar") {
    return (
      <Link
        href={href}
        title={collapsed ? label : undefined}
        className={cn(
          "group relative flex items-center rounded-xl text-sm font-medium transition-all duration-200",
          collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
        )}
        style={{
          backgroundColor: isActive ? "#27272e" : "transparent",
          color: isActive ? "#ffffff" : "#a1a1aa",
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = "#1a1a1e";
            e.currentTarget.style.color = "#ffffff";
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "#a1a1aa";
          }
        }}
      >
        <span className="relative z-10 transition-transform duration-200 group-hover:scale-110">
          <Icon className="h-5 w-5" strokeWidth={isActive ? 2 : 1.5} />
        </span>
        {!collapsed && (
          <span className="relative z-10 truncate">{label}</span>
        )}
        {!collapsed && badge > 0 && (
          <span
            className="relative z-10 ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold leading-none"
            style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "#ffffff" }}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
        {collapsed && badge > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 z-10 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-semibold leading-none"
            style={{ backgroundColor: "#ffffff", color: "#0a0a0c" }}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </Link>
    );
  }

  // bottom nav variant
  return (
    <Link
      href={href}
      className={cn(
        "relative flex flex-1 flex-col items-center gap-1 py-2.5 transition-all duration-200 active:scale-95",
        isActive ? "text-accent" : "text-text-muted",
      )}
    >
      {isActive && (
        <motion.div
          layoutId="bottom-active"
          className="absolute top-0 h-7 w-9 rounded-full bg-accent-light shadow-[0_0_12px_rgba(0,0,0,0.06)]"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
      <span className="relative z-10">
        <Icon
          className="h-5 w-5"
          strokeWidth={isActive ? 0 : 1.5}
          fill={isActive ? "currentColor" : "none"}
        />
        {badge > 0 && (
          <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-none text-accent-foreground">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      <span className="relative z-10 text-[11px] font-medium">{label}</span>
    </Link>
  );
}
