"use client";

import { useEffect } from "react";
import { ensurePushSubscription } from "@/lib/push-client";

// Mounted once in the treasurer and adviser layouts. Registers the service
// worker and, when the user has ALREADY granted notification permission,
// silently ensures a subscription exists. Never prompts — the first-login
// "Enable notifications" toast (PushEnableToast) is the permission entry point.

export function PushSubscriber() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (Notification.permission !== "granted") return;

    let cancelled = false;

    (async () => {
      const ok = await ensurePushSubscription();
      if (cancelled || ok) return;
      // best-effort on failure — a later load or the toast retries
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
