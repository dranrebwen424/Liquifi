import { readFileSync } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { renderToBuffer } from "@react-pdf/renderer";
import { createInsforgeServer } from "@/lib/insforge-server";
import { requireRole } from "@/lib/auth-guard";
import { uploadReportPdf } from "@/lib/storage";
import { formatFsNumber } from "@/lib/report-number";
import { createNotification } from "@/lib/notifications";
import FinancialReportPDF from "@/components/reports/FinancialReportPDF";

// Step 20 — real report generation. Creates the Report row at
// pending_adviser_approval (which derives the event lock), assigns the FS
// number (reused on regeneration, else the department counter), stores the
// generated PDF, and notifies the adviser. The PDF is rendered and uploaded
// before creating the Report row; reserving a new FS number updates the counter first.

const SignatorySchema = z.object({
  position: z.string().trim().min(1),
  full_name: z.string().trim().min(1),
});

const GenerateBodySchema = z.object({
  eventId: z.string().uuid(),
  signatories: z.array(SignatorySchema).min(1),
});

const LOCKED_STATUSES = ["pending_adviser_approval", "approved"];

// ponytail: header.png lives in public/ (deployed with the function); read once
// at module load, embed as a data URI — no storage round-trip, no signed URLs.
const HEADER_IMAGE_SRC = `data:image/png;base64,${readFileSync(
  path.join(process.cwd(), "public", "FS-TEMPLATE", "header.png"),
).toString("base64")}`;

// Manual entries carry no issue_date — DATE falls back to created_at. Parse the
// "YYYY-MM-DD" prefix directly to dodge timezone shifts on full timestamps.
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
function formatReportDate(value?: string | null): string | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  return `${MONTHS[Number(match[2]) - 1]} ${Number(match[3])}, ${match[1]}`;
}

// SY/semester derived from the generation date:
// Jun–Dec = 1st semester of that year; Jan–May = 2nd semester of the prior year.
function currentSchoolYear(date: Date): { start: number; end: number; semester: string } {
  const year = date.getFullYear();
  return date.getMonth() >= 5
    ? { start: year, end: year + 1, semester: "1st Semester" }
    : { start: year - 1, end: year, semester: "2nd Semester" };
}

