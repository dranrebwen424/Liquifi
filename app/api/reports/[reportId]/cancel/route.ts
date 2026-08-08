import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { requireRole } from "@/lib/auth-guard";

// Step 21 — cancel a report while it is still pending adviser approval.
// The treasurer may cancel anytime before the adviser acts; the event
// unlocks (is_locked is derived) and regeneration is allowed afterwards.
// Races an adviser approve/reject via a conditional update — 0 affected
// rows means the adviser already decided.

type Props = {
  params: Promise<{ reportId: string }>;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { reportId } = await params;

    const user = await requireRole("treasurer");
    const insforge = await createInsforgeServer();

    const { data: report, error: reportErr } = await insforge.database
      .from("reports")
      .select("id, event_id, fs_document_number, status, revision_count")
      .eq("id", reportId)
      .single();
    if (reportErr || !report) return errorResponse("Report not found.", 404);

    const { data: event, error: eventErr } = await insforge.database
      .from("events")
      .select("id, department_id, status")
      .eq("id", report.event_id)
      .single();
    if (eventErr || !event) return errorResponse("Report not found.", 404);
    if (user.departmentId && event.department_id !== user.departmentId) {
      return errorResponse("Report not found.", 404);
    }
    if (event.status === "archived") {
      return errorResponse("Event is archived.", 409);
    }
    if (report.status !== "pending_adviser_approval") {
      return errorResponse("Only pending reports can be cancelled.", 409);
    }

    // Conditional update — safe against a racing adviser approve/reject.
    const { data: updated, error: updateErr } = await insforge.database
      .from("reports")
      .update({ status: "cancelled" })
      .eq("id", reportId)
      .eq("status", "pending_adviser_approval")
      .select("id");
    if (updateErr || !updated || updated.length === 0) {
      return errorResponse("This report can no longer be cancelled.", 409);
    }

    await insforge.database.from("audit_logs").insert([
      {
        actor_id: user.id,
        department_id: event.department_id,
        action: "report.cancelled",
        target_type: "report",
        target_id: reportId,
        metadata_json: {
          event_id: event.id,
          fs_document_number: report.fs_document_number,
          revision_count: report.revision_count,
        },
      },
    ]);

    revalidatePath("/treasurer/reports");
    revalidatePath(`/treasurer/reports/${event.id}`);
    revalidatePath("/treasurer/home");
    revalidatePath(`/treasurer/events/${event.id}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && "code" in err) {
      const status = (err as Error & { status?: unknown }).status;
      return errorResponse(err.message, typeof status === "number" ? status : 403);
    }
    console.error("[api/reports/cancel]", err);
    return errorResponse("Something went wrong.", 500);
  }
}
