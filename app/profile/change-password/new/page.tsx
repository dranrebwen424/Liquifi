import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NewPasswordForm } from "@/components/profile/NewPasswordForm";
import { getCurrentUser } from "@/lib/auth-guard";
import { PASSWORD_CHANGE_TOKEN_COOKIE } from "@/lib/password-change";

export default async function NewPasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  if (!cookieStore.get(PASSWORD_CHANGE_TOKEN_COOKIE)?.value) {
    redirect("/profile/change-password");
  }

  return <NewPasswordForm />;
}
