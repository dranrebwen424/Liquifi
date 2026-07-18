"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronUp, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Home",
    href: "/treasurer/home",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    label: "Reports",
    href: "/treasurer/reports",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    label: "Notifications",
    href: "/treasurer/notifications",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
  },
  {
    label: "Profile",
    href: "/treasurer/profile",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
];

export function TreasurerSidebar() {
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
        <ul className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent-light text-accent"
                      : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary",
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            );
          })}
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
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-medium text-text-primary">
              Treasurer
            </p>
            <p className="truncate text-xs text-text-muted">Treasurer</p>
          </div>
          <ChevronUp
            className={cn(
              "h-4 w-4 shrink-0 text-text-muted transition-transform",
              profileOpen && "rotate-180",
            )}
          />
        </button>

        {profileOpen && (
          <div
            ref={profileMenuRef}
            role="menu"
            className="absolute bottom-16 left-3 right-3 z-50 rounded-lg border border-border bg-surface py-1 shadow-card"
          >
            <Link
              href="/treasurer/profile"
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
          </div>
        )}
      </div>
    </aside>
  );
}
