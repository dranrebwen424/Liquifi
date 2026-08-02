"use server";

import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { requireRole } from "@/lib/auth-guard";

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
