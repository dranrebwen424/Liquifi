"use client";

import { useRef, useState, type FormEvent, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import AuthInput from "@/components/auth/AuthInput";
import AuthButton from "@/components/auth/AuthButton";
import { AuthFlowProgress } from "@/components/auth/AuthFlowProgress";
import { usePendingNewPassword } from "@/components/profile/PasswordChangeProvider";
import { PASSWORD_CHANGE_OTP_SENT_KEY } from "@/lib/password-change";

const MIN_PASSWORD_LENGTH = 8;

type Props = {
  profileHref: string;
};

export function ChangePasswordForm({ profileHref }: Props): ReactElement {
  const router = useRouter();
  const { setNewPassword } = usePendingNewPassword();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPasswordValue] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitted, setSubmitted] = useState(0);
  const [currentPasswordInvalid, setCurrentPasswordInvalid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting.current) return;

    setSubmitted((attempt) => attempt + 1);
    setError("");
    setCurrentPasswordInvalid(false);
    if (!currentPassword || !newPassword || !confirmPassword) return;
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for your new password.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Your new passwords don't match.");
      return;
    }
    if (currentPassword === newPassword) {
      setError("Choose a new password different from your current password.");
      return;
    }

    submitting.current = true;
    setBusy(true);
    try {
      const response = await fetch("/api/auth/change-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        setCurrentPasswordInvalid(response.status === 400 && typeof data?.error === "string" && data.error.startsWith("Current password is incorrect."));
        setError(data?.error || "We couldn't verify your password. Please try again.");
        return;
      }

      setNewPassword(newPassword);
      try {
        sessionStorage.setItem(PASSWORD_CHANGE_OTP_SENT_KEY, String(Date.now()));
      } catch {
        // Storage can be unavailable in private browsing; the flow still works.
      }
      router.replace("/profile/change-password/otp");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <AuthShell backHref={profileHref} progress={<AuthFlowProgress flow="change" step={1} />}>
      <AuthCard
        title="Change password"
        compactSubtitle
        flow
        subtitle="Confirm your current password, then verify the new one with an email code."
      >
        <form onSubmit={handleSubmit} noValidate aria-busy={busy}>
          <fieldset disabled={busy} className="flex min-w-0 flex-col gap-6">
            <legend className="sr-only">Change your password</legend>
            <AuthInput
              id="current-password"
              label="Current password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(value) => { setCurrentPassword(value); setCurrentPasswordInvalid(false); }}
              required
              error={currentPasswordInvalid ? "Current password is incorrect." : submitted > 0 && !currentPassword}
              validationAttempt={submitted}
            />
            <AuthInput
              id="new-password"
              label="New password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={setNewPasswordValue}
              required
              error={submitted > 0 && (!newPassword || (newPassword.length < MIN_PASSWORD_LENGTH ? `Use at least ${MIN_PASSWORD_LENGTH} characters.` : currentPassword === newPassword && "Choose a different password from your current one."))}
              validationAttempt={submitted}
            />
            <AuthInput
              id="confirm-password"
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              required
              error={submitted > 0 && (!confirmPassword || (newPassword !== confirmPassword && "Your new passwords don't match."))}
              validationAttempt={submitted}
            />
            {error && (
              <p role="alert" className="text-center text-sm text-error-dark">
                {error}
              </p>
            )}
            <AuthButton type="submit" loading={busy}>
              Continue
            </AuthButton>
            <p className="text-center text-sm font-normal text-text-secondary">
              We will email you a verification code before updating your password.
            </p>
          </fieldset>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
