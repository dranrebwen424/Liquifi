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

/**
 * Edit an event's budget. Allowed ONLY while the event is fully untouched:
 * no entries (any status), no pending/approved report, and not archived.
 * Once the first entry is added, the budget is permanently immutable.
 */
export async function updateEventBudget(eventId: string, newBudgetTotal: number) {
  try {
    if (!newBudgetTotal || newBudgetTotal <= 0) {
      return { success: false as const, error: "Budget must be a positive amount." };
    }

    const user = await requireRole("treasurer");
    const departmentId = user.departmentId;
    if (!departmentId) {
      return { success: false as const, error: "Treasurer must belong to a department." };
    }

    const insforge = await createInsforgeServer();

    const { data: event, error: eventErr } = await insforge.database
      .from("events")
      .select("id, name, department_id, status, budget_total")
      .eq("id", eventId)
      .eq("department_id", departmentId)
      .maybeSingle();

    if (eventErr || !event) {
      return { success: false as const, error: "Event not found." };
    }
    if (event.status === "archived") {
      return { success: false as const, error: "Archived events are read-only." };
    }

    // is_locked = a pending/approved report exists for this event
    const { data: report } = await insforge.database
      .from("reports")
      .select("id")
      .eq("event_id", eventId)
      .in("status", ["pending_adviser_approval", "approved"])
      .maybeSingle();
    if (report) {
      return { success: false as const, error: "Budget is locked while a report is pending or approved." };
    }

    // budget_locked = any entry exists (any status)
    const { data: anyEntry } = await insforge.database
      .from("entries")
      .select("id")
      .eq("event_id", eventId)
      .limit(1)
      .maybeSingle();
    if (anyEntry) {
      return { success: false as const, error: "Budget is locked once any entry has been added." };
    }

    const { error: updateErr } = await insforge.database
      .from("events")
      .update({ budget_total: newBudgetTotal })
      .eq("id", eventId)
      .eq("department_id", departmentId);

    if (updateErr) {
      console.error("[actions/events] updateEventBudget failed:", updateErr);
      return { success: false as const, error: "Failed to update budget." };
    }

    // Audit log
    await insforge.database.from("audit_logs").insert([{
      actor_id: user.id,
      department_id: departmentId,
      action: "event.budget_updated",
      target_type: "event",
      target_id: eventId,
      metadata_json: { name: event.name, from_budget_total: Number(event.budget_total), to_budget_total: newBudgetTotal },
    }]);

    revalidatePath("/treasurer/home");
    revalidatePath(`/treasurer/events/${eventId}`);
    return { success: true as const };
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      return { success: false as const, error: error.message };
    }
    console.error("[actions/events] updateEventBudget:", error);
    return { success: false as const, error: "Something went wrong." };
  }
}
