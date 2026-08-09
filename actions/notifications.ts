"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-guard";
import { createInsforgeServer } from "@/lib/insforge-server";

// Mark-as-read actions for the notifications pages. Both work for treasurer
// and adviser; updates are scoped to the acting user.

export async function markNotificationRead(id: string) {
  const user = await requireRole(["treasurer", "adviser"]);
  const insforge = await createInsforgeServer();

  const { error } = await insforge.database
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[actions/notifications] markNotificationRead failed:", error);
    return { success: false as const, error: "Failed to update notification." };
  }

  revalidatePath("/treasurer/notifications");
  revalidatePath("/adviser/notifications");
  return { success: true as const };
}

export async function markAllNotificationsRead() {
  const user = await requireRole(["treasurer", "adviser"]);
  const insforge = await createInsforgeServer();

  const { error } = await insforge.database
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

  if (error) {
    console.error("[actions/notifications] markAllNotificationsRead failed:", error);
    return { success: false as const, error: "Failed to update notifications." };
  }

  revalidatePath("/treasurer/notifications");
  revalidatePath("/adviser/notifications");
  return { success: true as const };
}
