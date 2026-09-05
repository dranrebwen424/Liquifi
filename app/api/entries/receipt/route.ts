import { NextRequest, NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { requireRole } from "@/lib/auth-guard";
import { uploadReceipt, deleteReceiptBlob } from "@/lib/storage";
import { parseReceipt } from "@/agent/receipt-parser";
import { toParsedReceiptClient } from "@/agent/types";

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
  multiple_documents:
    "This photo contains more than one receipt. Upload one receipt at a time — take a separate photo of each receipt.",
} as const;

function errorResponse(message: string, status: number, code?: string) {
  return NextResponse.json({ success: false, error: message, ...(code ? { code } : {}) }, { status });
}

/**
 * Single-request receipt parse (the fast path). The client already compressed
 * the image once (ReceiptUpload → prepareImage), so this route feeds that
 * in-memory File straight to Gemini — no storage round-trip on the happy path.
 *
 * Critical path: formData → [parallel: requireRole + Gemini] → dup check →
 * 1 insert → audit. The blob upload runs after auth and overlaps the model call
 * (it's only needed to make a transient failure retryable via [entryId]).
 *
 * On success the row is inserted directly as `ai_parsed` (no provisional hop).
 * On a verdict/duplicate the blob is deleted (no durable row). On a transient
 * Gemini failure a `pending_ai_parse` row + the already-uploaded blob remain so
 * the client can retry idempotently against the same entryId.
 *
 * Gemini keeps its 8s timeout; with storage off the critical path it's ample.
 */
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

    // HEIC must be rejected BEFORE any row is created
    if (HEIC_MIME.includes(image.type) || image.name.toLowerCase().endsWith(".heic")) {
      return errorResponse(HEIC_MESSAGE, 422);
    }
    if (!ACCEPTED_MIME.includes(image.type)) {
      return errorResponse("Unsupported file type. Upload a JPG, PNG, or WEBP image.", 415);
    }
    if (image.size > MAX_SIZE) {
      return errorResponse("Image is too large (max 10MB).", 413);
    }

    const entryId = crypto.randomUUID();
    const dataUrl = `data:${image.type || "image/jpeg"};base64,${Buffer.from(await image.arrayBuffer()).toString("base64")}`;

    // Start the long pole (Gemini) immediately; auth runs in parallel.
    const parsePromise = parseReceipt(dataUrl);
    parsePromise.catch(() => {}); // noop guard — early auth/upload returns must not leak rejections

    // Treasurer of the owning department, event open and not locked (derived is_locked).
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

    // Upload the blob once auth passed — overlaps the rest of the Gemini call.
    let uploaded;
    try {
      uploaded = await uploadReceipt(eventId, entryId, image);
    } catch (uploadError) {
      console.error("[api/entries/receipt] upload failed:", uploadError);
      return errorResponse("Failed to upload the receipt image.", 500);
    }
    const imageUrl = uploaded.key;
    const insforge = await createInsforgeServer();

    const deleteBlob = async () => {
      await deleteReceiptBlob(entryId, imageUrl);
    };

    let parsed;
    try {
      const outcome = await parsePromise;
      if (outcome.outcome !== "valid") {
        const code =
          outcome.outcome === "invalid"
            ? "invalid_document"
            : outcome.outcome === "multiple"
              ? "multiple_documents"
              : "borderline";
        await deleteBlob();
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
      // Transient parse failure (Gemini timeout/transport). Keep the uploaded blob +
      // a provisional row so the client retries this same entryId; the client bounds it.
      console.warn("[api/entries/receipt] parse failed:", parseError);
      const { error: insertErr } = await insforge.database.from("entries").insert([
        {
          id: entryId,
          event_id: eventId,
          created_by: user.id,
          type: "receipt",
          status: "pending_ai_parse",
          image_url: imageUrl,
          amount: 0,
        },
      ]);
      if (insertErr) {
        console.error("[api/entries/receipt] provisional insert failed:", insertErr);
        await deleteBlob().catch(() => {});
        return errorResponse("Failed to save the upload.", 500);
      }
      await insforge.database.from("audit_logs").insert([
        {
          actor_id: user.id,
          department_id: user.departmentId,
          action: "entry.receipt_parse_retry",
          target_type: "entry",
          target_id: entryId,
          metadata_json: { event_id: eventId },
        },
      ]);
      return NextResponse.json(
        { success: true, status: "parsing", entry: { id: entryId } },
        { status: 200 },
      );
    }

    // Duplicate check: same (document_type_raw + document_number) in this event,
    // excluding voided/discarded rows (nothing to exclude yet — row not inserted).
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
        await deleteBlob();
        return errorResponse(
          `${parsed.document_type_raw} ${parsed.document_number} is already logged in this event.`,
          409,
        );
      }
    }

    // Single insert straight to ai_parsed — no provisional hop on the happy path.
    const { error: insertErr } = await insforge.database.from("entries").insert([
      {
        id: entryId,
        event_id: eventId,
        created_by: user.id,
        type: "receipt",
        status: "ai_parsed",
        image_url: imageUrl,
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
      await deleteBlob().catch(() => {});
      return errorResponse("Failed to save the parsed receipt.", 500);
    }

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
      status: "parsed",
      entry: { id: entryId, event_id: eventId, status: "ai_parsed" },
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