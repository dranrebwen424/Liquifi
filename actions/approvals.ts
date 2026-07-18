"use server";

import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { requireRole } from "@/lib/auth-guard";
import { sendWelcomeEmail } from "@/lib/email";

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
      await insforge.database.from("notifications").insert({
        user_id: userId,
        type: "signup_approved",
        payload_json: {
          applicant_name: `${applicant.first_name} ${applicant.last_name}`,
          department_id: applicant.department_id,
        },
        read: false,
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
      await insforge.database.from("notifications").insert({
        user_id: userId,
        type: "signup_rejected",
        payload_json: {
          applicant_name: `${applicant.first_name} ${applicant.last_name}`,
          department_id: applicant.department_id,
        },
        read: false,
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
