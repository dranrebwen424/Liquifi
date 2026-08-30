import { NextRequest, NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { requireRole } from "@/lib/auth-guard";
import { uploadReceipt } from "@/lib/storage";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

/**
 * Client-side upload of a manual-entry supporting photo.
 *
 * Files CANNOT cross a Next.js Server Action boundary in this build, so the
 * manual form uploads the image here via FormData (the same transport the
 * receipt route uses) and passes the returned storage key to the server action.
 *
 * Upload is a pure side effect: no Entry row is created here. The row is only
 * inserted later by `submitManualEntry`, so a failed/gated submission never
 * leaves a row behind. The key references a blob tied to a uuid that simply
 * never gets a row — the same dead-blob orphan precedent as the manual insert.
 */
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const eventId = form.get("eventId");
    const entryId = form.get("entryId");
    const image = form.get("image");

    if (typeof eventId !== "string" || !eventId) {
      return errorResponse("Event is required.", 400);
    }
    if (typeof entryId !== "string" || !entryId) {
      return errorResponse("Entry is required.", 400);
    }
    if (!(image instanceof File)) {
      return errorResponse("Image is required.", 400);
    }
    if (!image.type.startsWith("image/")) {
      return errorResponse("Only image files are accepted.", 415);
    }
    if (image.size > MAX_SIZE) {
      return errorResponse("Image is too large (max 10MB).", 413);
    }

    // Same guard as the manual submit: treasurer of the owning department,
    // event open and not report-locked. Runs BEFORE upload so a gated/blocked
    // user never writes a blob.
    await requireRole("treasurer", undefined, async ({ user: guardUser }) => {
      const insforge = await createInsforgeServer();
      const { data: event, error } = await insforge.database
        .from("events")
        .select("id, department_id, status")
        .eq("id", eventId)
        .single();
      if (error || !event) throw new Error("Event not found.");
      if (event.department_id !== guardUser?.departmentId) throw new Error("Event not found.");
      if (event.status !== "open") throw new Error("Event is archived.");
      const { data: report, error: reportError } = await insforge.database
        .from("reports")
        .select("id")
        .eq("event_id", eventId)
        .in("status", ["pending_adviser_approval", "approved"])
        .maybeSingle();
      if (reportError || report) throw new Error("Event is locked by an active report.");
    });

    const uploaded = await uploadReceipt(eventId, entryId, image);

    return NextResponse.json({ success: true, key: uploaded.key });
  } catch (err) {
    if (err instanceof Error && "code" in err) {
      const status = (err as Error & { status?: unknown }).status;
      return errorResponse(err.message, typeof status === "number" ? status : 403);
    }
    console.error("[api/entries/manual/photo]", err);
    return errorResponse("Something went wrong.", 500);
  }
}
