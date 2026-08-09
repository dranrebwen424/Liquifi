"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "liquifi:sidebar-collapsed";

/**
 * Shared shell that syncs main content padding with the collapsible Sidebar.
 * On mobile: no sidebar offset. On desktop: left padding synced with sidebar.
 */
export function SidebarShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setCollapsed(stored === "true");
    } catch { /* ponytail: SSR safe */ }

    const onToggle = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.collapsed === "boolean") {
        setCollapsed(detail.collapsed);
      }
    };
    window.addEventListener("sidebar:toggle", onToggle);

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue !== null) {
        setCollapsed(e.newValue === "true");
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("sidebar:toggle", onToggle);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Sidebar 64/220px
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      collapsed ? "64px" : "220px",
    );
  }, [collapsed]);

  return (
    <main className="px-4 py-6 pb-20 transition-[padding] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] md:px-12 md:py-8 md:pb-0 lg:pl-[calc(var(--sidebar-width)+48px)]">
      {children}
    </main>
  );
}
