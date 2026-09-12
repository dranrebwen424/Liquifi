"use server";

import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { requireRole } from "@/lib/auth-guard";

export async function createEvent(name: string, budgetTotal: number) {
  try {
    if (!name.trim()) {
      return { success: false as const, error: "Event name is required." };
    }
    if (!budgetTotal || budgetTotal <= 0) {
      return { success: false as const, error: "Budget must be a positive amount." };
    }

    const user = await requireRole("treasurer");
    const departmentId = user.departmentId;
    if (!departmentId) {
      return { success: false as const, error: "Treasurer must belong to a department." };
    }

    const insforge = await createInsforgeServer();
    const eventId = crypto.randomUUID();

    const { error: insertErr } = await insforge.database
      .from("events")
      .insert([{
        id: eventId,
        name: name.trim(),
        department_id: departmentId,
        created_by: user.id,
        budget_total: budgetTotal,
        status: "open",
      }]);

    if (insertErr) {
      console.error("[actions/events] create failed:", insertErr);
      return { success: false as const, error: "Failed to create event." };
    }

    // Audit log
    await insforge.database.from("audit_logs").insert([{
      actor_id: user.id,
      department_id: departmentId,
      action: "event.created",
      target_type: "event",
      target_id: eventId,
      metadata_json: { name: name.trim(), budget_total: budgetTotal },
    }]);

    revalidatePath("/treasurer/home");
    return { success: true as const, eventId };
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      return { success: false as const, error: error.message };
    }
    console.error("[actions/events] createEvent:", error);
    return { success: false as const, error: "Something went wrong." };
  }
}
