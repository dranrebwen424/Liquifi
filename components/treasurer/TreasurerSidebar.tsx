"use client";

import { useState, type ComponentType } from "react";
import { Home, FileText, Bell, Plus } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import type { NavItemConfig } from "@/components/layout/NavItem";
import type { SidebarAccount } from "@/lib/sidebar";

const baseNavItems: NavItemConfig[] = [
  { label: "Home", href: "/treasurer/home", icon: Home },
  { label: "Reports", href: "/treasurer/reports", icon: FileText },
  { label: "Notifications", href: "/treasurer/notifications", icon: Bell },
];

export function TreasurerSidebar({ unreadCount = 0, account }: { unreadCount?: number; account: SidebarAccount }) {
  const navItems = baseNavItems.map((item) =>
    item.href === "/treasurer/notifications" ? { ...item, badge: unreadCount } : item,
  );
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [NewEventModal, setNewEventModal] = useState<ComponentType<{ open: boolean; onClose: () => void }> | null>(null);

  async function openNewEvent() {
    setNewEventOpen(true);
    if (!NewEventModal) {
      const { NewEventModal: Modal } = await import("@/components/events/NewEventModal");
      setNewEventModal(() => Modal);
    }
  }

  return (
    <>
      <Sidebar navItems={navItems} role="treasurer" account={account} primaryAction={(collapsed) => (
        <button
          type="button"
          onClick={openNewEvent}
          aria-label="New Event"
          title={collapsed ? "New Event" : undefined}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-xl bg-surface text-text-primary shadow-card transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-inverse focus-visible:ring-offset-2 focus-visible:ring-offset-nav ${collapsed ? "mx-auto w-11" : "w-full px-4 py-3"}`}
        >
          <Plus className="size-5 shrink-0" aria-hidden="true" />
          {!collapsed && <span className="text-sm font-medium">New Event</span>}
        </button>
      )} />
      {NewEventModal && <NewEventModal open={newEventOpen} onClose={() => setNewEventOpen(false)} />}
    </>
  );
}
