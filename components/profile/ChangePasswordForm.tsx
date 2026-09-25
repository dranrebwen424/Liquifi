"use client";

import { useRef, useState, type FormEvent, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import AuthInput from "@/components/auth/AuthInput";
import AuthButton from "@/components/auth/AuthButton";
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
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting.current) return;

    setSubmitted(true);
    setError("");
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
    <AuthShell subtitle="Change your password." backHref={profileHref}>
      <AuthCard
        title="Change password"
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
              onChange={setCurrentPassword}
              required
              error={submitted && !currentPassword}
            />
            <AuthInput
              id="new-password"
              label="New password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={setNewPasswordValue}
              required
              error={submitted && !newPassword}
            />
            <AuthInput
              id="confirm-password"
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              required
              error={submitted && !confirmPassword}
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
