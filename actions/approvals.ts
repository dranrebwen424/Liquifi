"use server";

import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { requireRole } from "@/lib/auth-guard";
import { sendWelcomeEmail, sendRejectionEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

// ─── Approve Adviser Signup ──────────────────────────────────────────

export async function approveAdviserSignup(userId: string) {
  try {
    if (!userId) {
      return { success: false as const, error: "User ID is required." };
    }

    const user = await requireRole("admin");
    const insforge = await createInsforgeServer();

    // Fetch applicant — must still be pending_approval + adviser
    const { data: applicant, error: fetchErr } = await insforge.database
      .from("users")
      .select("id, first_name, last_name, email, role, account_status, department_id")
      .eq("id", userId)
      .maybeSingle();

    if (fetchErr || !applicant) {
      return { success: false as const, error: "User not found." };
    }

    if (applicant.role !== "adviser") {
      return { success: false as const, error: "Only adviser accounts can be approved from this page." };
    }

    if (applicant.account_status !== "pending_approval") {
      return { success: false as const, error: "User is no longer pending approval." };
    }

    // Attempt to update — unique constraint may reject if dept already has active adviser
    const now = new Date().toISOString();
    const { error: updateErr } = await insforge.database
      .from("users")
      .update({
        account_status: "active",
        approved_by: user.id,
        approved_at: now,
      })
      .eq("id", userId);

    if (updateErr) {
      // Postgres unique violation (23505) — idx_users_active_adviser
      if ("code" in updateErr && updateErr.code === "23505") {
        return {
          success: false as const,
          error:
            "This department already has an active adviser. Deactivate the current adviser from the department's Users tab first.",
        };
      }
      console.error("[actions/approvals] approve failed:", updateErr);
      return { success: false as const, error: "Failed to approve user." };
    }

    // Audit log
    await insforge.database.from("audit_logs").insert([{
      actor_id: user.id,
      department_id: applicant.department_id,
      action: "user.approved",
      target_type: "user",
      target_id: userId,
      metadata_json: {
        email: applicant.email,
        name: `${applicant.first_name} ${applicant.last_name}`,
      },
    }]);

    // Notification — best-effort
    try {
      await createNotification(userId, "signup_approved", {
        applicant_name: `${applicant.first_name} ${applicant.last_name}`,
        department_id: applicant.department_id,
      });
    } catch (notifErr) {
      console.error("[actions/approvals] signup_approved notification failed:", notifErr);
    }

    // Welcome email — best-effort
    try {
      await sendWelcomeEmail(applicant.email, applicant.first_name);
    } catch (emailErr) {
      console.error("[actions/approvals] welcome email failed:", emailErr);
    }

    revalidatePath("/admin/approvals");
    if (applicant.department_id) {
      revalidatePath(`/admin/departments/${applicant.department_id}`);
    }

    return { success: true as const };
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      return { success: false as const, error: error.message };
    }
    console.error("[actions/approvals] approveAdviserSignup:", error);
    return { success: false as const, error: "Something went wrong." };
  }
}

// ─── Reject Adviser Signup ────────────────────────────────────────────

