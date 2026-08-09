"use client";

import { useRouter } from "next/navigation";

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
      className="w-full rounded-lg border border-error py-2.5 text-sm font-medium text-error transition-colors hover:bg-error-lightest"
    >
      Log out
    </button>
  );
}
