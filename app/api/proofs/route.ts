import { NextRequest, NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { requireRole } from "@/lib/auth-guard";
import { uploadBudgetProof, deleteBudgetProofBlob } from "@/lib/storage";
import { parseBudgetProof } from "@/agent/budget-proof-parser";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"];
const HEIC_MIME = ["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"];
const HEIC_MESSAGE = "HEIC isn't supported. Please upload a JPG, PNG, or WEBP image.";
const MATCH_TOLERANCE = 0.01; // within one centavo → matched (decision: to-the-cent)

/** Guidance copy for model verdicts — the client renders the matching banner. */
const GUIDANCE = {
  invalid_document:
    "We couldn't read a budget amount from this document. Upload a clearer photo of the funding letter or approved budget document.",
  borderline: "This photo looks blurry or unclear. Try a clearer photo of the document.",
  multiple_documents:
    "This photo contains more than one document. Upload one budget document at a time.",
} as const;

function errorResponse(message: string, status: number, code?: string) {
  return NextResponse.json({ success: false, error: message, ...(code ? { code } : {}) }, { status });
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Budget proof upload + verification (POST, multipart).
 *
 * One request per proof. Form fields: eventId, type ("initial" | "increase"),
 * claimedAmount (numeric string), image (File).
 *
 * Guard: treasurer of the owning department; event open. Increases are blocked
 * while the event is locked (pending/approved report) — decision #1.
 *
 * Verification: Gemini extracts the budget amount on the document. Within
 * ₱0.01 of the claim → matched, else mismatch.
 *  - initial matched:    proof row with resulting_budget_total = claim (the claim
 *    already seeded events.budget_total at creation). No events update.
 *  - increase matched:   events.budget_total += claim; resulting = new total.
 *  - mismatch (either):  proof row PERSISTS as an audit (verification_status
 *    mismatch, resulting NULL); the budget is left unchanged.
 *  - borderline/invalid/multiple: no row, blob deleted, 422 with guidance.
 *  - transient Gemini failure: no row, blob deleted, 502 — the client just resends.
 */
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const eventId = form.get("eventId");
    const rawType = form.get("type");
    const rawClaimed = form.get("claimedAmount");
    const image = form.get("image");

    if (typeof eventId !== "string" || !eventId) return errorResponse("Event is required.", 400);
    if (rawType !== "initial" && rawType !== "increase") return errorResponse("Type is required.", 400);
    const claimedAmount = typeof rawClaimed === "string" && rawClaimed.trim() !== "" ? Number(rawClaimed) : NaN;
    if (!Number.isFinite(claimedAmount) || claimedAmount <= 0) {
      return errorResponse("A valid budget amount is required.", 400);
    }
    if (!(image instanceof File)) return errorResponse("Proof image is required.", 400);
    if (HEIC_MIME.includes(image.type) || image.name.toLowerCase().endsWith(".heic")) {
      return errorResponse(HEIC_MESSAGE, 422);
    }
    if (!ACCEPTED_MIME.includes(image.type)) {
      return errorResponse("Unsupported file type. Upload a JPG, PNG, or WEBP image.", 415);
    }
    if (image.size > MAX_SIZE) return errorResponse("Image is too large (max 10MB).", 413);

    const proofId = crypto.randomUUID();
    const claimed = round2(claimedAmount);
    const dataUrl = `data:${image.type || "image/jpeg"};base64,${Buffer.from(await image.arrayBuffer()).toString("base64")}`;

    // Start the long pole (Gemini) immediately; auth runs in parallel.
    const parsePromise = parseBudgetProof(dataUrl);
    parsePromise.catch(() => {}); // noop guard — early auth/upload returns must not leak rejections

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

    // Upload the blob once auth passed — overlaps the rest of the Gemini call.
    let uploaded;
    try {
      uploaded = await uploadBudgetProof(eventId, proofId, image);
    } catch (uploadError) {
      console.error("[api/proofs] upload failed:", uploadError);
      return errorResponse("Failed to upload the proof image.", 500);
    }
    const imageUrl = uploaded.key;
    const insforge = await createInsforgeServer();
    const deleteBlob = async () => {
      await deleteBudgetProofBlob(imageUrl);
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
            action: `budget_proof.${code}`,
            target_type: "event",
            target_id: eventId,
            metadata_json: { event_id: eventId, type: rawType, claimed, reason: outcome.reason },
          },
        ]);
        return errorResponse(GUIDANCE[code], 422, code);
      }
      parsed = outcome.proof;
    } catch (parseError) {
      // Transient parse failure — no row, no blob: the client resends the whole
      // request (proofs are add-only, there's no idempotent retry lane like entries).
      console.warn("[api/proofs] parse failed:", parseError);
      await deleteBlob();
      await insforge.database.from("audit_logs").insert([
        {
          actor_id: user.id,
          department_id: user.departmentId,
          action: "budget_proof.parse_retry",
          target_type: "event",
          target_id: eventId,
          metadata_json: { event_id: eventId, type: rawType, claimed },
        },
      ]);
      return errorResponse("Couldn't verify the proof right now. Please try again.", 502);
    }

    const extracted = round2(parsed.amount);
    const status = Math.abs(extracted - claimed) <= MATCH_TOLERANCE ? "matched" : "mismatch";

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
    const { error: insertErr } = await insforge.database.from("budget_proofs").insert([
      {
        id: proofId,
        event_id: eventId,
        department_id: user.departmentId,
        uploaded_by: user.id,
        type: rawType,
        claimed_amount: claimed,
        proof_url: imageUrl,
        ai_extracted_amount: extracted,
        verification_status: status,
        resulting_budget_total: resulting,
      },
    ]);
    if (insertErr) {
      console.error("[api/proofs] insert failed:", insertErr);
      await deleteBlob();
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