// Client-side Web Push helpers — browser only.
// Shared by PushSubscriber (silent re-subscribe for already-granted users)
// and PushEnableToast (gesture-triggered first-login enable). Never imported
// into server components.

export const VAPID_KEY = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY ?? "";

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

/**
 * Get-or-create a push subscription and sync it to the backend. Caller must
 * guarantee notification permission is already granted (web push requires a
 * user gesture to prompt). Returns true on success.
 */
export async function ensurePushSubscription(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!("PushManager" in window)) return false;
  if (!VAPID_KEY) return false;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
      });
    }

    const res = await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });
    return res.ok;
  } catch (err) {
    console.warn("[push] subscribe failed", err);
    return false;
  }
}
