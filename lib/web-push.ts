import webpush from "web-push";
import { createInsforgeServer } from "@/lib/insforge-server";

// VAPID details — module scope, per library-docs.md. Guarded: when the keys
// are absent (fresh checkout before env setup) every send no-ops so nothing
// in the app ever breaks because push is unconfigured.
const vapidConfigured = Boolean(
  process.env.WEB_PUSH_PUBLIC_KEY &&
    process.env.WEB_PUSH_PRIVATE_KEY &&
    process.env.WEB_PUSH_SUBJECT,
);

if (vapidConfigured) {
  webpush.setVapidDetails(
    process.env.WEB_PUSH_SUBJECT!,
    process.env.WEB_PUSH_PUBLIC_KEY!,
    process.env.WEB_PUSH_PRIVATE_KEY!,
  );
}

export type PushPayload = { title: string; body: string; url: string };

type PushSubscriptionRow = {
  endpoint: string;
  keys_json: { p256dh?: string; auth?: string } | null;
};

function toPushSubscription(row: PushSubscriptionRow): webpush.PushSubscription {
  return {
    endpoint: row.endpoint,
    expirationTime: null,
    keys: {
      p256dh: row.keys_json?.p256dh ?? "",
      auth: row.keys_json?.auth ?? "",
    },
  };
}

/**
 * Send one push message to one subscription. On a 410 Gone response the
 * subscription is expired — delete it from push_subscriptions immediately.
 */
export async function sendPushNotification(
  subscription: webpush.PushSubscription,
  payload: PushPayload,
) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      "statusCode" in error &&
      (error as { statusCode: number }).statusCode === 410
    ) {
      try {
        const insforge = await createInsforgeServer();
        await insforge.database
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", subscription.endpoint);
      } catch (cleanupErr) {
        console.error("[web-push] 410 cleanup failed:", cleanupErr);
      }
    } else {
      // 404/400 etc. — stale endpoint but not clearly dead; log and move on
      console.error("[web-push] sendNotification failed:", error);
    }
  }
}

/**
 * Best-effort push to every subscription a user has registered. Never throws.
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!vapidConfigured) return;
  try {
    const insforge = await createInsforgeServer();
    const { data: subs } = await insforge.database
      .from("push_subscriptions")
      .select("endpoint, keys_json")
      .eq("user_id", userId);
    if (!subs?.length) return;
    await Promise.allSettled(
      subs.map((row) =>
        sendPushNotification(toPushSubscription(row as PushSubscriptionRow), payload),
      ),
    );
  } catch (err) {
    console.error("[web-push] sendPushToUser failed:", err);
  }
}
