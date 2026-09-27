import { NextRequest, NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { requireRole } from "@/lib/auth-guard";
import { getSignedReportPageBlob } from "@/lib/storage";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

/**
 * Streams an uploaded signed-report page. The `signed-reports` bucket is
 * private and the SDK has no signed URLs, so every page image is read through
 * this session-authed proxy. `?i=N` is the 0-based page index.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const { reportId } = await params;
    const rawIndex = request.nextUrl.searchParams.get("i");
    const index = rawIndex ? Number.parseInt(rawIndex, 10) : 0;

    const insforge = await createInsforgeServer();
    const { data: report, error } = await insforge.database
      .from("reports")
      .select("id, event_id")
      .eq("id", reportId)
      .single();

    if (error || !report) {
      return errorResponse("Report not found.", 404);
    }

    const { data: event, error: eventError } = await insforge.database
      .from("events")
      .select("department_id")
      .eq("id", report.event_id)
      .single();
    if (eventError || !event) {
      return errorResponse("Event not found.", 404);
    }

    // Treasurers/advisers scoped to the owning department; admin unrestricted.
    await requireRole(["treasurer", "adviser", "admin"], event.department_id);

    const blob = await getSignedReportPageBlob(reportId, Number.isFinite(index) ? index : 0);
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
    console.error("[api/reports/signed-page]", err);
    return errorResponse("Something went wrong.", 500);
  }
}
