"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavItem, type NavItemConfig } from "@/components/layout/NavItem";
import { SidebarAccountMenu } from "@/components/layout/SidebarAccountMenu";
import { SIDEBAR_COLLAPSED_KEY, type SidebarAccount } from "@/lib/sidebar";

function subscribeToSidebar(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-sidebar"] });
  return () => observer.disconnect();
}

function getCollapsed(): boolean {
  return document.documentElement.dataset.sidebar !== "expanded";
}

type SidebarProps = {
  navItems: NavItemConfig[];
  role: "treasurer" | "adviser" | "admin";
  account: SidebarAccount;
};

export function Sidebar({ navItems, role, account }: SidebarProps): React.JSX.Element {
  const pathname = usePathname();
  // Read the same state that SidebarShell uses to size the content column.
  const collapsed = useSyncExternalStore(subscribeToSidebar, getCollapsed, () => true);

  function toggleCollapsed(): void {
    const next = !collapsed;
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
    } catch { /* The current tab still works without persistence. */ }
    window.dispatchEvent(new CustomEvent("sidebar:toggle", { detail: { collapsed: next } }));
  }

  return (
    <aside className="hidden w-[var(--sidebar-width)] border-r border-nav-border bg-nav transition-[width] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-reduce:transition-none lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:flex lg:flex-col">
      <div className={cn("flex h-20 shrink-0 items-center", collapsed ? "justify-center px-2" : "gap-3 px-5")}>
        {!collapsed && (
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-text-inverse text-sm font-bold text-nav">M</div>
            <span className="text-lg font-semibold tracking-tight text-text-inverse">Liquifi</span>
          </div>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          className={cn("flex size-11 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-nav-hover hover:text-text-inverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-inverse/70", !collapsed && "ml-auto")}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="size-5" aria-hidden="true" /> : <PanelLeftClose className="size-5" aria-hidden="true" />}
        </button>
      </div>

      <nav aria-label={role + " navigation"} className={cn("min-h-0 flex-1 overflow-y-auto py-4", collapsed ? "px-2" : "px-3")}>
        {!collapsed && <p className="mb-3 px-3 text-xs font-medium uppercase tracking-wider text-text-muted">Workspace</p>}
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <NavItem {...item} isActive={pathname === item.href || pathname.startsWith(item.href + "/")} variant="sidebar" collapsed={collapsed} />
            </li>
          ))}
        </ul>
      </nav>

      <div className={cn("shrink-0 border-t border-nav-border", collapsed ? "p-2" : "p-3")}>
        <SidebarAccountMenu key={pathname + ":" + collapsed} account={account} role={role} collapsed={collapsed} />
      </div>
    </aside>
  );
}
