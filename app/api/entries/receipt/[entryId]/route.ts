import { NextRequest, NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { requireRole } from "@/lib/auth-guard";
import { parseReceipt } from "@/agent/receipt-parser";
import { toParsedReceiptClient } from "@/agent/types";
import { getReceiptBlob, deleteReceiptBlob } from "@/lib/storage";

/** Guidance copy for model verdicts — the client renders the matching banner. */
const GUIDANCE = {
  invalid_document:
    "We couldn't read a receipt number or vendor from this image. If this is a real expense without a receipt (like a sari-sari store purchase), you can log it using No Receipt Entry — just fill in what was bought and the adviser will approve it.",
  borderline:
    "This photo looks blurry or unclear. Try a clearer photo, or log it as a No Receipt Entry.",
  multiple_documents:
    "This photo contains more than one receipt. Upload one receipt at a time — take a separate photo of each receipt.",
} as const;

function errorResponse(message: string, status: number, code?: string) {
  return NextResponse.json({ success: false, error: message, ...(code ? { code } : {}) }, { status });
}

/**
 * Retry path for a receipt whose first inline parse transiently failed.
 * The provisional `pending_ai_parse` row + its blob already exist (from the
 * single-request POST) — this re-parses the stored blob on the SAME entryId,
 * so a retry never duplicates the image or orphans a row. The client polls
 * here, bounded, after Phase 1 returned `{ status: "parsing", entry }`.
 *
 * - Valid → promote to `ai_parsed`, return the parsed result.
 * - Verdict/duplicate → delete the provisional row + blob (never leave a durable row).
 * - Parse throws again → return `{ status: "parsing" }` (200) so the client retries.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ entryId: string }> }) {
  const { entryId } = await context.params;
  if (!entryId) return errorResponse("Entry is required.", 400);

  try {
    const insforge = await createInsforgeServer();

    const { data: entry, error: entryErr } = await insforge.database
      .from("entries")
      .select("id, event_id, status, image_url")
      .eq("id", entryId)
      .maybeSingle();
    if (entryErr) throw new Error("Failed to load the entry.");
    if (!entry) return errorResponse("Entry not found.", 404);

    const eventId = entry.event_id;

    // Treasurer of the owning department, event open and not locked (derived is_locked)
    const user = await requireRole("treasurer", undefined, async ({ user: guardUser }) => {
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

    if (entry.status !== "pending_ai_parse") {
      return errorResponse("This upload is no longer awaiting parsing.", 409);
    }

    const discardProvisional = async () => {
      const { error } = await insforge.database
        .from("entries")
        .delete()
        .eq("id", entryId)
        .eq("status", "pending_ai_parse");
      if (error) throw new Error("Failed to discard the provisional entry.");
      await deleteReceiptBlob(entryId, entry.image_url);
    };

    // Re-parse the stored blob (uploaded once, by the single-request POST).
    const blob = await getReceiptBlob(entryId);
    const buffer = Buffer.from(await blob.arrayBuffer());
    const dataUrl = `data:${blob.type || "image/jpeg"};base64,${buffer.toString("base64")}`;

    let parsed;
    try {
      const outcome = await parseReceipt(dataUrl);
      if (outcome.outcome !== "valid") {
        const code =
          outcome.outcome === "invalid"
            ? "invalid_document"
            : outcome.outcome === "multiple"
              ? "multiple_documents"
              : "borderline";
        await discardProvisional();
        await insforge.database.from("audit_logs").insert([
          {
            actor_id: user.id,
            department_id: user.departmentId,
            action: `entry.receipt_${code}`,
            target_type: "event",
            target_id: eventId,
            metadata_json: { event_id: eventId, reason: outcome.reason },
          },
        ]);
        return errorResponse(GUIDANCE[code], 422, code);
      }
      parsed = outcome.receipt;
    } catch (parseError) {
      console.warn("[api/entries/receipt/[entryId]] parse failed:", parseError);
      return NextResponse.json({ success: true, status: "parsing" });
    }

    if (parsed.document_number) {
      const { data: dup } = await insforge.database
        .from("entries")
        .select("id")
        .eq("event_id", eventId)
        .eq("document_type_raw", parsed.document_type_raw)
        .eq("document_number", parsed.document_number)
        .neq("id", entryId)
        .not("status", "in", "('voided','discarded')")
        .maybeSingle();
      if (dup) {
        await discardProvisional();
        return errorResponse(
          `${parsed.document_type_raw} ${parsed.document_number} is already logged in this event.`,
          409,
        );
      }
    }

    const { error: updateErr } = await insforge.database
      .from("entries")
      .update({
        status: "ai_parsed",
        amount: parsed.amount,
        document_type_raw: parsed.document_type_raw,
        document_type_category: parsed.document_type_category,
        category: parsed.category,
        document_number: parsed.document_number,
        issue_date: parsed.issue_date,
        issue_time: parsed.issue_time,
        supplier_name: parsed.supplier_name,
        item_breakdown: parsed.item_breakdown,
        ocr_raw_json: parsed,
      })
      .eq("id", entryId)
      .eq("status", "pending_ai_parse");
    if (updateErr) {
      console.error("[api/entries/receipt/[entryId]] update failed:", updateErr);
      return errorResponse("Failed to save the parsed receipt.", 500);
    }

    await insforge.database.from("audit_logs").insert([{
      actor_id: user.id,
      department_id: user.departmentId,
      action: "entry.receipt_parsed",
      target_type: "entry",
      target_id: entryId,
      metadata_json: {
        event_id: eventId,
        document_type_raw: parsed.document_type_raw,
        document_number: parsed.document_number,
        amount: parsed.amount,
      },
    }]);

    return NextResponse.json({
      success: true,
      status: "parsed",
      parsed: toParsedReceiptClient(parsed),
    });
  } catch (err) {
    if (err instanceof Error && "code" in err) {
      const status = (err as Error & { status?: unknown }).status;
      return errorResponse(
        err.message,
        typeof status === "number" ? status : 403,
      );
    }
    console.error("[api/entries/receipt/[entryId]]", err);
    return errorResponse("Something went wrong.", 500);
  }
}
