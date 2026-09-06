"use client";

import { MobileTopBar } from "@/components/treasurer/MobileTopBar";

type Props = {
  onOpenSidebar?: () => void;
  unreadCount?: number;
};

export function AdviserMobileTopBar({ onOpenSidebar, unreadCount = 0 }: Props) {
  return (
    <MobileTopBar
      onOpenSidebar={onOpenSidebar}
      unreadCount={unreadCount}
      homeHref="/adviser/home"
      notificationsHref="/adviser/notifications"
    />
  );
}
