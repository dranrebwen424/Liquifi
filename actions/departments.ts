"use server";

import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { requireRole } from "@/lib/auth-guard";
import type { AccountStatus } from "@/types";

// ─── Create Department ───────────────────────────────────────────────

export async function createDepartment(name: string, code: string) {
  try {
    if (!name.trim() || !code.trim()) {
      return { success: false as const, error: "Department name and code are required." };
    }

    const user = await requireRole("admin");
    const insforge = await createInsforgeServer();

    const codeUpper = code.trim().toUpperCase();

    // Check for duplicate code
    const { data: existing } = await insforge.database
      .from("departments")
      .select("id")
      .eq("code", codeUpper)
      .maybeSingle();

    if (existing) {
      return { success: false as const, error: `Department code "${codeUpper}" already exists.` };
    }

    const deptId = crypto.randomUUID();
    const { error: insertErr } = await insforge.database
      .from("departments")
      .insert([{ id: deptId, name: name.trim(), code: codeUpper, is_active: true }]);

    if (insertErr) {
      console.error("[actions/departments] create failed:", insertErr);
      return { success: false as const, error: "Failed to create department." };
    }

    const newDept = { id: deptId, name: name.trim(), code: codeUpper, is_active: true };

    // Audit log
    await insforge.database.from("audit_logs").insert([{
      actor_id: user.id,
      department_id: deptId,
      action: "department.created",
      target_type: "department",
      target_id: deptId,
      metadata_json: { name: name.trim(), code: codeUpper },
    }]);

    revalidatePath("/admin/departments");
    return { success: true as const, department: newDept };
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      return { success: false as const, error: error.message };
    }
    console.error("[actions/departments] createDepartment:", error);
    return { success: false as const, error: "Something went wrong." };
  }
}

// ─── Toggle Department Active ────────────────────────────────────────

export async function setDepartmentActive(departmentId: string, isActive: boolean) {
  try {
    const user = await requireRole("admin");
    const insforge = await createInsforgeServer();

    const { error } = await insforge.database
      .from("departments")
      .update({ is_active: isActive })
      .eq("id", departmentId);

    if (error) {
      console.error("[actions/departments] toggle failed:", error);
      return { success: false as const, error: "Failed to update department." };
    }

    await insforge.database.from("audit_logs").insert([{
      actor_id: user.id,
      department_id: departmentId,
      action: isActive ? "department.activated" : "department.deactivated",
      target_type: "department",
      target_id: departmentId,
    }]);

    revalidatePath("/admin/departments");
    revalidatePath(`/admin/departments/${departmentId}`);
    return { success: true as const };
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      return { success: false as const, error: error.message };
    }
    console.error("[actions/departments] setDepartmentActive:", error);
    return { success: false as const, error: "Something went wrong." };
  }
}

// ─── Toggle User Account Status (deactivate / reactivate) ────────────

export async function setUserAccountStatus(
  userId: string,
  departmentId: string,
  newStatus: AccountStatus,
) {
  try {
    const user = await requireRole("admin");
    const insforge = await createInsforgeServer();

    const { data: targetUser, error: fetchErr } = await insforge.database
      .from("users")
      .select("account_status, role")
      .eq("id", userId)
      .maybeSingle();

    if (fetchErr || !targetUser) {
      return { success: false as const, error: "User not found." };
    }

    // Only allow: active ↔ deactivated
    const validTransitions: Record<string, string[]> = {
      active: ["deactivated"],
      deactivated: ["active"],
    };

    if (!validTransitions[targetUser.account_status]?.includes(newStatus)) {
      return {
        success: false as const,
        error: `Cannot transition from "${targetUser.account_status}" to "${newStatus}".`,
      };
    }

    const { error: updateErr } = await insforge.database
      .from("users")
      .update({ account_status: newStatus })
      .eq("id", userId);

    if (updateErr) {
      console.error("[actions/departments] user status update failed:", updateErr);
      return { success: false as const, error: "Failed to update user status." };
    }

    await insforge.database.from("audit_logs").insert([{
      actor_id: user.id,
      department_id: departmentId,
      action: newStatus === "active" ? "user.reactivated" : "user.deactivated",
      target_type: "user",
      target_id: userId,
      metadata_json: { previous_status: targetUser.account_status, new_status: newStatus },
    }]);

    revalidatePath(`/admin/departments/${departmentId}`);
    return { success: true as const };
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      return { success: false as const, error: error.message };
    }
    console.error("[actions/departments] setUserAccountStatus:", error);
    return { success: false as const, error: "Something went wrong." };
  }
}
