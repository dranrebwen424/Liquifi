import { redirect } from "next/navigation";
import { createInsforgeServer } from "@/lib/insforge-server";
import type { Role } from "@/types";

/**
 * Server-side guard for route group layouts.
 * Redirects unauthenticated or wrong-role users to login / landing.
 * Returns the AuthUser on success so the layout can pass it to children.
 */
export async function requireLayoutRole(requiredRole: Role) {
  let insforge;
  try {
    insforge = await createInsforgeServer();
  } catch {
    redirect("/login");
  }

  const { data } = await insforge.auth.getCurrentUser();
  if (!data?.user) redirect("/login");

  const { data: profile } = await insforge.database
    .from("users")
    .select("role, account_status")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile || profile.account_status !== "active") redirect("/login");
  if (profile.role !== requiredRole) redirect("/login");

  return { id: data.user.id, email: data.user.email ?? "", role: profile.role as Role };
}
