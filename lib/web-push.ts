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
  if (!vapidConfigured) {
    return;
  }
  let subs: unknown = null;
  try {
    const insforge = await createInsforgeServer();
    // ponytail: RLS policy `user_id = auth.uid()` blocks cross-user reads, so a
    // server action pushing to ANOTHER user's subscription gets 0 rows here. Use
    // the SECURITY DEFINER rpc (get_user_push_subscriptions) to bypass user RLS.
    const { data } = await insforge.database
      .rpc("get_user_push_subscriptions", { target_user: userId });
    subs = data;
    if (!data?.length) {
      return;
    }
    await Promise.allSettled(
      (subs as PushSubscriptionRow[]).map((row) =>
        sendPushNotification(toPushSubscription(row), payload),
      ),
    );
  } catch (err) {
    console.error("[web-push] sendPushToUser failed:", err);
  }
}
