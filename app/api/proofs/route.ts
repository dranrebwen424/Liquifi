import { NextRequest, NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { requireRole } from "@/lib/auth-guard";
import { uploadBudgetProof, deleteBudgetProofBlob } from "@/lib/storage";
import { parseBudgetProof } from "@/agent/budget-proof-parser";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGES = 5;
const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"];
const HEIC_MIME = ["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"];
const HEIC_MESSAGE = "HEIC isn't supported. Please upload a JPG, PNG, or WEBP image.";
const MATCH_TOLERANCE = 0.01; // within one centavo → matched (decision: to-the-cent)

/** Guidance copy for model verdicts — the client renders the matching banner. */
const GUIDANCE = {
  invalid_document:
    "We couldn't read a budget amount from this document. Upload clearer photos of the funding letter or approved budget document.",
  borderline: "One or more photos look blurry or unclear. Try clearer photos of the document.",
  multiple_documents:
    "One or more photos contain more than one document. Upload one budget document per photo.",
} as const;

/** Copy for every initial-proof failure — the event is rolled back, never left unverified. */
const INITIAL_REJECTED_MESSAGE =
  "The budget proof couldn't be verified — the event was not created. Review your amount and photo, then try again.";

function errorResponse(message: string, status: number, code?: string) {
  return NextResponse.json({ success: false, error: message, ...(code ? { code } : {}) }, { status });
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Budget proof upload + verification (POST, multipart).
 *
 * One request per proof, up to MAX_IMAGES photos per request. Form fields:
 * eventId, type ("initial" | "increase"), claimedAmount (numeric string),
 * image (File, repeated).
 *
 * Guard: treasurer of the owning department; event open. Increases are blocked
 * while the event is locked (pending/approved report) — decision #1.
 *
 * Verification: Gemini extracts the budget amount from EVERY photo. All photos
 * must be valid budget documents; the claim matches if ANY one of them extracts
 * it within ₱0.01. `ai_extracted_amount` stores the first matching amount (or the
 * first extracted on mismatch).
 *
 * Initial proofs are all-or-nothing: any failure (verdict, mismatch, transient
 * parse error, upload error) DELETES the event — only a matched proof leaves a
 * live event. Increase mismatches persist the row as an audit and leave the
 * budget unchanged; increase verdicts/transients behave as before (no row).
 *
 *  - initial matched:   proof row with resulting_budget_total = claim (the claim
 *                       already seeded events.budget_total at creation).
 *  - increase matched:  events.budget_total += claim; resulting = new total.
 *  - increase mismatch: row PERSISTS (verification_status mismatch, resulting
 *                       NULL); budget left unchanged.
 *  - verdict (either):  no row, all blobs deleted, 422 with guidance; initial
 *                       also deletes the event.
 *  - transient (either): no row, all blobs deleted, 502; initial also deletes
 *                       the event — the client just resends the whole form.
 */
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const eventId = form.get("eventId");
    const rawType = form.get("type");
    const rawClaimed = form.get("claimedAmount");
    const images = form.getAll("image").filter((v): v is File => v instanceof File);

    if (typeof eventId !== "string" || !eventId) return errorResponse("Event is required.", 400);
    if (rawType !== "initial" && rawType !== "increase") return errorResponse("Type is required.", 400);
    const claimedAmount = typeof rawClaimed === "string" && rawClaimed.trim() !== "" ? Number(rawClaimed) : NaN;
    if (!Number.isFinite(claimedAmount) || claimedAmount <= 0) {
      return errorResponse("A valid budget amount is required.", 400);
    }
    if (images.length === 0) return errorResponse("Proof image is required.", 400);
    if (images.length > MAX_IMAGES) {
      return errorResponse(`Up to ${MAX_IMAGES} images per proof.`, 413);
    }
    for (const image of images) {
      if (HEIC_MIME.includes(image.type) || image.name.toLowerCase().endsWith(".heic")) {
        return errorResponse(HEIC_MESSAGE, 422);
      }
      if (!ACCEPTED_MIME.includes(image.type)) {
        return errorResponse("Unsupported file type. Upload a JPG, PNG, or WEBP image.", 415);
      }
      if (image.size > MAX_SIZE) return errorResponse("Image is too large (max 10MB).", 413);
    }

    const proofId = crypto.randomUUID();
    const claimed = round2(claimedAmount);

    // Start all long poles (Gemini) immediately; auth runs in parallel.
    const parsePromises: ReturnType<typeof parseBudgetProof>[] = [];
    for (const image of images) {
      const dataUrl = `data:${image.type || "image/jpeg"};base64,${Buffer.from(await image.arrayBuffer()).toString("base64")}`;
      parsePromises.push(parseBudgetProof(dataUrl));
    }
    parsePromises.forEach((p) => p.catch(() => {})); // noop guard — early auth/upload returns must not leak rejections

    // Treasurer of the owning department, event open; increases also blocked by is_locked.
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
      if (rawType === "increase") {
        const { data: report, error: reportError } = await insforge.database
          .from("reports")
          .select("id")
          .eq("event_id", eventId)
          .in("status", ["pending_adviser_approval", "approved"])
          .maybeSingle();
        if (reportError || report) throw new Error("Event is locked by an active report.");
      }
    });

    const insforge = await createInsforgeServer();

    // Roll back every uploaded blob; on initial proofs also delete the event so
    // an unverified budget can never exist (FK cascade removes any proof rows).
    const rollbackUploads = async (keys: string[]) => {
      await Promise.all(keys.map((key) => deleteBudgetProofBlob(key)));
    };
    const rollbackInitialEvent = async () => {
      const { error } = await insforge.database.from("events").delete().eq("id", eventId);
      if (error) {
        // ponytail: best-effort — the audit trail below still records the rejection.
        console.error("[api/proofs] initial rollback: event delete failed:", error);
      }
    };

    // Upload the blobs once auth passed — overlaps the rest of the Gemini calls.
    const keys: string[] = [];
    try {
      for (let i = 0; i < images.length; i++) {
        const { key } = await uploadBudgetProof(eventId, proofId, images[i], i);
        keys.push(key);
      }
    } catch (uploadError) {
      console.error("[api/proofs] upload failed:", uploadError);
      await rollbackUploads(keys);
      if (rawType === "initial") {
        await rollbackInitialEvent();
        await insforge.database.from("audit_logs").insert([
          {
            actor_id: user.id,
            department_id: user.departmentId,
            action: "budget_proof.initial_upload_failed",
            target_type: "event",
            target_id: eventId,
            metadata_json: { event_id: eventId, type: rawType, claimed, count: images.length },
          },
        ]);
        return errorResponse(`The proof couldn't be uploaded — ${INITIAL_REJECTED_MESSAGE}`, 500);
      }
      return errorResponse("Failed to upload the proof images.", 500);
    }

    // Combined verdict: EVERY photo must be a valid budget document; the claim
    // matches if ANY one photo extracts it. First verdict failure short-circuits.
    let parsedResults: { amount: number }[] = [];
    try {
      const outcomes = await Promise.all(parsePromises);
      const failed = outcomes.find((o) => o.outcome !== "valid");
      if (failed) {
        const code =
          failed.outcome === "invalid"
            ? "invalid_document"
            : failed.outcome === "multiple"
              ? "multiple_documents"
              : "borderline";
        await rollbackUploads(keys);
        if (rawType === "initial") await rollbackInitialEvent();
        await insforge.database.from("audit_logs").insert([
          {
            actor_id: user.id,
            department_id: user.departmentId,
            action: `budget_proof.${code}`,
            target_type: "event",
            target_id: eventId,
            metadata_json: { event_id: eventId, type: rawType, claimed, reason: failed.reason, count: images.length },
          },
        ]);
        return errorResponse(GUIDANCE[code], 422, code);
      }
      // `failed` above short-circuits when ANY outcome isn't valid, so this
      // filter preserves the every-photo-must-be-valid guarantee.
      parsedResults = outcomes
        .filter((o): o is Extract<typeof o, { outcome: "valid" }> => o.outcome === "valid")
        .map((o) => o.proof);
    } catch (parseError) {
      // Transient parse failure — no row, no blobs: the client resends the whole
      // request. Initials also lose the event (never leave an unverified budget).
      console.warn("[api/proofs] parse failed:", parseError);
      await rollbackUploads(keys);
      if (rawType === "initial") await rollbackInitialEvent();
      await insforge.database.from("audit_logs").insert([
        {
          actor_id: user.id,
          department_id: user.departmentId,
          action: "budget_proof.parse_retry",
          target_type: "event",
          target_id: eventId,
          metadata_json: { event_id: eventId, type: rawType, claimed, count: images.length },
        },
      ]);
      return errorResponse(
        rawType === "initial"
          ? `Couldn't verify the proof right now — ${INITIAL_REJECTED_MESSAGE}`
          : "Couldn't verify the proof right now. Please try again.",
        502,
      );
    }

    // Any-image match: the claim is proven if at least one photo shows it.
    const extractedAmounts = parsedResults.map((p) => round2(p.amount));
    const match = extractedAmounts.find((a) => Math.abs(a - claimed) <= MATCH_TOLERANCE);
    const status = match !== undefined ? "matched" : "mismatch";
    const extracted = match ?? extractedAmounts[0];

    if (rawType === "initial" && status === "mismatch") {
      // Decision: an initial proof that doesn't match rejects the event — only a
      // matched budget creates a live event. Blobs + event removed; audit records
      // the rejection with every extracted amount for tracing.
      await rollbackUploads(keys);
      await rollbackInitialEvent();
      await insforge.database.from("audit_logs").insert([
        {
          actor_id: user.id,
          department_id: user.departmentId,
          action: "budget_proof.initial_rejected",
          target_type: "event",
          target_id: eventId,
          metadata_json: {
            event_id: eventId,
            type: rawType,
            claimed,
            extracted_amounts: extractedAmounts,
          },
        },
      ]);
      return errorResponse(
        `The budget proof doesn't match your amount — ${INITIAL_REJECTED_MESSAGE}`,
        422,
        "mismatch",
      );
    }

    // Read the current budget fresh — this is the source of truth for the increase math.
    const { data: eventNow, error: eventErr } = await insforge.database
      .from("events")
      .select("budget_total")
      .eq("id", eventId)
      .eq("department_id", user.departmentId)
      .single();
    if (eventErr || !eventNow) return errorResponse("Event not found.", 404);

    const currentBudget = eventNow.budget_total != null ? round2(Number(eventNow.budget_total)) : 0;
    let resulting: number | null = null;
    if (status === "matched") {
      resulting = rawType === "increase" ? round2(currentBudget + claimed) : claimed;
    }

    // Record the proof first — money never moves without its durable row.
    // proof_url stores a JSON array of storage keys (multi-image); legacy bare-key
    // rows read identically via parseImageKeys.
    const { error: insertErr } = await insforge.database.from("budget_proofs").insert([
      {
        id: proofId,
        event_id: eventId,
        department_id: user.departmentId,
        uploaded_by: user.id,
        type: rawType,
        claimed_amount: claimed,
        proof_url: JSON.stringify(keys),
        ai_extracted_amount: extracted,
        verification_status: status,
        resulting_budget_total: resulting,
      },
    ]);
    if (insertErr) {
      console.error("[api/proofs] insert failed:", insertErr);
      await rollbackUploads(keys);
      if (rawType === "initial") await rollbackInitialEvent();
      return errorResponse("Failed to save the proof.", 500);
    }

    // Apply a matched increase. (Matched initial needs no events update — the
    // claim already set budget_total at creation.)
    if (rawType === "increase" && status === "matched") {
      const { error: updateErr } = await insforge.database
        .from("events")
        .update({ budget_total: resulting })
        .eq("id", eventId)
        .eq("department_id", user.departmentId);
      if (updateErr) {
        console.error("[api/proofs] budget update failed:", updateErr);
        await insforge.database.from("audit_logs").insert([
          {
            actor_id: user.id,
            department_id: user.departmentId,
            action: "budget_proof.apply_failed",
            target_type: "event",
            target_id: eventId,
            metadata_json: { proof_id: proofId, event_id: eventId, type: rawType, claimed, resulting },
          },
        ]);
        return errorResponse("Budget update failed. The proof was recorded — retry the increase.", 500);
      }
    }

    await insforge.database.from("audit_logs").insert([
      {
        actor_id: user.id,
        department_id: user.departmentId,
        action: `budget_proof.${rawType}_${status}`,
        target_type: "event",
        target_id: eventId,
        metadata_json: { proof_id: proofId, event_id: eventId, type: rawType, claimed, extracted, resulting },
      },
    ]);

    return NextResponse.json({
      success: true,
      type: rawType,
      status,
      claimedAmount: claimed,
      extractedAmount: extracted,
      resultingBudgetTotal: resulting,
    });
  } catch (err) {
    if (err instanceof Error && "code" in err) {
      const status = (err as Error & { status?: unknown }).status;
      return errorResponse(err.message, typeof status === "number" ? status : 403);
    }
    console.error("[api/proofs]", err);
    return errorResponse("Something went wrong.", 500);
  }
}