function formatAmount(value: number): string {
  return value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatQty(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return value % 1 === 0 ? String(value) : value.toFixed(2);
}

// ponytail: mirror of CATEGORIES labels without dragging lucide-react into the
// route bundle; add keys only if a new manual category ships.
const CATEGORY_LABELS: Record<string, string> = {
  transportation: "Transportation",
  meals: "Meals",
  honorarium: "Honorarium",
  supplies: "Supplies",
  printing: "Printing",
  rental: "Rental",
  others: "Other",
};

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
    const { data: unresolvedManual, error: unresolvedManualErr } = await insforge.database
      .from("entries")
      .select("id")
      .eq("event_id", eventId)
      .eq("type", "manual")
      .eq("status", "pending_approval")
      .limit(1)
      .maybeSingle();
    if (unresolvedManualErr) {
      console.error("[api/reports/generate] unresolved manual check failed:", unresolvedManualErr);
      return errorResponse("Failed to check manual entry state.", 500);
    }
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
      .select(
        "id, type, category, document_type_raw, document_number, issue_date, supplier_name, amount, item_breakdown, form_payload_json, causes_overspend, created_at",
      )
      .eq("event_id", eventId)
      .eq("status", "deducted")
      .order("issue_date", { ascending: true }) // Postgres ascending = NULLs last
      .order("created_at", { ascending: true });

    // Report rows follow the DOCX template: one row per deducted entry, DATE |
    // ITEM | QUANTITY | UNIT PRICE | TOTAL AMOUNT | OR NUMBER. Receipts carry a
    // camelCase item_breakdown; manual entries carry snake_case or none (flat
    // mode) plus a witness (required at submit) that doubles as the OR column
    // since manual entries have no OR number. Manual entries have no
    // issue_date, so DATE falls back to created_at.
    type BreakdownItem = { description?: string; qty?: number; unitPrice?: number; unit_price?: number };
    type FormPayload = { witness?: string; route?: string; occasion?: string; recipient?: string };

    const entries = (rawEntries ?? [])
      .map((entry) => {
        const isManual = entry.type === "manual";
        const breakdown = (entry.item_breakdown ?? []) as BreakdownItem[];
        const payload = (entry.form_payload_json ?? {}) as FormPayload;
        const items = breakdown.map((item) => ({
          description: String(item.description ?? ""),
          qty: typeof item.qty === "number" ? item.qty : null,
          unitPrice: isManual
            ? typeof item.unit_price === "number"
              ? item.unit_price
              : null
            : typeof item.unitPrice === "number"
              ? item.unitPrice
              : null,
        }));
        // Manual flat/other-mode entries have no breakdown — synthesize a
        // single descriptive line from the category label + context.
        const itemsOrFlat = items.length > 0
          ? items
          : isManual
            ? [
                {
                  description: [
                    CATEGORY_LABELS[entry.category ?? ""] ?? "Expense",
                    payload.occasion ?? payload.recipient ?? payload.route,
                  ]
                    .filter(Boolean)
                    .join(" — "),
                  qty: null,
                  unitPrice: null,
                },
              ]
            : [];
        return {
          date: formatReportDate(entry.issue_date ?? entry.created_at) ?? "",
          item: itemsOrFlat.length > 0
            ? itemsOrFlat.map((item) => item.description).join("\n")
            : (entry.supplier_name ?? entry.document_type_raw ?? "Expense"),
          quantity: itemsOrFlat.length > 0
            ? itemsOrFlat.map((item) => formatQty(item.qty)).join("\n")
            : undefined,
          unitPrice: itemsOrFlat.length > 0
            ? itemsOrFlat.map((item) => formatAmount(item.unitPrice ?? 0)).join("\n")
            : undefined,
          totalAmount: formatAmount(Number(entry.amount)),
          orNumber: entry.document_number ?? (isManual ? (payload.witness ?? "---") : "---"),
          isOverspend: Boolean(entry.causes_overspend),
        };
      })
      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
    // ponytail: subtract committed voided-entry amounts? voided rows are
    // excluded by the "deducted" filter, so sum is the report total.
    const totalSpent = (rawEntries ?? []).reduce((sum, entry) => sum + Number(entry.amount), 0);

    // Source-document convention: the date prints only on the row where it
    // changes; same-date runs leave it blank (template renders it verbatim).
    let lastDate = "";
    for (const entry of entries) {
      const current = entry.date;
      entry.date = current === lastDate ? "" : current;
      if (current) lastDate = current;
    }

    // ── Build + store the PDF before any DB write ──
    // Beginning Balance = the event's initial budget (first matched proof);
    // Total Collection = the overall budget (initial + verified increases).
    const { data: initialProof } = await insforge.database
      .from("budget_proofs")
      .select("resulting_budget_total")
      .eq("event_id", eventId)
      .eq("type", "initial")
      .eq("verification_status", "matched")
      .order("uploaded_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const beginningBalance = initialProof
      ? Number(initialProof.resulting_budget_total)
      : Number(event.budget_total); // legacy events without a proof row
    const totalCollection = Number(event.budget_total);
    const cashOnHand = totalCollection - totalSpent;
    const { start, end, semester } = currentSchoolYear(new Date());

    const reportId = crypto.randomUUID();
    const buffer = await renderToBuffer(
      <FinancialReportPDF
        data={{
          departmentName: `${dept.name.toUpperCase()} STUDENT COUNCIL (${dept.code})`,
          eventName: event.name,
          schoolYearStart: start,
          schoolYearEnd: end,
          semester,
          fsDocumentNumber,
          headerImageSrc: HEADER_IMAGE_SRC,
          beginningBalance,
          totalCollection,
          totalExpenses: totalSpent,
          cashOnHand,
          entries,
          signatories: signatories.map((signatory, index) => ({
            name: signatory.full_name,
            position: signatory.position,
            sortOrder: index,
          })),
        }}
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
        await createNotification(adviser.id, "report_ready_for_approval", {
          report_id: reportId,
          event_id: eventId,
          event_name: event.name,
          fs_document_number: fsDocumentNumber,
          revision_count: revisionCount,
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
