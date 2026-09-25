import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ChangePasswordOtpForm } from "@/components/profile/ChangePasswordOtpForm";
import { getCurrentUser } from "@/lib/auth-guard";
import { PASSWORD_CHANGE_COOKIE } from "@/lib/password-change";

export default async function ChangePasswordOtpPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  if (cookieStore.get(PASSWORD_CHANGE_COOKIE)?.value !== "1") {
    redirect("/profile/change-password");
  }

  return <ChangePasswordOtpForm email={user.email} />;
}
