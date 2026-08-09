import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-guard";
import { createInsforgeServer } from "@/lib/insforge-server";
import { createNotification } from "@/lib/notifications";

const RejectSchema = z.object({
  rejection_reason: z
    .string()
    .trim()
    .min(1, "Rejection reason is required.")
    .max(1000, "Rejection reason must be 1000 characters or fewer."),
  // Optional per-entry comments — only surfaced for unresolved overspend entries.
  comments: z
    .array(
      z.object({
        entry_id: z.string().uuid(),
        text: z.string().trim().min(1).max(1000),
      }),
    )
    .default([]),
});

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

    const body = await request.json().catch(() => null);
    const parsed = RejectSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message ?? "Invalid request.",
        400,
      );
    }
    const { rejection_reason, comments } = parsed.data;

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

    // Race-safe rejection — only if still pending_adviser_approval.
    const { data: updated, error: updateError } = await insforge.database
      .from("reports")
      .update({ status: "rejected" })
      .eq("id", reportId)
      .eq("status", "pending_adviser_approval")
      .select("id");
    if (updateError) {
      console.error("[api/reports/reject] update failed:", updateError);
      return errorResponse("Failed to reject report.", 500);
    }
    if (!updated || updated.length === 0) {
      return errorResponse("This report has already been reviewed.", 409);
    }

    // Entry-level comments (flagged/overspend entries).
    if (comments.length > 0) {
      const { error: commentsError } = await insforge.database
        .from("entry_comments")
        .insert(
          comments.map((c) => ({
            entry_id: c.entry_id,
            report_id: reportId,
            comment: c.text,
            created_by: user.id,
          })),
        );
      if (commentsError) {
        console.error("[api/reports/reject] comments failed:", commentsError);
      }
    }

    // Audit log.
    await insforge.database.from("audit_logs").insert([
      {
        actor_id: user.id,
        department_id: event.department_id,
        action: "report.rejected",
        target_type: "report",
        target_id: reportId,
        metadata_json: {
          event_id: event.id,
          fs_document_number: report.fs_document_number,
          rejection_reason,
          comment_count: comments.length,
        },
      },
    ]);

    // Notify the department's active treasurer — best-effort.
    try {
      const { data: treasurer } = await insforge.database
        .from("users")
        .select("id")
        .eq("department_id", event.department_id)
        .eq("role", "treasurer")
        .eq("account_status", "active")
        .maybeSingle();
      if (treasurer) {
        await createNotification(treasurer.id, "report_rejected", {
          report_id: reportId,
          event_id: event.id,
          event_name: event.name,
          fs_document_number: report.fs_document_number,
          rejection_reason,
        });
      }
    } catch (notifErr) {
      console.error("[api/reports/reject] notification failed:", notifErr);
    }

    revalidatePath("/adviser/reports");
    revalidatePath(`/adviser/reports/${event.id}`);
    revalidatePath("/treasurer/reports");
    revalidatePath(`/treasurer/reports/${event.id}`);
    revalidatePath("/treasurer/home");
    revalidatePath(`/treasurer/events/${event.id}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/reports/reject]", err);
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