export async function rejectAdviserSignup(userId: string) {
  try {
    if (!userId) {
      return { success: false as const, error: "User ID is required." };
    }

    const user = await requireRole("admin");
    const insforge = await createInsforgeServer();

    const { data: applicant, error: fetchErr } = await insforge.database
      .from("users")
      .select("id, first_name, last_name, email, role, account_status, department_id")
      .eq("id", userId)
      .maybeSingle();

    if (fetchErr || !applicant) {
      return { success: false as const, error: "User not found." };
    }

    if (applicant.role !== "adviser") {
      return { success: false as const, error: "Only adviser accounts can be rejected from this page." };
    }

    if (applicant.account_status !== "pending_approval") {
      return { success: false as const, error: "User is no longer pending approval." };
    }

    const { error: updateErr } = await insforge.database
      .from("users")
      .update({ account_status: "rejected" })
      .eq("id", userId);

    if (updateErr) {
      console.error("[actions/approvals] reject failed:", updateErr);
      return { success: false as const, error: "Failed to reject user." };
    }

    // Rejection email — best-effort
    try {
      await sendRejectionEmail(applicant.email, applicant.first_name);
    } catch (emailErr) {
      console.error("[actions/approvals] rejection email failed:", emailErr);
    }

    // Audit log
    await insforge.database.from("audit_logs").insert([{
      actor_id: user.id,
      department_id: applicant.department_id,
      action: "user.rejected",
      target_type: "user",
      target_id: userId,
      metadata_json: {
        email: applicant.email,
        name: `${applicant.first_name} ${applicant.last_name}`,
      },
    }]);

    // Notification — best-effort
    try {
      await createNotification(userId, "signup_rejected", {
        applicant_name: `${applicant.first_name} ${applicant.last_name}`,
        department_id: applicant.department_id,
      });
    } catch (notifErr) {
      console.error("[actions/approvals] signup_rejected notification failed:", notifErr);
    }

    revalidatePath("/admin/approvals");
    return { success: true as const };
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      return { success: false as const, error: error.message };
    }
    console.error("[actions/approvals] rejectAdviserSignup:", error);
    return { success: false as const, error: "Something went wrong." };
  }
}

// ─── Approve Treasurer Signup (Adviser action) ──────────────────────

export async function approveTreasurerSignup(userId: string) {
  try {
    if (!userId) {
      return { success: false as const, error: "User ID is required." };
    }

    const actor = await requireRole("adviser");
    const insforge = await createInsforgeServer();

    // Fetch applicant — must be pending_approval + treasurer + same dept
    const { data: applicant, error: fetchErr } = await insforge.database
      .from("users")
      .select("id, first_name, last_name, email, role, account_status, department_id")
      .eq("id", userId)
      .maybeSingle();

    if (fetchErr || !applicant) {
      return { success: false as const, error: "User not found." };
    }

    if (applicant.role !== "treasurer") {
      return { success: false as const, error: "Only treasurer accounts can be approved from this page." };
    }

    if (applicant.account_status !== "pending_approval") {
      return { success: false as const, error: "User is no longer pending approval." };
    }

    if (applicant.department_id !== actor.departmentId) {
      return { success: false as const, error: "This applicant does not belong to your department." };
    }

    // Attempt to update via SECURITY DEFINER RPC (bypasses RLS — advisers
    // only have own-row update permission on the users table)
    const now = new Date().toISOString();
    const { error: updateErr } = await insforge.database.rpc("update_user_account_status", {
      p_id: userId,
      p_account_status: "active",
      p_approved_by: actor.id,
      p_approved_at: now,
    });

    if (updateErr) {
      // RPC returns a Postgres error if the unique constraint is violated
      if ("code" in updateErr && updateErr.code === "23505") {
        return {
          success: false as const,
          error:
            "This department already has an active treasurer. Deactivate the current treasurer from the department's Users tab first.",
        };
      }
      console.error("[actions/approvals] approveTreasurer failed:", updateErr);
      return { success: false as const, error: "Failed to approve user." };
    }

    // Audit log
    await insforge.database.from("audit_logs").insert([{
      actor_id: actor.id,
      department_id: applicant.department_id,
      action: "user.approved",
      target_type: "user",
      target_id: userId,
      metadata_json: {
        email: applicant.email,
        name: `${applicant.first_name} ${applicant.last_name}`,
      },
    }]);

    // Notification — best-effort
    try {
      await createNotification(userId, "signup_approved", {
        applicant_name: `${applicant.first_name} ${applicant.last_name}`,
        department_id: applicant.department_id,
      });
    } catch (notifErr) {
      console.error("[actions/approvals] signup_approved notification failed:", notifErr);
    }

    // Welcome email — best-effort
    try {
      await sendWelcomeEmail(applicant.email, applicant.first_name);
    } catch (emailErr) {
      console.error("[actions/approvals] welcome email failed:", emailErr);
    }

    revalidatePath("/adviser/approvals");
    if (applicant.department_id) {
      revalidatePath(`/admin/departments/${applicant.department_id}`);
    }

    return { success: true as const };
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      return { success: false as const, error: error.message };
    }
    console.error("[actions/approvals] approveTreasurerSignup:", error);
    return { success: false as const, error: "Something went wrong." };
  }
}

