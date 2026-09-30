"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { NavItem, type NavItemConfig } from "@/components/layout/NavItem";
import { SidebarAccountMenu } from "@/components/layout/SidebarAccountMenu";
import type { SidebarAccount } from "@/lib/sidebar";

type Props = {
  open: boolean;
  onClose: () => void;
  navItems: NavItemConfig[];
  role: "treasurer" | "adviser" | "admin";
  account: SidebarAccount;
};

export function MobileSidebarDrawer({ open, onClose, navItems, role, account }: Props): React.JSX.Element {
  const pathname = usePathname();

  useEffect(() => { onClose(); }, [pathname, onClose]);

  useEffect(() => {
    if (!open) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = (): void => { if (desktop.matches) onClose(); };
    closeOnDesktop();
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, [open, onClose]);

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-overlay-alpha transition-opacity duration-200 data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none lg:hidden" />
        <Dialog.Popup aria-describedby={undefined} className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[calc(100vw-3rem)] flex-col border-r border-nav-border bg-nav shadow-xl outline-none transition-transform duration-300 ease-out data-starting-style:-translate-x-full data-ending-style:-translate-x-full motion-reduce:transition-none lg:hidden">
          <div className="flex h-20 shrink-0 items-center gap-3 px-5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-text-inverse text-sm font-bold text-nav">M</div>
            <Dialog.Title className="text-lg font-semibold tracking-tight text-text-inverse">Liquifi</Dialog.Title>
            <Dialog.Close aria-label="Close sidebar" className="ml-auto flex size-11 items-center justify-center rounded-md text-text-muted hover:bg-nav-hover hover:text-text-inverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-inverse/70">
              <X className="size-5" aria-hidden="true" />
            </Dialog.Close>
          </div>
          <nav aria-label={role + " navigation"} className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
            <p className="mb-3 px-3 text-xs font-medium uppercase tracking-wider text-text-muted">Workspace</p>
            <ul className="flex flex-col gap-1">
              {navItems.map((item) => (
                <li key={item.href}>
                  <NavItem {...item} isActive={pathname === item.href || pathname.startsWith(item.href + "/")} variant="sidebar" />
                </li>
              ))}
            </ul>
          </nav>
          <div className="shrink-0 border-t border-nav-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <SidebarAccountMenu account={account} role={role} mobile onNavigate={onClose} />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
