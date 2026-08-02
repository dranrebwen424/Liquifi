import { NextRequest, NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { requireRole } from "@/lib/auth-guard";
import { parseReceipt } from "@/agent/receipt-parser";
import { toParsedReceiptClient, type ReceiptParseResult } from "@/agent/types";
import { uploadReceipt } from "@/lib/storage";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"];
const HEIC_MIME = ["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"];
const HEIC_MESSAGE = "HEIC isn't supported. Please upload a JPG, PNG, or WEBP image.";

/** Guidance copy for model verdicts — the client renders the matching banner. */
const GUIDANCE = {
  invalid_document:
    "We couldn't read a receipt number or vendor from this image. If this is a real expense without a receipt (like a sari-sari store purchase), you can log it using No Receipt Entry — just fill in what was bought and the adviser will approve it.",
  borderline:
    "This photo looks blurry or unclear. Try a clearer photo, or log it as a No Receipt Entry.",
} as const;

function errorResponse(message: string, status: number, code?: string) {
  return NextResponse.json({ success: false, error: message, ...(code ? { code } : {}) }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const eventId = form.get("eventId");
    const image = form.get("image");

    if (typeof eventId !== "string" || !eventId) {
      return errorResponse("Event is required.", 400);
    }
    if (!(image instanceof File)) {
      return errorResponse("Receipt image is required.", 400);
    }

    // HEIC must be rejected BEFORE parsing — it is not counted against the 3-attempt fallback
    if (HEIC_MIME.includes(image.type) || image.name.toLowerCase().endsWith(".heic")) {
      return errorResponse(HEIC_MESSAGE, 422);
    }
    if (!ACCEPTED_MIME.includes(image.type)) {
      return errorResponse("Unsupported file type. Upload a JPG, PNG, or WEBP image.", 415);
    }
    if (image.size > MAX_SIZE) {
      return errorResponse("Image is too large (max 10MB).", 413);
    }

    // Treasurer of the owning department, event open and not locked (derived is_locked)
    const user = await requireRole("treasurer", undefined, async ({ user: guardUser }) => {
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

    // Parse — model verdicts (invalid/borderline) short-circuit with guidance, no row created;
    // only persistent extraction failure throws (parse_failed → counts toward the client fallback).
    const buffer = Buffer.from(await image.arrayBuffer());
    const dataUrl = `data:${image.type};base64,${buffer.toString("base64")}`;
    const insforge = await createInsforgeServer();
    let parsed: ReceiptParseResult;
    try {
      const outcome = await parseReceipt(dataUrl);
      if (outcome.outcome !== "valid") {
        const code = outcome.outcome === "invalid" ? "invalid_document" : "borderline";
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
      console.warn("[api/entries/receipt] parse failed:", parseError);
      const message =
        parseError instanceof Error ? parseError.message : "Could not extract receipt data.";
      return errorResponse(message, 422, "parse_failed");
    }

    // Duplicate check: same (document_type_raw + document_number) in this event,
    // excluding voided/discarded rows.
    if (parsed.document_number) {
      const { data: dup } = await insforge.database
        .from("entries")
        .select("id")
        .eq("event_id", eventId)
        .eq("document_type_raw", parsed.document_type_raw)
        .eq("document_number", parsed.document_number)
        .not("status", "in", "('voided','discarded')")
        .maybeSingle();
      if (dup) {
        return errorResponse(
          `${parsed.document_type_raw} ${parsed.document_number} is already logged in this event.`,
          409,
        );
      }
    }

    const entryId = crypto.randomUUID();
    const { error: insertErr } = await insforge.database.from("entries").insert([
      {
        id: entryId,
        event_id: eventId,
        created_by: user.id,
        type: "receipt",
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
      },
    ]);
    if (insertErr) {
      console.error("[api/entries/receipt] insert failed:", insertErr);
      return errorResponse("Failed to save the parsed receipt.", 500);
    }

    // Upload image; on failure remove the row so no orphan ai_parsed entry lingers
    let uploaded;
    try {
      uploaded = await uploadReceipt(eventId, entryId, image);
    } catch (uploadError) {
      console.error("[api/entries/receipt] upload failed:", uploadError);
      await insforge.database.from("entries").delete().eq("id", entryId).eq("event_id", eventId);
      return errorResponse("Failed to upload the receipt image.", 500);
    }

    await insforge.database.from("entries").update({ image_url: uploaded.key }).eq("id", entryId);

    // Audit
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
      entry: {
        id: entryId,
        event_id: eventId,
        status: "ai_parsed",
        image_url: uploaded.key,
      },
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
    console.error("[api/entries/receipt]", err);
    return errorResponse("Something went wrong.", 500);
  }
}
