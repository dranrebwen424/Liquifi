import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-guard";
import { createInsforgeServer } from "@/lib/insforge-server";
import { getReportPdfBlob } from "@/lib/storage";
import { createNotification } from "@/lib/notifications";
import { anchorReport } from "@/agent/report-anchor";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

type Props = {
  params: Promise<{ reportId: string }>;
};

export async function POST(request: Request, { params }: Props) {
  try {
    const user = await requireRole("adviser");
    const { reportId } = await params;
    const insforge = await createInsforgeServer();

    const { data: report } = await insforge.database
      .from("reports")
      .select("id, event_id, fs_document_number, status")
      .eq("id", reportId)
      .single();
    if (!report) return errorResponse("Report not found.", 404);

    const { data: event } = await insforge.database
      .from("events")
      .select("id, department_id, name, status")
      .eq("id", report.event_id)
      .single();
    if (!event) return errorResponse("Event not found.", 404);
    if (event.department_id !== user.departmentId) {
      return errorResponse("Forbidden.", 403);
    }
    if (event.status === "archived") {
      return errorResponse("This event is archived.", 409);
    }

    // Count unresolved overspend entries for audit metadata (before stamping).
    const { data: unresolvedRows, error: countError } = await insforge.database
      .from("entries")
      .select("id")
      .eq("event_id", event.id)
      .eq("status", "deducted")
      .eq("causes_overspend", true)
      .is("overspend_resolved_at", null);
    if (countError) {
      console.error("[api/reports/approve] overspend count failed:", countError);
      return errorResponse("Failed to check overspend state.", 500);
    }
    const unresolvedCount = unresolvedRows?.length ?? 0;

    // 1. Acknowledge overspend first — stamp BEFORE the report flips approved.
    if (unresolvedCount > 0) {
      const { error: stampError } = await insforge.database
        .from("entries")
        .update({
          overspend_resolved_by: user.id,
          overspend_resolved_at: new Date().toISOString(),
        })
        .eq("event_id", event.id)
        .eq("status", "deducted")
        .eq("causes_overspend", true)
        .is("overspend_resolved_at", null);
      if (stampError) {
        console.error("[api/reports/approve] overspend stamp failed:", stampError);
        return errorResponse("Failed to acknowledge overspend.", 500);
      }
    }

    // 2. Race-safe approval — only if still pending_adviser_approval.
    const { data: updated, error: updateError } = await insforge.database
      .from("reports")
      .update({ status: "approved" })
      .eq("id", reportId)
      .eq("status", "pending_adviser_approval")
      .select("id");
    if (updateError) {
      console.error("[api/reports/approve] update failed:", updateError);
      return errorResponse("Failed to approve report.", 500);
    }
    if (!updated || updated.length === 0) {
      return errorResponse("This report has already been reviewed.", 409);
    }

    // 3. Polygon anchoring — soft-fail, never blocks the approval.
    let polygonTxHash: string | null = null;
    try {
      const { data: entries } = await insforge.database
        .from("entries")
        .select("id, amount")
        .eq("event_id", event.id)
        .eq("status", "deducted");
      const pdfBlob = await getReportPdfBlob(reportId);
      if (entries && pdfBlob) {
        polygonTxHash = await anchorReport({
          fsDocumentNumber: report.fs_document_number,
          pdfBytes: new Uint8Array(await pdfBlob.arrayBuffer()),
          entryIdsAndAmounts: entries,
        });
        if (polygonTxHash) {
          await insforge.database
            .from("reports")
            .update({ polygon_tx_hash: polygonTxHash })
            .eq("id", reportId);
        }
      }
    } catch (anchorErr) {
      console.error("[api/reports/approve] anchor skipped:", anchorErr);
    }

    // 4. Audit log.
    await insforge.database.from("audit_logs").insert([
      {
        actor_id: user.id,
        department_id: event.department_id,
        action: "report.approved",
        target_type: "report",
        target_id: reportId,
        metadata_json: {
          event_id: event.id,
          fs_document_number: report.fs_document_number,
          unresolved_overspend_count: unresolvedCount,
          polygon_tx_hash: polygonTxHash,
        },
      },
    ]);

    // 5. Notify the department's active treasurer — best-effort.
    try {
      const { data: treasurer } = await insforge.database
        .from("users")
        .select("id")
        .eq("department_id", event.department_id)
        .eq("role", "treasurer")
        .eq("account_status", "active")
        .maybeSingle();
      if (treasurer) {
        await createNotification(treasurer.id, "report_approved", {
          report_id: reportId,
          event_id: event.id,
          event_name: event.name,
          fs_document_number: report.fs_document_number,
        });
      }
    } catch (notifErr) {
      console.error("[api/reports/approve] notification failed:", notifErr);
    }

    revalidatePath("/adviser/reports");
    revalidatePath(`/adviser/reports/${event.id}`);
    revalidatePath("/treasurer/reports");
    revalidatePath(`/treasurer/reports/${event.id}`);
    revalidatePath("/treasurer/home");
    revalidatePath(`/treasurer/events/${event.id}`);

    return NextResponse.json({ success: true, polygon_tx_hash: polygonTxHash });
  } catch (err) {
    console.error("[api/reports/approve]", err);
    const status =
      err instanceof Error && "code" in err
        ? (err as Error & { status?: number }).status ?? 500
        : 500;
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error.",
      status,
    );
  }
}
