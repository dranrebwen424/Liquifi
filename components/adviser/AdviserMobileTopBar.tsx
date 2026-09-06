"use client";

import { usePathname } from "next/navigation";
import { MobileTopBar } from "@/components/treasurer/MobileTopBar";

type Props = {
  onOpenSidebar?: () => void;
  unreadCount?: number;
};

export function AdviserMobileTopBar({ onOpenSidebar, unreadCount = 0 }: Props) {
  const pathname = usePathname();

  // The view-all events page has its own back arrow + full browsing UI — the
  // hamburger/search/bell bar is redundant there, so vanish it.
  if (pathname === "/adviser/events") return null;

  return (
    <MobileTopBar
      onOpenSidebar={onOpenSidebar}
      unreadCount={unreadCount}
      homeHref="/adviser/home"
      notificationsHref="/adviser/notifications"
    />
  );
}