// ─── Reject Treasurer Signup (Adviser action) ───────────────────────

export async function rejectTreasurerSignup(userId: string) {
  try {
    if (!userId) {
      return { success: false as const, error: "User ID is required." };
    }

    const actor = await requireRole("adviser");
    const insforge = await createInsforgeServer();

    const { data: applicant, error: fetchErr } = await insforge.database
      .from("users")
      .select("id, first_name, last_name, email, role, account_status, department_id")
      .eq("id", userId)
      .maybeSingle();

    if (fetchErr || !applicant) {
      return { success: false as const, error: "User not found." };
    }

    if (applicant.role !== "treasurer") {
      return { success: false as const, error: "Only treasurer accounts can be rejected from this page." };
    }

    if (applicant.account_status !== "pending_approval") {
      return { success: false as const, error: "User is no longer pending approval." };
    }

    if (applicant.department_id !== actor.departmentId) {
      return { success: false as const, error: "This applicant does not belong to your department." };
    }

    const { error: updateErr } = await insforge.database.rpc("update_user_account_status", {
      p_id: userId,
      p_account_status: "rejected",
    });

    if (updateErr) {
      console.error("[actions/approvals] rejectTreasurer failed:", updateErr);
      return { success: false as const, error: "Failed to reject user." };
    }

    // Rejection email — best-effort
    try {
      await sendRejectionEmail(applicant.email, applicant.first_name);
    } catch (emailErr) {
      console.error("[actions/approvals] rejection email failed:", emailErr);
    }

    // Audit log
    await insforge.database.from("audit_logs").insert([{
      actor_id: actor.id,
      department_id: applicant.department_id,
      action: "user.rejected",
      target_type: "user",
      target_id: userId,
      metadata_json: {
        email: applicant.email,
        name: `${applicant.first_name} ${applicant.last_name}`,
      },
    }]);

    // Notification — best-effort
    try {
      await createNotification(userId, "signup_rejected", {
        applicant_name: `${applicant.first_name} ${applicant.last_name}`,
        department_id: applicant.department_id,
      });
    } catch (notifErr) {
      console.error("[actions/approvals] signup_rejected notification failed:", notifErr);
    }

    revalidatePath("/adviser/approvals");
    return { success: true as const };
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      return { success: false as const, error: error.message };
    }
    console.error("[actions/approvals] rejectTreasurerSignup:", error);
    return { success: false as const, error: "Something went wrong." };
  }
}

// ─── Batch Approve Manual Entries (Adviser action) ──────────────────

