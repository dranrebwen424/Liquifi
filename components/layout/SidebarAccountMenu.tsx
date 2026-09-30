"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Menu } from "@base-ui/react/menu";
import { Avatar } from "@base-ui/react/avatar";
import { ChevronsUpDown, LoaderCircle, LogOut, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SidebarAccount } from "@/lib/sidebar";
import type { Role } from "@/types";

type Props = {
  account: SidebarAccount;
  role: Role;
  collapsed?: boolean;
  mobile?: boolean;
  onNavigate?: () => void;
};

export function SidebarAccountMenu({ account, role, collapsed = false, mobile = false, onNavigate }: Props): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const initials = account.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || account.email[0]?.toUpperCase();
  const avatar = (
    <Avatar.Root className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-nav-hover text-xs font-semibold text-text-inverse ring-1 ring-text-inverse/15">
      <Avatar.Image src={account.avatarUrl ?? undefined} alt="" className="size-full object-cover" />
      <Avatar.Fallback>{initials}</Avatar.Fallback>
    </Avatar.Root>
  );

  async function logout(): Promise<void> {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout failed");
      // A full navigation also clears the signed-in client route cache.
      window.location.assign("/login");
    } catch {
      setError("Couldn't log out. Please try again.");
      setBusy(false);
      submitting.current = false;
    }
  }

  return (
    <Menu.Root open={open} onOpenChange={setOpen} modal={false}>
      <Menu.Trigger
        aria-label={`Account menu for ${account.name}`}
        title={collapsed ? account.name : undefined}
        className={cn(
          "flex min-h-14 w-full items-center rounded-lg text-left transition-colors duration-150 hover:bg-nav-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-inverse/70 data-popup-open:bg-nav-active motion-reduce:transition-none",
          collapsed ? "justify-center" : "gap-3 px-2.5 py-2",
        )}
      >
        {avatar}
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-text-inverse">{account.name}</span>
              <span className="mt-0.5 block text-xs capitalize text-text-muted">{role}</span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
          </>
        )}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          side={collapsed ? "right" : "top"}
          align={collapsed ? "end" : "start"}
          sideOffset={collapsed ? 12 : 8}
          collisionPadding={12}
          className={cn("z-[60]", mobile ? "lg:hidden" : "hidden lg:block")}
        >
          <Menu.Popup
            aria-label="Account"
            className="w-64 max-w-[calc(100vw-1.5rem)] origin-[var(--transform-origin)] rounded-xl border border-text-inverse/10 bg-nav-active p-1.5 text-text-inverse shadow-xl shadow-overlay/30 outline-none transition-[opacity,transform] duration-150 data-starting-style:scale-[0.98] data-starting-style:opacity-0 data-ending-style:scale-[0.98] data-ending-style:opacity-0 motion-reduce:transition-none"
          >
            <div className="flex items-center gap-3 px-3 py-3">
              {avatar}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{account.name}</p>
                <p className="mt-0.5 truncate text-xs text-text-muted" title={account.email}>{account.email}</p>
              </div>
            </div>
            <Menu.Separator className="mx-2 my-1 h-px bg-text-inverse/10" />
            <Menu.LinkItem
              render={<Link href={`/${role}/profile`} />}
              closeOnClick
              onClick={onNavigate}
              className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm outline-none data-highlighted:bg-text-inverse/10"
            >
              <UserRound className="size-4" aria-hidden="true" />
              Profile
            </Menu.LinkItem>
            <Menu.Item
              onClick={logout}
              closeOnClick={false}
              disabled={busy}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-sm outline-none data-highlighted:bg-text-inverse/10 data-disabled:cursor-wait data-disabled:opacity-60"
            >
              {busy ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <LogOut className="size-4" aria-hidden="true" />}
              {busy ? "Logging out…" : "Log out"}
            </Menu.Item>
            {error && <p role="alert" className="px-3 py-2 text-xs text-error-light">{error}</p>}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
