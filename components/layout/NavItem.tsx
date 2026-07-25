"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type NavItemConfig = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type NavItemProps = NavItemConfig & {
  isActive: boolean;
  variant: "sidebar" | "bottom";
};

export function NavItem({ label, href, icon: Icon, isActive, variant }: NavItemProps) {
  if (variant === "sidebar") {
    return (
      <li>
        <Link
          href={href}
          className={cn(
            "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            isActive
              ? "text-accent"
              : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary",
          )}
        >
          {isActive && (
            <motion.div
              layoutId="sidebar-active"
              className="absolute inset-0 rounded-lg bg-accent-light"
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
            />
          )}
          <span className="relative z-10">
            <Icon
              className="h-5 w-5"
              strokeWidth={isActive ? 0 : 1.5}
              fill={isActive ? "currentColor" : "none"}
            />
          </span>
          <span className="relative z-10">{label}</span>
        </Link>
      </li>
    );
  }

  // bottom nav variant
  return (
    <Link
      href={href}
      className={cn(
        "relative flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors",
        isActive ? "text-accent" : "text-text-muted",
      )}
    >
      {isActive && (
        <motion.div
          layoutId="bottom-active"
          className="absolute top-1 h-6 w-8 rounded-full bg-accent-light"
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        />
      )}
      <span className="relative z-10">
        <Icon
          className="h-5 w-5"
          strokeWidth={isActive ? 0 : 1.5}
          fill={isActive ? "currentColor" : "none"}
        />
      </span>
      <span className="relative z-10 text-[11px] font-medium">{label}</span>
    </Link>
  );
}
