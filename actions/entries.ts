"use server";

import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { requireRole } from "@/lib/auth-guard";
import { uploadReceipt } from "@/lib/storage";
import { CATEGORIES, manualGateThresholdCents } from "@/components/entries/manual-categories";
import type { ManualSubmitPayload } from "@/components/entries/ManualQuickForm";

/**
 * Discard an ai_parsed receipt entry the treasurer decided not to keep.
 * Deletes the row (receipt image is removed with it) and audit-logs the discard.
 */
export async function discardReceiptEntry(entryId: string, eventId: string) {
  try {
    if (!entryId.trim() || !eventId.trim()) {
      return { success: false as const, error: "Entry is required." };
    }

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
      // All entry actions are blocked while a report is pending/approved (derived is_locked)
      const { data: activeReport, error: reportErr } = await insforge.database
        .from("reports")
        .select("id")
        .eq("event_id", eventId)
        .in("status", ["pending_adviser_approval", "approved"])
        .maybeSingle();
      if (reportErr || activeReport) throw new Error("Event is locked by an active report.");
    });

    const insforge = await createInsforgeServer();

    // Only ai_parsed entries can be discarded — anything past review is out of scope here
    const { data: entry, error: fetchErr } = await insforge.database
      .from("entries")
      .select("id, event_id, status, document_type_raw, document_number")
      .eq("id", entryId)
      .eq("event_id", eventId)
      .maybeSingle();
    if (fetchErr) throw new Error("Failed to load the entry.");
    if (!entry || entry.status !== "ai_parsed") {
      return { success: false as const, error: "Only unconfirmed parsed receipts can be discarded." };
    }

    const { error: deleteErr } = await insforge.database
      .from("entries")
      .delete()
      .eq("id", entryId)
      .eq("event_id", eventId);
    if (deleteErr) {
      console.error("[actions/entries] discard failed:", deleteErr);
      return { success: false as const, error: "Failed to discard the entry." };
    }

    await insforge.database.from("audit_logs").insert([{
      actor_id: user.id,
      department_id: user.departmentId,
      action: "entry.discarded",
      target_type: "entry",
      target_id: entryId,
      metadata_json: {
        event_id: eventId,
        document_type_raw: entry.document_type_raw,
        document_number: entry.document_number,
      },
    }]);

    revalidatePath("/treasurer/home");
    return { success: true as const };
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      return { success: false as const, error: error.message };
    }
    console.error("[actions/entries] discardReceiptEntry:", error);
    return { success: false as const, error: "Something went wrong." };
  }
}

export type ConfirmReceiptResult =
  | { success: true; deducted: true }
  | { success: true; deducted: false; overspendRequired: true; overshoot: number }
  | { success: false; error: string };

/**
 * Confirm an ai_parsed receipt entry — the only path that deducts budget.
 * Money moves ONLY on explicit treasurer confirm. Overspending requires an
 * explanation on a second call; the first call just reports the overshoot.
 * Idempotent: an entry already at `deducted` (double-click) is a success.
 */
export async function confirmReceiptEntry(
  entryId: string,
  eventId: string,
  options?: { overspendExplanation?: string },
): Promise<ConfirmReceiptResult> {
  try {
    if (!entryId.trim() || !eventId.trim()) {
      return { success: false, error: "Entry is required." };
    }

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
      // All entry actions are blocked while a report is pending/approved (derived is_locked)
      const { data: activeReport, error: reportErr } = await insforge.database
        .from("reports")
        .select("id")
        .eq("event_id", eventId)
        .in("status", ["pending_adviser_approval", "approved"])
        .maybeSingle();
      if (reportErr || activeReport) throw new Error("Event is locked by an active report.");
    });

    const insforge = await createInsforgeServer();

    const { data: entry, error: fetchErr } = await insforge.database
      .from("entries")
      .select("id, event_id, status, amount, document_type_raw, document_number")
      .eq("id", entryId)
      .eq("event_id", eventId)
      .maybeSingle();
    if (fetchErr) throw new Error("Failed to load the entry.");
    if (!entry) return { success: false, error: "Entry not found." };
    if (entry.status !== "ai_parsed") {
      // Double-submit after a successful confirm — already deducted, no-op success
      if (entry.status === "deducted") return { success: true, deducted: true };
      return { success: false, error: "Only unconfirmed parsed receipts can be confirmed." };
    }

    // Server-authoritative cents math — remaining AFTER this entry
    const { data: eventBudget, error: budgetErr } = await insforge.database
      .from("events")
      .select("budget_total")
      .eq("id", eventId)
      .maybeSingle();
    if (budgetErr || !eventBudget) return { success: false, error: "Event not found." };

    const { data: spentRows } = await insforge.database
      .from("entries")
      .select("amount")
      .eq("event_id", eventId)
      .eq("status", "deducted");

    const amountCents = Math.round(Number(entry.amount) * 100);
    const spentCents = (spentRows ?? []).reduce(
      (sum, row) => sum + Math.round(Number(row.amount) * 100),
      0,
    );
    const remainingCents =
      Math.round(Number(eventBudget.budget_total) * 100) - spentCents - amountCents;

    const overspend = remainingCents < 0;
    const explanation = options?.overspendExplanation?.trim() ?? "";

    if (overspend && !explanation) {
      return {
        success: true,
        deducted: false,
        overspendRequired: true,
        overshoot: Math.abs(remainingCents) / 100,
      };
    }

    // Conditional update — only an ai_parsed row can transition, double-submit falls out
    const patch: Record<string, unknown> = {
      status: "deducted",
      causes_overspend: overspend,
      ...(overspend && explanation ? { overspend_explanation: explanation } : {}),
    };
    const { error: updateErr } = await insforge.database
      .from("entries")
      .update(patch)
      .eq("id", entryId)
      .eq("event_id", eventId)
      .eq("status", "ai_parsed");

    if (updateErr) {
      // Concurrent confirm beat us — already deducted, treat as success
      const { data: now, error: nowErr } = await insforge.database
        .from("entries")
        .select("status")
        .eq("id", entryId)
        .eq("event_id", eventId)
        .maybeSingle();
      if (!nowErr && now?.status === "deducted") {
        return { success: true, deducted: true };
      }
      console.error("[actions/entries] confirm failed:", updateErr);
      return { success: false, error: "Failed to confirm the entry." };
    }

    await insforge.database.from("audit_logs").insert([{
      actor_id: user.id,
      department_id: user.departmentId,
      action: "entry.confirmed",
      target_type: "entry",
      target_id: entryId,
      metadata_json: {
        event_id: eventId,
        amount: entry.amount,
        causes_overspend: overspend,
        ...(explanation ? { overspend_explanation: explanation } : {}),
      },
    }]);

    revalidatePath("/treasurer/home");
    revalidatePath(`/treasurer/events/${eventId}`);
    return { success: true, deducted: true };
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      return { success: false, error: error.message };
    }
    console.error("[actions/entries] confirmReceiptEntry:", error);
    return { success: false, error: "Something went wrong." };
  }
}

