"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp, LogOut, PanelLeftClose, PanelLeftOpen, User } from "lucide-react";
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

const STORAGE_KEY = "liquifi:sidebar-collapsed";

export function Sidebar({ navItems, role }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setCollapsed(stored === "true");
        document.documentElement.style.setProperty("--sidebar-width", stored === "true" ? "72px" : "240px");
      }
    } catch { /* ponytail: SSR safe */ }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
        document.documentElement.style.setProperty("--sidebar-width", next ? "72px" : "240px");
        queueMicrotask(() => {
          window.dispatchEvent(new CustomEvent("sidebar:toggle", { detail: { collapsed: next } }));
        });
      } catch { /* ponytail */ }
      return next;
    });
  };

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
    <aside
      className="hidden bg-nav lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:flex lg:flex-col transition-[width] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
      style={{
        width: "var(--sidebar-width)",
      }}
    >
      {/* Logo + toggle */}
      <div className={cn(
        "flex h-16 items-center",
        collapsed ? "justify-center px-2" : "gap-3 px-5",
      )}>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="flex shrink-0 items-center gap-3 overflow-hidden"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-text-inverse font-bold text-sm text-nav">
                M
              </div>
              <span className="text-lg font-bold whitespace-nowrap text-white">
                Liquifi
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={toggleCollapsed}
          className={cn(
            "shrink-0 rounded-lg p-1.5 text-text-muted transition-colors hover:text-text-inverse",
            collapsed ? "mt-0" : "ml-auto",
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className={cn("flex-1 py-4", collapsed ? "px-2" : "px-3")}>
        {!collapsed && (
          <p className="mb-2 px-3 text-[11px] font-medium uppercase text-text-muted/60 tracking-[0.1em]">
            Menu
          </p>
        )}
        <motion.ul
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.04 } },
          }}
          className="flex flex-col gap-0.5"
        >
          {navItems.map((item) => (
            <motion.li
              key={item.href}
              variants={{
                hidden: { opacity: 0, x: -8 },
                visible: { opacity: 1, x: 0 },
              }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <NavItem
                {...item}
                isActive={
                  pathname === item.href || pathname.startsWith(item.href + "/")
                }
                variant="sidebar"
                collapsed={collapsed}
              />
            </motion.li>
          ))}
        </motion.ul>
      </nav>

      {/* User profile */}
      <div className={cn("relative border-t border-nav-border", collapsed ? "p-2" : "p-3")}>
        <button
          onClick={() => setProfileOpen((v) => !v)}
          className={cn(
            "flex w-full items-center rounded-xl text-text-muted transition-colors duration-200 hover:bg-nav-hover",
            collapsed ? "justify-center p-2" : "gap-3 px-3 py-2.5",
          )}
          aria-haspopup="menu"
          aria-expanded={profileOpen}
          title={collapsed ? role : undefined}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-nav-active text-sm font-semibold text-text-inverse">
            {role.charAt(0).toUpperCase()}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="min-w-0 flex-1 overflow-hidden text-left"
              >
                <p className="truncate text-sm font-medium text-text-inverse capitalize">
                  {role}
                </p>
                <p className="truncate text-[11px] text-text-muted/60">{role}@liquifi.app</p>
              </motion.div>
            )}
          </AnimatePresence>
          {!collapsed && (
            <ChevronUp
              className={cn(
                "h-4 w-4 shrink-0 text-text-muted/50 transition-transform duration-200",
                profileOpen && "rotate-180",
              )}
            />
          )}
        </button>

        <AnimatePresence>
          {profileOpen && (
            <motion.div
              ref={profileMenuRef}
              role="menu"
              initial={{ opacity: 0, scale: 0.95, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 6 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className={cn(
                "absolute z-50 rounded-xl border border-nav-border bg-nav py-1 shadow-xl",
                collapsed ? "bottom-14 left-2 right-2" : "bottom-16 left-3 right-3",
              )}
            >
              <Link
                href={profileLinks[role]}
                role="menuitem"
                onClick={() => setProfileOpen(false)}
                className={cn(
                  "flex items-center text-text-muted transition-colors duration-150 hover:bg-nav-hover hover:text-text-inverse",
                  collapsed ? "justify-center p-2" : "gap-2.5 px-3 py-2 text-sm",
                )}
                title={collapsed ? "Profile" : undefined}
              >
                <User className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Profile</span>}
              </Link>
              <button
                role="menuitem"
                onClick={async () => {
                  setProfileOpen(false);
                  try {
                    await fetch("/api/auth/logout", { method: "POST" });
                  } catch {
                    // ponytail: best-effort
                  }
                  router.push("/login");
                }}
                className={cn(
                  "flex w-full items-center text-error transition-colors duration-150 hover:bg-error-light",
                  collapsed ? "justify-center p-2" : "gap-2.5 px-3 py-2 text-sm",
                )}
                title={collapsed ? "Log out" : undefined}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Log out</span>}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}
