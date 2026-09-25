"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

/**
 * Mobile-only logout button (desktop logout lives in the sidebar popover).
 * Same best-effort pattern as Sidebar: navigate to /login even if the
 * logout request fails.
 */
export function LogoutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } catch {
          // ponytail: best-effort — navigate anyway
        }
        router.push("/login");
      }}
      className="flex min-h-16 w-full items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-sm font-medium text-error-dark transition-colors hover:bg-error-lightest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2 sm:px-5"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-light">
        <LogOut className="h-4 w-4" aria-hidden="true" />
      </span>
      Log out
    </button>
  );
}