export type ManualSubmitResult =
  | { success: true }
  | {
      success: true;
      explanationRequired: true;
      overAmount: number;
      threshold: number;
    }
  | { success: false; error: string };

const MANUAL_AMOUNT_MAX = 9_999_999_999.99; // decimal(12,2) ceiling
const MANUAL_EXPLANATION_MAX = 500;

/**
 * Submit a manual (no-receipt) entry for adviser approval.
 * Creates an entries row at `pending_approval` — never deducted at creation.
 *
 * Gate (per-form, budget-relative): if the entry's total exceeds
 * `max(minCeiling, budget_total × pctOfBudget%)` for its category and no
 * explanation was given, the action returns `explanationRequired` with ZERO
 * writes; the treasurer explains and resubmits. The gate never blocks — with
 * an explanation the entry is always accepted (adviser review is the gate).
 *
 * Upload-first ordering: the photo (optional) uploads BEFORE the row insert,
 * so a failed upload returns an error with no row created and the form intact.
 * A duplicate submission is prevented client-side (ref latch); the action is
 * safe to re-run after failure since nothing was written.
 */
export async function submitManualEntry(
  eventId: string,
  payload: ManualSubmitPayload,
): Promise<ManualSubmitResult> {
  try {
    if (!eventId.trim()) {
      return { success: false, error: "Event is required." };
    }

    // Guard chain mirrors discard/confirm — treasurer, own dept, open, unlocked
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
      // All entry actions are blocked while a report is pending/approved (derived is_locked)
      const { data: activeReport, error: reportErr } = await insforge.database
        .from("reports")
        .select("id")
        .eq("event_id", eventId)
        .in("status", ["pending_adviser_approval", "approved"])
        .maybeSingle();
      if (reportErr || activeReport) throw new Error("Event is locked by an active report.");
    });

    // ─── Payload validation (trust boundary) ──────────────────────
    const config = CATEGORIES[payload.category];
    if (!config) return { success: false, error: "Unknown expense category." };

    const amount = payload.totalAmount;
    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, error: "Enter a valid amount." };
    }
    if (amount > MANUAL_AMOUNT_MAX) {
      return { success: false, error: "Amount is too large." };
    }

    const witness = (payload.witness ?? "").trim();
    if (!witness) return { success: false, error: "Witness is required." };
    if (witness.length > 120) return { success: false, error: "Witness name is too long." };

    // Others always needs a justification — enforced client-side too, but the
    // server is the trust boundary.
    if (payload.category === "others" && !(payload.justification ?? "").trim()) {
      return { success: false, error: "A justification is required for Other expenses." };
    }

    let photoFile: File | null = payload.photoFile ?? null;
    if (photoFile) {
      if (!(photoFile instanceof File)) {
        return { success: false, error: "Invalid photo attachment." };
      }
      if (!photoFile.type.startsWith("image/")) {
        return { success: false, error: "Only image files are accepted." };
      }
      if (photoFile.size > 10 * 1024 * 1024) {
        return { success: false, error: "Photo is too large (max 10 MB)." };
      }
    }

    // Itemized categories need at least one valid line
    const itemized =
      payload.category === "supplies" ||
      (payload.category === "others" && payload.otherMode === "itemized");
    const items = (payload.items ?? [])
      .filter(
        (i) =>
          (i.description ?? "").trim() &&
          i.qty > 0 &&
          Number(i.price) >= 0,
      )
      .map((i) => ({
        description: i.description.trim(),
        qty: i.qty,
        unit_price: Number(i.price),
        line_amount: Math.round(i.qty * Number(i.price) * 100) / 100,
      }));
    if (itemized && items.length === 0) {
      return { success: false, error: "Add at least one item." };
    }

    // ─── Per-form gate: max(floor, budget × pct) ──────────────────
    const insforge = await createInsforgeServer();
    const { data: eventBudget } = await insforge.database
      .from("events")
      .select("budget_total")
      .eq("id", eventId)
      .maybeSingle();
    if (!eventBudget) return { success: false, error: "Event not found." };

    const pct = config.pctOfBudget;
    const thresholdCents = manualGateThresholdCents(Number(eventBudget.budget_total), config);
    const amountCents = Math.round(amount * 100);
    const over = amountCents > thresholdCents;
    const explanation = (payload.aboveRangeExplanation ?? "").trim();

    if (over && !explanation) {
      // Zero-write — the form asks for an explanation and resubmits
      return {
        success: true,
        explanationRequired: true,
        overAmount: (amountCents - thresholdCents) / 100,
        threshold: thresholdCents / 100,
      };
    }
    if (explanation.length > MANUAL_EXPLANATION_MAX) {
      return { success: false, error: "Explanation is too long." };
    }

    // ─── Upload-first: photo before row (failure leaves no row behind) ──
    const entryId = crypto.randomUUID();
    let imageUrl: string | null = null;
    if (photoFile) {
      try {
        const uploaded = await uploadReceipt(eventId, entryId, photoFile);
        imageUrl = uploaded.key;
      } catch (uploadError) {
        console.error("[actions/entries] manual photo upload failed:", uploadError);
        return {
          success: false,
          error: "Failed to upload the photo. Nothing was saved — please try again.",
        };
      }
    }

    // ─── Insert (only now — a successful photo is already persisted) ──
    const formPayload = {
      witness,
      justification: (payload.justification ?? "").trim() || undefined,
      field_values: payload.fieldValues,
      other_mode: payload.category === "others" ? payload.otherMode : "flat",
      ...(payload.route ? { route: payload.route } : {}),
      ...(payload.occasion ? { occasion: payload.occasion } : {}),
      ...(payload.recipient ? { recipient: payload.recipient } : {}),
      ...(over && explanation
        ? {
            above_range: {
              category: payload.category,
              pct_of_budget: pct,
              budget_total: Number(eventBudget.budget_total),
              amount,
              explanation,
            },
          }
        : {}),
    };

    const { error: insertErr } = await insforge.database.from("entries").insert([
      {
        id: entryId,
        event_id: eventId,
        created_by: user.id,
        type: "manual",
        status: "pending_approval",
        amount,
        category: payload.category,
        image_url: imageUrl,
        item_breakdown: items.length > 0 ? items : null,
        form_payload_json: formPayload,
      },
    ]);
    if (insertErr) {
      // ponytail: photo blob can orphan here (upload ok, insert failed) — keyed by
      // the dead entryId, unreachable; logged, matches discarded-blob precedent
      console.error("[actions/entries] manual insert failed:", insertErr);
      return { success: false, error: "Failed to save the entry." };
    }

    // ─── Audit ────────────────────────────────────────────────────
    await insforge.database.from("audit_logs").insert([
      {
        actor_id: user.id,
        department_id: user.departmentId,
        action: "entry.manual_submitted",
        target_type: "entry",
        target_id: entryId,
        metadata_json: {
          event_id: eventId,
          category: payload.category,
          amount,
          has_photo: Boolean(imageUrl),
          ...(over && explanation
            ? { above_range: { pct_of_budget: pct, explanation } }
            : {}),
        },
      },
    ]);

    // ─── Notify the department adviser — best-effort ─────────────
    try {
      const { data: adviser } = await insforge.database
        .from("users")
        .select("id")
        .eq("department_id", user.departmentId)
        .eq("role", "adviser")
        .eq("account_status", "active")
        .maybeSingle();
      if (adviser) {
        await insforge.database.from("notifications").insert({
          user_id: adviser.id,
          type: "manual_entry_pending",
          payload_json: {
            entry_id: entryId,
            event_id: eventId,
            amount,
            category: payload.category,
          },
          read: false,
        });
      }
    } catch (notifErr) {
      console.error("[actions/entries] manual_entry_pending notification failed:", notifErr);
    }

    revalidatePath("/treasurer/home");
    revalidatePath(`/treasurer/events/${eventId}`);
    revalidatePath("/adviser/approvals");
    return { success: true };
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      return { success: false, error: error.message };
    }
    console.error("[actions/entries] submitManualEntry:", error);
    return { success: false, error: "Something went wrong." };
  }
}
