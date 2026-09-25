import { redirect } from "next/navigation";
import ChangePasswordSuccess from "@/components/profile/ChangePasswordSuccess";
import { getCurrentUser } from "@/lib/auth-guard";
import { ROLE_HOME } from "@/lib/profile-routes";

export default async function ChangePasswordSuccessPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <ChangePasswordSuccess homeHref={ROLE_HOME[user.role]} />;
}
