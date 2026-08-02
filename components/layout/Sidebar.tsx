"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavItem, type NavItemConfig } from "@/components/layout/NavItem";

type SidebarProps = {
  navItems: NavItemConfig[];
  role: "treasurer" | "adviser" | "admin";
};

const profileLinks: Record<string, string> = {
  treasurer: "/treasurer/profile",
  adviser: "/adviser/profile",
  admin: "/admin/profile",
};

export function Sidebar({ navItems, role }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(target) &&
        !target.closest("button[aria-haspopup='menu']")
      ) {
        setProfileOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [profileOpen]);

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-border lg:bg-surface">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6">
        <svg className="h-8 w-8 text-accent" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="currentColor" />
          <path d="M10 22V10l6 6 6-6v12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-lg font-bold text-text-primary">Liquifi</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6">
        <p className="mb-3 px-3 text-xs font-medium uppercase tracking-[0.08em] text-text-muted">
          Menu
        </p>
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              isActive={
                pathname === item.href || pathname.startsWith(item.href + "/")
              }
              variant="sidebar"
            />
          ))}
        </ul>
      </nav>

      {/* User profile */}
      <div className="relative border-t border-border p-3">
        <button
          onClick={() => setProfileOpen((v) => !v)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-secondary"
          aria-haspopup="menu"
          aria-expanded={profileOpen}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-light text-accent">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-medium text-text-primary capitalize">
              {role}
            </p>
            <p className="truncate text-xs text-text-muted capitalize">{role}</p>
          </div>
          <ChevronUp
            className={cn(
              "h-4 w-4 shrink-0 text-text-muted transition-transform",
              profileOpen && "rotate-180",
            )}
          />
        </button>

        <AnimatePresence>
          {profileOpen && (
            <motion.div
              ref={profileMenuRef}
              role="menu"
              initial={{ opacity: 0, scale: 0.95, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 4 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="absolute bottom-16 left-3 right-3 z-50 rounded-lg border border-border bg-surface py-1 shadow-card"
            >
              <Link
                href={profileLinks[role]}
                role="menuitem"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-text-primary transition-colors hover:bg-surface-secondary"
              >
                <User className="h-4 w-4 text-text-secondary" />
                Profile
              </Link>
              <button
                role="menuitem"
                onClick={async () => {
                  setProfileOpen(false);
                  try {
                    await fetch("/api/auth/logout", { method: "POST" });
                  } catch {
                    // ponytail: best-effort — navigate anyway
                  }
                  router.push("/login");
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-error transition-colors hover:bg-error-lightest"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}
