import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/profile/ChangePasswordForm";
import { getCurrentUser } from "@/lib/auth-guard";
import { ROLE_PROFILE } from "@/lib/profile-routes";

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <ChangePasswordForm profileHref={ROLE_PROFILE[user.role]} />;
}
