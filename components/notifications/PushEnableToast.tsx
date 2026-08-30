"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ensurePushSubscription } from "@/lib/push-client";

// First-login "Enable notifications" toast. Shown once per browser until the
// user either enables notifications or dismisses it. Web Push requires a user
// gesture to prompt, so the enable button is the prompt trigger.

const DISMISS_KEY = "liquifi_push_prompt_dismissed";

export function PushEnableToast() {
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const p = Notification.permission;
    setPermission(p);
    if (p !== "default") return; // granted or denied — nothing to prompt

    // Only prompt once per browser until dismissed (silently, no gesture today)
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      dismissed = false;
    }
    if (dismissed) return;

    setVisible(true);
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore storage errors
    }
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        const ok = await ensurePushSubscription();
        if (ok) {
          setVisible(false);
          try {
            localStorage.setItem(DISMISS_KEY, "1");
          } catch {
            // ignore
          }
        }
      } else {
        // denied — hide and let the user re-enable from browser site-settings
        dismiss();
      }
    } finally {
      setBusy(false);
    }
  }, [dismiss]);

  if (!visible || !permission) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className="flex w-full max-w-md items-start gap-3 rounded-lg border border-border bg-surface p-4 shadow-lg">
        <div className="flex-1">
          <p className="text-sm font-semibold text-text-primary">Stay in the loop</p>
          <p className="mt-0.5 text-sm text-text-secondary">
            {permission === "denied"
              ? "Notifications are blocked. Enable them in your browser's site settings to get budget and approval alerts."
              : "Enable notifications to get budget and approval alerts, even when you're not looking at this page."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {permission === "default" && (
            <Button size="sm" onClick={enable} disabled={busy}>
              {busy ? "Enabling…" : "Enable"}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={dismiss} disabled={busy}>
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}
