"use server";

import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { requireRole } from "@/lib/auth-guard";
import { deleteReceiptBlob } from "@/lib/storage";
import { VOID_REASON_MAX } from "@/lib/limits";
import { remainingAfterEntryCents, entryCausesOverspend } from "@/lib/overspend";
import { CATEGORIES, manualGateThresholdCents } from "@/components/entries/manual-categories";
import { toNumber } from "@/lib/format";
import { createNotification } from "@/lib/notifications";
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
      .select("id, event_id, status, image_url, document_type_raw, document_number")
      .eq("id", entryId)
      .eq("event_id", eventId)
      .maybeSingle();
    if (fetchErr) throw new Error("Failed to load the entry.");
    if (!entry || entry.status !== "ai_parsed") {
      return { success: false as const, error: "Only unconfirmed parsed receipts can be discarded." };
    }

    // Conditional delete — the status guard is on the delete itself, so a discard
    // racing a confirm (which moves the entry to `deducted`) deletes 0 rows and
    // fails cleanly instead of deleting a confirmed expense.
    const { data: deleted, error: deleteErr } = await insforge.database
      .from("entries")
      .delete()
      .eq("id", entryId)
      .eq("event_id", eventId)
      .eq("status", "ai_parsed")
      .select("id");
    if (deleteErr) {
      console.error("[actions/entries] discard failed:", deleteErr);
      return { success: false as const, error: "Failed to discard the entry." };
    }
    if (!deleted || deleted.length === 0) {
      return { success: false as const, error: "Only unconfirmed parsed receipts can be discarded." };
    }

    // Best-effort blob cleanup — failure only orphans the file, never blocks the discard.
    // Key captured from the pre-delete fetch: the row is already gone, so the
    // helper's DB re-read would find nothing and the blob would silently orphan.
    await deleteReceiptBlob(entryId, entry.image_url);

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
    revalidatePath(`/treasurer/events/${eventId}`);
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

    // Fires once — only the FIRST entry that pushes the event below zero.
    // An event already over budget never re-triggers the explanation gate.
    const overspend = entryCausesOverspend(
      Number(eventBudget.budget_total),
      spentRows ?? [],
      amountCents / 100,
    );
    const explanation = options?.overspendExplanation?.trim() ?? "";

    if (overspend && !explanation) {
      return {
        success: true,
        deducted: false,
        overspendRequired: true,
        overshoot: Math.abs(remainingCents) / 100,
      };
    }

    // Step 18 parity: the receipt explanation is capped like the manual one
    if (explanation.length > MANUAL_EXPLANATION_MAX) {
      return { success: false, error: "Explanation is too long." };
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
  | { success: true; overspendRequired: true; overshoot: number }
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
 * Upload-first ordering: the supporting photo (optional) is uploaded CLIENT-side
 * via the FormData route `POST /api/entries/manual/photo` (a File can't cross a
 * server-action boundary), and only its storage key is passed here. A failed
 * upload therefore shows a form error with no row created and the form intact.
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

    const entryId = (payload.entryId ?? "").trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entryId)) {
      return { success: false, error: "Invalid entry." };
    }
    // Supporting photos are uploaded client-side (FormData route) and only their
    // storage keys reach here — a File can't cross the server-action boundary.
    // Multi-image: stored as a JSON array in `image_url`; single: the bare key.
    const imageKeys = (payload.imageKeys ?? [])
      .map((k) => (k ?? "").trim())
      .filter(Boolean)
      .slice(0, 4);
    const imageUrl = imageKeys.length > 1 ? JSON.stringify(imageKeys) : (imageKeys[0] ?? null);

    // Itemized categories need at least one valid line
    const itemized =
      payload.category === "supplies" ||
      (payload.category === "others" && payload.otherMode === "itemized");
    const items = (payload.items ?? [])
      .filter(
        (i) =>
          (i.description ?? "").trim() &&
          i.qty > 0 &&
          toNumber(i.price) >= 0,
      )
      .map((i) => ({
        description: i.description.trim(),
        qty: i.qty,
        unit_price: toNumber(i.price),
        line_amount: Math.round(i.qty * toNumber(i.price) * 100) / 100,
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

    // ─── Step 18 gate: cumulative overspend (remaining vs SUM of deducted) ──
    // Mirrors confirmReceiptEntry's cents math — the budget-remaining check
    // AFTER this entry, against already-deducted entries only. Zero-write: a
    // negative remaining with no explanation returns `overspendRequired` and
    // nothing is persisted (no photo upload, no row). With an explanation the
    // entry is inserted at `pending_approval` flagged causes_overspend=true —
    // adviser review is still the gate, and rejection auto-resolves overspend
    // because the derivation counts `deducted` rows only.
    const overspendExplanation = (payload.overspendExplanation ?? "").trim();
    if (overspendExplanation.length > MANUAL_EXPLANATION_MAX) {
      return { success: false, error: "Explanation is too long." };
    }
    const { data: spentRows } = await insforge.database
      .from("entries")
      .select("amount")
      .eq("event_id", eventId)
      .eq("status", "deducted");
    const remainingCents = remainingAfterEntryCents(
      Number(eventBudget.budget_total),
      spentRows ?? [],
      amount,
    );
    // Fires once — only the FIRST entry that pushes the event below zero.
    // An event already over budget never re-triggers the explanation gate.
    const causesOverspend = entryCausesOverspend(
      Number(eventBudget.budget_total),
      spentRows ?? [],
      amount,
    );
    if (causesOverspend && !overspendExplanation) {
      return {
        success: true,
        overspendRequired: true,
        overshoot: Math.abs(remainingCents) / 100,
      };
    }

    // Photos were already uploaded client-side (FormData route) — `imageUrl`
    // (bare key or JSON array) was computed above. Nothing left to upload here.

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
        causes_overspend: causesOverspend,
        ...(causesOverspend && overspendExplanation
          ? { overspend_explanation: overspendExplanation }
          : {}),
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
          causes_overspend: causesOverspend,
          ...(causesOverspend && overspendExplanation
            ? { overspend_explanation: overspendExplanation }
            : {}),
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
        await createNotification(adviser.id, "manual_entry_pending", {
          entry_id: entryId,
          event_id: eventId,
          amount,
          category: payload.category,
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

// ─── Rejected-entry resubmit / discard (treasurer) ─────────────────────

/** Shared guard: treasurer, own dept, event open, not report-locked. Resolves to the user. */
async function assertTreasurerCanMutateEvent(eventId: string) {
  return requireRole("treasurer", undefined, async ({ user: guardUser }) => {
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
}

/**
 * Resubmit a rejected entry for adviser review with a required explanation.
 * `rejected → resubmitted` — resubmitted entries appear in the adviser's
 * approvals list; approving moves them to deducted, rejecting starts the loop again.
 */
export async function resubmitEntry(entryId: string, explanation: string) {
  try {
    if (!entryId.trim()) {
      return { success: false as const, error: "Entry is required." };
    }
    const note = (explanation ?? "").trim();
    if (!note) {
      return { success: false as const, error: "An explanation is required to resubmit." };
    }
    if (note.length > MANUAL_EXPLANATION_MAX) {
      return { success: false as const, error: "Explanation is too long." };
    }

    const insforge = await createInsforgeServer();
    const { data: entry, error: fetchErr } = await insforge.database
      .from("entries")
      .select("id, event_id, status, resubmission_explanation")
      .eq("id", entryId)
      .maybeSingle();
    if (fetchErr) throw new Error("Failed to load the entry.");
    if (!entry) return { success: false as const, error: "Entry not found." };

    const user = await assertTreasurerCanMutateEvent(entry.event_id);

    if (entry.status !== "rejected") {
      return { success: false as const, error: "Only rejected entries can be resubmitted." };
    }
    // Invariant: resubmission_explanation is only written by resubmitEntry and
    // never cleared — a rejected entry that has one was already resubmitted once,
    // so this is the second rejection: terminal, no further resubmissions.
    if (entry.resubmission_explanation) {
      return {
        success: false as const,
        error: "This entry was rejected after resubmission and can no longer be resubmitted.",
      };
    }

    const { error: updateErr } = await insforge.database
      .from("entries")
      .update({ status: "resubmitted", resubmission_explanation: note })
      .eq("id", entryId)
      .eq("status", "rejected");
    if (updateErr) {
      console.error("[actions/entries] resubmit failed:", updateErr);
      return { success: false as const, error: "Failed to resubmit the entry." };
    }

    await insforge.database.from("audit_logs").insert([{
      actor_id: user.id,
      department_id: user.departmentId,
      action: "entry.resubmitted",
      target_type: "entry",
      target_id: entryId,
      metadata_json: { event_id: entry.event_id, explanation: note },
    }]);

    revalidatePath("/treasurer/home");
    revalidatePath(`/treasurer/events/${entry.event_id}`);
    revalidatePath("/adviser/approvals");
    return { success: true as const };
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      return { success: false as const, error: error.message };
    }
    console.error("[actions/entries] resubmitEntry:", error);
    return { success: false as const, error: "Something went wrong." };
  }
}

/**
 * Withdraw a manual entry still awaiting first adviser review — the claim
 * never touched the ledger and no decision was made, so the row is hard-deleted
 * (manual photo blob included). Audit `entry.withdrawn` keeps the trail.
 *
 * Entries the adviser has decided on (`rejected`, `resubmitted`) are NOT
 * withdrawable — they stay as permanent records for audit; the only path
 * forward is resubmit.
 */
export async function withdrawPendingEntry(entryId: string) {
  try {
    if (!entryId.trim()) {
      return { success: false as const, error: "Entry is required." };
    }

    const insforge = await createInsforgeServer();
    const { data: entry, error: fetchErr } = await insforge.database
      .from("entries")
      .select("id, event_id, status, image_url, amount, category")
      .eq("id", entryId)
      .maybeSingle();
    if (fetchErr) throw new Error("Failed to load the entry.");
    if (!entry) return { success: false as const, error: "Entry not found." };

    const user = await assertTreasurerCanMutateEvent(entry.event_id);

    if (entry.status !== "pending_approval") {
      return {
        success: false as const,
        error: "Only entries still awaiting review can be withdrawn.",
      };
    }

    // Conditional delete — the status guard lives on the delete itself, so a
    // withdrawal racing an adviser approval deletes 0 rows and fails cleanly
    // instead of removing a decided entry.
    const { data: deleted, error: deleteErr } = await insforge.database
      .from("entries")
      .delete()
      .eq("id", entryId)
      .eq("status", "pending_approval")
      .select("id");
    if (deleteErr) {
      console.error("[actions/entries] withdraw failed:", deleteErr);
      return { success: false as const, error: "Failed to withdraw the entry." };
    }
    if (!deleted || deleted.length === 0) {
      return {
        success: false as const,
        error: "This entry was already reviewed — refresh to see its current status.",
      };
    }

    // Best-effort photo cleanup — manual entries can carry an optional photo.
    // Key captured from the pre-delete fetch (row is gone by now).
    if (entry.image_url) {
      await deleteReceiptBlob(entryId, entry.image_url);
    }

    await insforge.database.from("audit_logs").insert([{
      actor_id: user.id,
      department_id: user.departmentId,
      action: "entry.withdrawn",
      target_type: "entry",
      target_id: entryId,
      metadata_json: {
        event_id: entry.event_id,
        from_status: "pending_approval",
        amount: entry.amount,
        category: entry.category,
      },
    }]);

    revalidatePath("/treasurer/home");
    revalidatePath(`/treasurer/events/${entry.event_id}`);
    revalidatePath("/adviser/approvals");
    return { success: true as const };
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      return { success: false as const, error: error.message };
    }
    console.error("[actions/entries] withdrawPendingEntry:", error);
    return { success: false as const, error: "Something went wrong." };
  }
}

// ─── Void entry (treasurer) ─────────────────────────────────────────

/**
 * Void a deducted entry — the expense is removed from spend totals while the
 * row stays visible for audit (`voided` is terminal; nothing can revive it).
 *
 * Void authority belongs to the CURRENT ACTIVE treasurer of the department,
 * verified fresh at void time — never assumed from `created_by`.
 * Voiding never unlocks `budget_locked` (that flag means "ever deducted").
 */
export async function voidEntry(entryId: string, reason: string) {
  try {
    if (!entryId.trim()) {
      return { success: false as const, error: "Entry is required." };
    }
    const note = (reason ?? "").trim();
    if (!note) {
      return { success: false as const, error: "A reason is required to void an entry." };
    }
    if (note.length > VOID_REASON_MAX) {
      return { success: false as const, error: "Reason is too long." };
    }

    const insforge = await createInsforgeServer();
    const { data: entry, error: fetchErr } = await insforge.database
      .from("entries")
      .select("id, event_id, status")
      .eq("id", entryId)
      .maybeSingle();
    if (fetchErr) throw new Error("Failed to load the entry.");
    if (!entry) return { success: false as const, error: "Entry not found." };

    const user = await assertTreasurerCanMutateEvent(entry.event_id);

    // Void authority is re-verified fresh against the users table (AGENTS.md:
    // current ACTIVE treasurer — never assumed from entry.created_by)
    const { data: actor, error: actorErr } = await insforge.database
      .from("users")
      .select("id, role, department_id, account_status")
      .eq("id", user.id)
      .maybeSingle();
    if (actorErr || !actor || actor.role !== "treasurer" || actor.account_status !== "active") {
      throw new Error("Only the department's active treasurer can void entries.");
    }
    if (user.departmentId && actor.department_id !== user.departmentId) {
      throw new Error("Only the department's active treasurer can void entries.");
    }

    if (entry.status !== "deducted") {
      return {
        success: false as const,
        error: "Only deducted entries can be voided.",
      };
    }

    // Conditional update — a concurrent confirm/re-void can't double-apply
    const { data: updated, error: updateErr } = await insforge.database
      .from("entries")
      .update({
        status: "voided",
        voided_by: user.id,
        voided_at: new Date().toISOString(),
        void_reason: note,
      })
      .eq("id", entryId)
      .eq("status", "deducted")
      .select("id, event_id")
      .maybeSingle();
    if (updateErr) {
      console.error("[actions/entries] void failed:", updateErr);
      return { success: false as const, error: "Failed to void the entry." };
    }
    if (!updated) {
      return {
        success: false as const,
        error: "This entry was already changed — refresh and try again.",
      };
    }

    await insforge.database.from("audit_logs").insert([{
      actor_id: user.id,
      department_id: user.departmentId,
      action: "entry.voided",
      target_type: "entry",
      target_id: entryId,
      metadata_json: { event_id: entry.event_id, reason: note },
    }]);

    revalidatePath("/treasurer/home");
    revalidatePath(`/treasurer/events/${entry.event_id}`);
    return { success: true as const };
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      return { success: false as const, error: error.message };
    }
    console.error("[actions/entries] voidEntry:", error);
    return { success: false as const, error: "Something went wrong." };
  }
}