export async function batchApproveEntries(entryIds: string[]) {
  try {
    if (!entryIds || entryIds.length === 0) {
      return { success: false as const, error: "No entries selected." };
    }

    const actor = await requireRole("adviser");
    const insforge = await createInsforgeServer();

    // Fetch all entries with their events to verify department + state
    const { data: entries, error: fetchErr } = await insforge.database
      .from("entries")
      .select("id, event_id, status, type, amount, created_by, events(department_id, status)")
      .in("id", entryIds);

    if (fetchErr || !entries || entries.length === 0) {
      return { success: false as const, error: "Entries not found." };
    }

    // Validate every entry
    for (const entry of entries) {
      // To-one embed may come back as object or array depending on PostgREST version
      const eventsRow = entry.events as
        | { department_id: string; status: string }
        | Array<{ department_id: string; status: string }>
        | null;
      const ev = Array.isArray(eventsRow) ? eventsRow[0] : eventsRow;
      if (!ev) {
        return { success: false as const, error: `Entry ${entry.id} has no event.` };
      }
      if (ev.department_id !== actor.departmentId) {
        return { success: false as const, error: "One or more entries do not belong to your department." };
      }
      if (ev.status === "archived") {
        return { success: false as const, error: "Cannot approve entries for an archived event." };
      }
      if (entry.status !== "pending_approval" && entry.status !== "resubmitted") {
        return { success: false as const, error: `Entry ${entry.id} is not awaiting approval.` };
      }
      if (entry.type !== "manual") {
        return { success: false as const, error: "Only manual entries can be approved from this page." };
      }
    }

    // Transition each entry to deducted with individual audit trail
    const now = new Date().toISOString();
    const { error: updateErr } = await insforge.database
      .from("entries")
      .update({
        status: "deducted",
        approved_by: actor.id,
        approved_at: now,
      })
      .in("id", entryIds);

    if (updateErr) {
      console.error("[actions/approvals] batchApprove failed:", updateErr);
      return { success: false as const, error: "Failed to approve entries." };
    }

    // ─── Step 18 backstop: flag the FIRST entry that pushed the event below zero ──
    // The submit gate only guards a SINGLE manual entry; approving several at
    // once (or onto an already-depleted budget) can push an event negative
    // without any one entry tripping it. Walk the deducted rows in approval
    // order and flag ONLY the first one whose crossing put the event under —
    // the same "fires once" semantics as the treasurer submit gate, so the
    // overspend warning does not re-fire on every later entry. No explanation
    // here — the adviser path has none; Phase 8 surfaces these on the report.
    const flaggedEventIds = new Set(entries.map((e: { event_id: string }) => e.event_id));
    for (const eventId of flaggedEventIds) {
      const { data: ev } = await insforge.database
        .from("events")
        .select("budget_total, name")
        .eq("id", eventId)
        .maybeSingle();
      if (!ev || ev.budget_total === null) continue;
      const { data: deductedRows } = await insforge.database
        .from("entries")
        .select("id, amount, created_at")
        .eq("event_id", eventId)
        .eq("status", "deducted")
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });
      const batchIds = new Set(entryIds);
      let remainingCents = Math.round(Number(ev.budget_total) * 100);
      let crossingId: string | null = null;
      for (const row of deductedRows ?? []) {
        remainingCents -= Math.round(Number(row.amount) * 100);
        if (remainingCents < 0) {
          // Break at the first row at/below zero no matter who caused it: if
          // the event was already over budget before this batch, nothing in
          // this batch caused the crossing and nothing gets flagged.
          if (batchIds.has(row.id)) {
            crossingId = row.id;
            const { error: flagErr } = await insforge.database
              .from("entries")
              .update({ causes_overspend: true })
              .eq("id", row.id);
            if (flagErr) {
              console.error("[actions/approvals] overspend flag failed for", eventId, flagErr);
            }
          }
          break;
        }
      }

      // The submit gate previews the crossing against a deducted-only ledger,
      // so several pending manuals can all look like the cause and all get
      // flagged at submit. Only the true first crossing keeps the flag (and
      // its treasurer explanation); clear the rest of this batch's rows here.
      const staleIds = (deductedRows ?? [])
        .filter((row) => batchIds.has(row.id) && row.id !== crossingId)
        .map((row) => row.id);
      if (staleIds.length > 0) {
        const { error: clearErr } = await insforge.database
          .from("entries")
          .update({ causes_overspend: false, overspend_explanation: null })
          .in("id", staleIds);
        if (clearErr) {
          console.error("[actions/approvals] stale overspend flag clear failed for", eventId, clearErr);
        }
      }

      // This batch produced the TRUE crossing that pushed the event below zero
      // (receipts were never pending, so the only deducted crossing is here or
      // in confirmReceiptEntry). Alert the adviser once per event — best-effort.
      if (crossingId !== null) {
        try {
          const { data: adviser } = await insforge.database
            .from("users")
            .select("id")
            .eq("department_id", actor.departmentId)
            .eq("role", "adviser")
            .eq("account_status", "active")
            .maybeSingle();
          if (adviser && ev.name) {
            await createNotification(adviser.id, "event_overspend", {
              event_id: eventId,
              event_name: ev.name,
            });
          }
        } catch (notifErr) {
          console.error("[actions/approvals] event_overspend notification failed:", notifErr);
        }
      }
    }

    // Audit log per entry — best-effort
    for (const entry of entries) {
      try {
        await insforge.database.from("audit_logs").insert([{
          actor_id: actor.id,
          department_id: actor.departmentId,
          action: "entry.approved",
          target_type: "entry",
          target_id: entry.id,
          metadata_json: { entry_event_id: entry.event_id, amount: entry.amount },
        }]);

        // Notify the submitting treasurer that their entry was approved — best-effort.
        if (entry.created_by) {
          const amountNum =
            typeof entry.amount === "number"
              ? entry.amount
              : typeof entry.amount === "string"
                ? Number(entry.amount)
                : NaN;
          await createNotification(entry.created_by, "entry_approved", {
            event_id: entry.event_id,
            ...(Number.isFinite(amountNum) ? { amount: amountNum } : {}),
          });
        }
      } catch (logErr) {
        console.error("[actions/approvals] entry approval audit log failed:", logErr);
      }
    }

    // Revalidate — best-effort across affected events
    const affectedEventIds = new Set(entries.map((e) => e.event_id));
    revalidatePath("/adviser/approvals");
    for (const eventId of affectedEventIds) {
      revalidatePath(`/treasurer/events/${eventId}`);
    }

    return { success: true as const };
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      return { success: false as const, error: error.message };
    }
    console.error("[actions/approvals] batchApproveEntries:", error);
    return { success: false as const, error: "Something went wrong." };
  }
}

