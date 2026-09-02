"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavItem, type NavItemConfig } from "@/components/layout/NavItem";

type Props = {
  open: boolean;
  onClose: () => void;
  navItems: NavItemConfig[];
  role: "treasurer" | "adviser" | "admin";
};

const profileLinks: Record<string, string> = {
  treasurer: "/treasurer/profile",
  adviser: "/adviser/profile",
  admin: "/admin/profile",
};

export function MobileSidebarDrawer({ open, onClose, navItems, role }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  // Close on route change
  useEffect(() => {
    onClose();
  }, [pathname, onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-nav shadow-xl lg:hidden"
          >
            {/* Logo header */}
            <div className="flex h-16 items-center gap-3 px-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-text-inverse font-bold text-sm text-nav">
                M
              </div>
              <span className="text-lg font-bold text-white">Liquifi</span>
            </div>

            {/* Nav items */}
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted/60">
                Menu
              </p>
              <ul className="flex flex-col gap-0.5">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <NavItem
                      {...item}
                      isActive={
                        pathname === item.href || pathname.startsWith(item.href + "/")
                      }
                      variant="sidebar"
                      collapsed={false}
                    />
                  </li>
                ))}
              </ul>
            </nav>

            {/* Profile section */}
            <div className="border-t border-nav-border p-3">
              <Link
                href={profileLinks[role]}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-text-muted transition-colors hover:bg-nav-hover hover:text-text-inverse"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-nav-active text-sm font-semibold text-text-inverse">
                  {role.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-inverse capitalize">{role}</p>
                  <p className="truncate text-[11px] text-text-muted/60">{role}@liquifi.app</p>
                </div>
              </Link>
              <button
                onClick={async () => {
                  onClose();
                  try { await fetch("/api/auth/logout", { method: "POST" }); } catch { /* ponytail */ }
                  router.push("/login");
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-error transition-colors hover:bg-error-light"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Log out
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
