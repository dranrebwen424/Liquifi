"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  type ComponentProps,
  type MouseEvent,
} from "react";

// Module state survives client-side navigation and resets on a full page load.
// false means this document has no earlier in-app page (direct link, bookmark,
// refresh), so `router.back()` would leave the app or do nothing.
let hasAppHistory = false;

/** Mount once in the root layout to record that an in-app navigation happened. */
export function AppHistoryTracker() {
  const pathname = usePathname();
  const previous = useRef(pathname);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    hasAppHistory = true;
  }, [pathname]);

  return null;
}

/**
 * Back control that returns to the page the user came from instead of a fixed
 * target. Plain left click uses history; modified/middle click and direct page
 * loads keep the `href` fallback (new tab, bookmark, refresh).
 */
export function BackLink({ href, onClick, ...props }: ComponentProps<typeof Link>) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    if (!hasAppHistory) return;
    event.preventDefault();
    router.back();
  }

  return <Link href={href} {...props} onClick={handleClick} />;
}
