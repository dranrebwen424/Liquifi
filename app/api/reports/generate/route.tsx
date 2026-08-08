import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { renderToBuffer } from "@react-pdf/renderer";
import { createInsforgeServer } from "@/lib/insforge-server";
import { requireRole } from "@/lib/auth-guard";
import { uploadReportPdf } from "@/lib/storage";
import { formatFsNumber } from "@/lib/report-number";
import { ReportPdf } from "@/components/reports/ReportPdf";

// Step 20 — real report generation. Creates the Report row at
// pending_adviser_approval (which derives the event lock), assigns the FS
// number (reused on regeneration, else the department counter), stores the
// generated PDF, and notifies the adviser. The PDF is rendered and uploaded
// BEFORE any DB write so a failure leaves nothing behind.

const SignatorySchema = z.object({
  position: z.string().trim().min(1),
  full_name: z.string().trim().min(1),
});

const GenerateBodySchema = z.object({
  eventId: z.string().uuid(),
  signatories: z.array(SignatorySchema).min(1),
});

const LOCKED_STATUSES = ["pending_adviser_approval", "approved"];

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const body = GenerateBodySchema.safeParse(await request.json());
    if (!body.success) return errorResponse("Invalid request.", 400);
    const { eventId, signatories } = body.data;

    const user = await requireRole("treasurer");
    const insforge = await createInsforgeServer();

    // ── Preconditions (server boundary; client buttons are cosmetic) ──
    const { data: event, error: eventErr } = await insforge.database
      .from("events")
      .select("id, name, department_id, status, budget_total")
      .eq("id", eventId)
      .single();
    if (eventErr || !event) return errorResponse("Event not found.", 404);
    if (user.departmentId && event.department_id !== user.departmentId) {
      return errorResponse("Event not found.", 404);
    }
    if (event.status !== "open") return errorResponse("Event is archived.", 409);

    // All manual entries must be resolved (approved/rejected/withdrawn rows
    // are deleted) before the report can lock the event.
    const { data: unresolvedManual } = await insforge.database
      .from("entries")
      .select("id")
      .eq("event_id", eventId)
      .eq("type", "manual")
      .eq("status", "pending_approval")
      .maybeSingle();
    if (unresolvedManual) {
      return errorResponse("Resolve pending manual entries before generating the report.", 409);
    }

    // A pending/approved report locks the event; regeneration is a new
    // revision of the latest report, which cancels (Step 21) first.
    const { data: lockedReport } = await insforge.database
      .from("reports")
      .select("id")
      .eq("event_id", eventId)
      .in("status", LOCKED_STATUSES)
      .maybeSingle();
    if (lockedReport) {
      return errorResponse("Event is locked by an active report.", 409);
    }

    // ── Department + FS document number ──
    const { data: dept, error: deptErr } = await insforge.database
      .from("departments")
      .select("name, code")
      .eq("id", event.department_id)
      .maybeSingle();
    if (deptErr || !dept) return errorResponse("Department not found.", 404);

    // The FS number is anchored to the EVENT, not to how many reports were
    // generated: the first report of an event takes the next department/year
    // counter value, and every regeneration (after cancel/rejection) reuses
    // that same number with revision_count incremented. Reports are never
    // overwritten, so any report row for the event carries the anchor.
    const { data: reportRows } = await insforge.database
      .from("reports")
      .select("fs_document_number, revision_count, generated_at")
      .eq("event_id", eventId)
      .order("generated_at", { ascending: true });

    let fsDocumentNumber: string;
    let revisionCount: number;
    if (reportRows && reportRows.length > 0) {
      // First report ever assigned for this event (generated_at asc) — its
      // number is the event's number forever. Max revision keeps the count
      // correct even across multiple cancelled/rejected revisions.
      fsDocumentNumber = reportRows[0].fs_document_number;
      revisionCount =
        Math.max(...reportRows.map((row) => row.revision_count)) + 1;
    } else {
      // First report: read-then-increment the department/year counter
      // (single active treasurer per department makes this safe).
      const year = new Date().getFullYear();
      const { data: counter } = await insforge.database
        .from("department_report_counters")
        .select("last_sequence_number")
        .eq("department_id", event.department_id)
        .eq("year", year)
        .maybeSingle();
      const seq = (counter?.last_sequence_number ?? 0) + 1;

      if (counter) {
        await insforge.database
          .from("department_report_counters")
          .update({ last_sequence_number: seq })
          .eq("department_id", event.department_id)
          .eq("year", year);
      } else {
        await insforge.database
          .from("department_report_counters")
          .insert([{ department_id: event.department_id, year, last_sequence_number: seq }]);
      }
      fsDocumentNumber = formatFsNumber(dept.code, year, seq);
      revisionCount = 1;
    }

    // ── Deducted entries are the report content ──
    const { data: rawEntries } = await insforge.database
      .from("entries")
      .select("id, document_type_raw, document_number, issue_date, supplier_name, amount, causes_overspend")
      .eq("event_id", eventId)
      .eq("status", "deducted")
      .order("issue_date", { ascending: true }) // Postgres ascending = NULLs last
      .order("created_at", { ascending: true });

    // Liquidation report rows: one per deducted entry. Per-entry Approved
    // Budget is not tracked — only event.budget_total — so the template
    // renders "—" for per-row budget/variance; the TOTAL row carries the
    // real numbers.
    const entries = (rawEntries ?? []).map((entry) => ({
      description: entry.supplier_name ?? entry.document_type_raw ?? "Expense",
      date: entry.issue_date,
      documentType: entry.document_type_raw,
      documentNumber: entry.document_number,
      amount: Number(entry.amount),
    }));
    const totalSpent = entries.reduce((sum, entry) => sum + entry.amount, 0);

    // ── Build + store the PDF before any DB write ──
    const reportId = crypto.randomUUID();
    const buffer = await renderToBuffer(
      <ReportPdf
        departmentName={dept.name}
        departmentCode={dept.code}
        eventName={event.name}
        fsDocumentNumber={fsDocumentNumber}
        generatedDate={new Date().toLocaleDateString("en-PH", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
        entries={entries}
        budgetTotal={Number(event.budget_total)}
        totalSpent={totalSpent}
        signatories={signatories.map((signatory, index) => ({
          position: signatory.position,
          fullName: signatory.full_name,
          sortOrder: index,
        }))}
      />,
    );
    // ponytail: key is not browser-loadable; the pdf proxy route streams it
    const pdfKey = await uploadReportPdf(
      event.department_id,
      reportId,
      new Blob([new Uint8Array(buffer)], { type: "application/pdf" }), // fresh ArrayBuffer — Buffer is not a BlobPart
    );

    // ── Persist ──
    const { data: report, error: reportErr } = await insforge.database
      .from("reports")
      .insert([
        {
          id: reportId,
          event_id: eventId,
          generated_by: user.id,
          fs_document_number: fsDocumentNumber,
          status: "pending_adviser_approval",
          revision_count: revisionCount,
          pdf_url: pdfKey,
        },
      ])
      .select()
      .single();
    if (reportErr || !report) {
      console.error("[api/reports/generate] report insert failed:", reportErr);
      return errorResponse("Failed to save the report.", 500);
    }

    await insforge.database.from("report_signatories").insert(
      signatories.map((signatory, index) => ({
        report_id: reportId,
        position: signatory.position,
        full_name: signatory.full_name,
        sort_order: index,
      })),
    );

    await insforge.database.from("audit_logs").insert([
      {
        actor_id: user.id,
        department_id: event.department_id,
        action: "report.generated",
        target_type: "report",
        target_id: reportId,
        metadata_json: {
          event_id: eventId,
          fs_document_number: fsDocumentNumber,
          revision_count: revisionCount,
          signatory_count: signatories.length,
        },
      },
    ]);

    // Notify the department's active adviser — best-effort, never fails the route.
    try {
      const { data: adviser } = await insforge.database
        .from("users")
        .select("id")
        .eq("department_id", event.department_id)
        .eq("role", "adviser")
        .eq("account_status", "active")
        .maybeSingle();
      if (adviser) {
        await insforge.database.from("notifications").insert({
          user_id: adviser.id,
          type: "report_ready_for_approval",
          payload_json: {
            report_id: reportId,
            event_id: eventId,
            event_name: event.name,
            fs_document_number: fsDocumentNumber,
            revision_count: revisionCount,
          },
          read: false,
        });
      }
    } catch (notifErr) {
      console.error("[api/reports/generate] notification failed:", notifErr);
    }

    revalidatePath("/treasurer/reports");
    revalidatePath(`/treasurer/reports/${eventId}`);
    revalidatePath("/treasurer/home");
    revalidatePath(`/treasurer/events/${eventId}`);

    return NextResponse.json({
      success: true,
      report: {
        id: reportId,
        fs_document_number: fsDocumentNumber,
        revision_count: revisionCount,
      },
    });
  } catch (err) {
    if (err instanceof Error && "code" in err) {
      const status = (err as Error & { status?: unknown }).status;
      return errorResponse(err.message, typeof status === "number" ? status : 403);
    }
    console.error("[api/reports/generate]", err);
    return errorResponse("Something went wrong.", 500);
  }
}
