import { NextRequest, NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { requireRole } from "@/lib/auth-guard";
import { getReceiptBlob } from "@/lib/storage";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> },
) {
  try {
    const { entryId } = await params;

    const insforge = await createInsforgeServer();
    const { data: entry, error } = await insforge.database
      .from("entries")
      .select("id, event_id, image_url")
      .eq("id", entryId)
      .single();

    if (error || !entry || !entry.image_url) {
      return errorResponse("Receipt not found.", 404);
    }

    const { data: event, error: eventError } = await insforge.database
      .from("events")
      .select("department_id")
      .eq("id", entry.event_id)
      .single();
    if (eventError || !event) {
      return errorResponse("Event not found.", 404);
    }

    // Treasurers/advisers scoped to the owning department; admin unrestricted
    await requireRole(["treasurer", "adviser"], event.department_id);

    const blob = await getReceiptBlob(entryId);
    return new Response(blob, {
      headers: {
        "Content-Type": blob.type || "image/jpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    if (err instanceof Error && "code" in err) {
      const status = (err as Error & { status?: unknown }).status;
      return errorResponse(err.message, typeof status === "number" ? status : 403);
    }
    console.error("[api/entries/image]", err);
    return errorResponse("Something went wrong.", 500);
  }
}
