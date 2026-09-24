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
      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-error bg-surface px-5 py-2.5 text-sm font-medium text-error transition-colors hover:bg-error-lightest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      Log out
    </button>
  );
}