// ─── Reject Single Manual Entry (Adviser action) ────────────────────

export async function rejectEntry(entryId: string, rejectionReason: string) {
  try {
    if (!entryId) {
      return { success: false as const, error: "Entry ID is required." };
    }
    if (!rejectionReason || rejectionReason.trim().length === 0) {
      return { success: false as const, error: "Rejection reason is required." };
    }

    const actor = await requireRole("adviser");
    const insforge = await createInsforgeServer();

    const { data: entry, error: fetchErr } = await insforge.database
      .from("entries")
      .select("id, event_id, created_by, status, type, events(department_id, status)")
      .eq("id", entryId)
      .maybeSingle();

    if (fetchErr || !entry) {
      return { success: false as const, error: "Entry not found." };
    }

    // To-one embed may come back as object or array depending on PostgREST version
    const eventsRow = entry.events as
      | { department_id: string; status: string }
      | Array<{ department_id: string; status: string }>
      | null;
    const ev = Array.isArray(eventsRow) ? eventsRow[0] : eventsRow;
    if (!ev) {
      return { success: false as const, error: "Entry has no event." };
    }
    if (ev.department_id !== actor.departmentId) {
      return { success: false as const, error: "This entry does not belong to your department." };
    }
    if (ev.status === "archived") {
      return { success: false as const, error: "Cannot reject entries for an archived event." };
    }
    if (entry.status !== "pending_approval" && entry.status !== "resubmitted") {
      return { success: false as const, error: "Entry is not awaiting approval." };
    }
    if (entry.type !== "manual") {
      return { success: false as const, error: "Only manual entries can be rejected from this page." };
    }

    const { error: updateErr } = await insforge.database
      .from("entries")
      .update({
        status: "rejected",
        rejection_reason: rejectionReason.trim(),
      })
      .eq("id", entryId);

    if (updateErr) {
      console.error("[actions/approvals] rejectEntry failed:", updateErr);
      return { success: false as const, error: "Failed to reject entry." };
    }

    // Audit log
    await insforge.database.from("audit_logs").insert([{
      actor_id: actor.id,
      department_id: actor.departmentId,
      action: "entry.rejected",
      target_type: "entry",
      target_id: entryId,
      metadata_json: {
        entry_event_id: entry.event_id,
        reason: rejectionReason.trim(),
      },
    }]);

    // Notification to entry creator — best-effort
    try {
      await createNotification(entry.created_by, "entry_rejected", {
        entry_id: entryId,
        event_id: entry.event_id,
        reason: rejectionReason.trim(),
      });
    } catch (notifErr) {
      console.error("[actions/approvals] entry_rejected notification failed:", notifErr);
    }

    revalidatePath("/adviser/approvals");
    revalidatePath(`/treasurer/events/${entry.event_id}`);

    return { success: true as const };
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      return { success: false as const, error: error.message };
    }
    console.error("[actions/approvals] rejectEntry:", error);
    return { success: false as const, error: "Something went wrong." };
  }
}
