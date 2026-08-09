import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth-guard";
import { createInsforgeServer } from "@/lib/insforge-server";

// POST /api/notifications/subscribe
// Body: the PushSubscription.toJSON() shape — { endpoint, keys: { p256dh, auth }, expirationTime }.
// Replaces any existing row with the same endpoint (idempotent — the service
// worker re-posts on pushsubscriptionchange and the client on every load).

export const dynamic = "force-dynamic";

const SubscribeSchema = z.object({
  endpoint: z.string().url().max(500),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(request: Request) {
  try {
    // Any authenticated role may register a push subscription.
    const user = await requireRole(["treasurer", "adviser", "admin"]);

    const body = await request.json();
    const parsed = SubscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid subscription payload." },
        { status: 400 },
      );
    }

    const { endpoint, keys } = parsed.data;
    const insforge = await createInsforgeServer();

    // Remove stale rows with the same endpoint, then insert fresh.
    await insforge.database.from("push_subscriptions").delete().eq("endpoint", endpoint);

    const { error } = await insforge.database.from("push_subscriptions").insert({
      user_id: user.id,
      endpoint,
      keys_json: keys,
    });

    if (error) {
      console.error("[api/notifications/subscribe] insert failed:", error);
      return NextResponse.json(
        { error: "Failed to save subscription." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/notifications/subscribe]", err);
    const status =
      err instanceof Error && "code" in err
        ? (err as Error & { status?: number }).status ?? 500
        : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error." },
      { status },
    );
  }
}
