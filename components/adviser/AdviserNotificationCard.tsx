"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BellRing,
  CircleAlert,
  CircleCheckBig,
  Clock3,
  FileCheck2,
  UserRoundPlus,
} from "lucide-react";
import LottiePlayer from "@/components/LottiePlayer";

export type AdviserHomeNotification = {
  id: string;
  title: string;
  body: string;
  type: string;
  url: string;
};

type Props = {
  notifications: AdviserHomeNotification[];
};

function notificationVisual(type: string) {
  if (type === "event_overspend") {
    return { Icon: CircleAlert, className: "border-error/60 bg-error/10 text-error" };
  }
  if (type === "entry_approved" || type === "report_approved") {
    return { Icon: CircleCheckBig, className: "border-success/60 bg-success/10 text-success" };
  }
  if (type === "treasurer_signup_pending") {
    return { Icon: UserRoundPlus, className: "border-info/60 bg-info/10 text-info" };
  }
  if (type === "report_ready_for_approval") {
    return { Icon: FileCheck2, className: "border-warning/60 bg-warning/10 text-warning" };
  }
  return { Icon: Clock3, className: "border-text-inverse/20 bg-nav-hover text-text-inverse" };
}

export function AdviserNotificationCard({ notifications }: Props) {
  const prefersReducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const visibleNotifications = useMemo(() => {
    if (notifications.length < 2) return notifications;
    return [
      notifications[activeIndex],
      notifications[(activeIndex + 1) % notifications.length],
    ];
  }, [activeIndex, notifications]);

  useEffect(() => {
    if (prefersReducedMotion || notifications.length < 2) return;
    const intervalId = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % notifications.length);
    }, 4200);
    return () => window.clearInterval(intervalId);
  }, [notifications.length, prefersReducedMotion]);

  return (
    <section className="relative isolate overflow-hidden rounded-xl border border-nav-border bg-surface-inverse px-4 py-4 shadow-card md:mt-6 md:px-6 md:py-5">
      <div className="relative z-10 max-w-[72%] md:max-w-[78%]">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-accent">
            <BellRing className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-text-inverse">
              <span className="md:hidden">Latest notification</span>
              <span className="hidden md:inline">Latest notifications</span>
            </h2>
            <p className="hidden text-xs text-text-inverse/60 md:block">
              {notifications.length > 0 ? "Keep reviews moving." : "You are all caught up."}
            </p>
            {notifications.length <= 0 && (
              <p className="text-xs text-text-inverse/60 md:hidden">You are all caught up.</p>
            )}
          </div>
        </div>

        {notifications.length === 0 ? (
          <p className="mt-1 py-6 pl-2 text-xs text-text-inverse/75">No new items need your<br className="md:hidden" /> attention.</p>
        ) : (
          <div className="space-y-2" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${visibleNotifications[0]?.id}-${visibleNotifications[1]?.id ?? ""}`}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, y: -3 }}
                transition={{ type: "spring", stiffness: 110, damping: 24, mass: 0.8 }}
                className="space-y-2"
              >
                {visibleNotifications.map((notification) => {
                  const { Icon, className } = notificationVisual(notification.type);
                  const item = (
                    <>
                      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold md:text-xs">{notification.title}</span>
                        <span className="mt-0.5 block line-clamp-1 text-[10px] font-normal text-text-inverse/65 md:text-[11px]">
                          {notification.body}
                        </span>
                      </span>
                    </>
                  );

                  return notification.url ? (
                    <Link
                      key={notification.id}
                      href={notification.url}
                      className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 transition-[color,transform] hover:scale-[1.01] active:scale-[0.98] ${className}`}
                    >
                      {item}
                    </Link>
                  ) : (
                    <div key={notification.id} className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 ${className}`}>
                      {item}
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>

      <LottiePlayer
        src="/adviser/Wumpus%20Hi.json"
        className="pointer-events-none absolute bottom-2 right-0 h-32 w-32 sm:h-36 sm:w-36 md:bottom-0 md:h-40 md:w-40"
      />
    </section>
  );
}
