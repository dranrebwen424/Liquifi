import { NextRequest, NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { requireRole } from "@/lib/auth-guard";
import { getReportPdfBlob } from "@/lib/storage";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// Mirrors the receipt image proxy: streams the private signed-reports blob
// (pdf_url stores a key, never a browser-loadable URL) behind session auth
// scoped to the owning department.
//
// Defaults to inline (View — renders in the browser). Pass ?dl=1 to force an
// attachment download (Download button on the report file card).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const { reportId } = await params;
    const download = request.nextUrl.searchParams.get("dl") === "1";

    const insforge = await createInsforgeServer();
    const { data: report, error } = await insforge.database
      .from("reports")
      .select("id, event_id, pdf_url")
      .eq("id", reportId)
      .single();

    if (error || !report || !report.pdf_url) {
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

    // Treasurers/advisers scoped to the owning department; admin unrestricted
    await requireRole(["treasurer", "adviser", "admin"], event.department_id);

    const blob = await getReportPdfBlob(reportId);
    return new Response(blob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": download
          ? 'attachment; filename="report.pdf"'
          : 'inline; filename="report.pdf"',
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    if (err instanceof Error && "code" in err) {
      const status = (err as Error & { status?: unknown }).status;
      return errorResponse(err.message, typeof status === "number" ? status : 403);
    }
    console.error("[api/reports/pdf]", err);
    return errorResponse("Something went wrong.", 500);
  }
}
