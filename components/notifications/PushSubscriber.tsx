"use client";

import { useEffect } from "react";

// Mounted once in the treasurer and adviser layouts. Registers the service
// worker and syncs the push subscription to the backend. Never prompts for
// permission — if the user has already granted it we subscribe silently; the
// browser's own permission prompt / settings is the entry point otherwise.

const PUBLIC_VAPID_KEY = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Url = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Url);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function PushSubscriber() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (!("PushManager" in window)) return;
    if (Notification.permission !== "granted") return;
    if (!PUBLIC_VAPID_KEY) return;

    let cancelled = false;

    (async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
          });
        }

        if (cancelled) return;

        const res = await fetch("/api/notifications/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription.toJSON()),
        });
        if (!res.ok) {
          console.warn("[push] subscribe sync failed", res.status);
        }
      } catch (err) {
        console.warn("[push] setup failed", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
