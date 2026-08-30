import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guard";
import { createNotification } from "@/lib/notifications";

// POST /api/notifications/test-push
// TEMP diagnostic route — sends a self-notification + web push to the acting
// user so we can verify end-to-end delivery. Remove after testing.
// Hits the same createNotification -> sendPushToUser path as real events.

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await requireRole(["treasurer", "adviser", "admin"]);

    // Exercise the real production delivery path: inserts a notification row
    // (shows in the list) AND sends a push to the user's subscription.
    await createNotification(user.id, "entry_approved", {
      event_id: "test",
      event_name: "Test event",
      amount: 0,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/notifications/test-push]", err);
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
