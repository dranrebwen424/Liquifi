"use client";

import { useRef, useState, type FormEvent, type ReactElement } from "react";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import AuthInput from "@/components/auth/AuthInput";
import AuthButton from "@/components/auth/AuthButton";

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type ChangePasswordResult =
  | { success: true }
  | { success: false; error: string };

type Props = {
  profileHref: string;
  changePassword: (input: ChangePasswordInput) => Promise<ChangePasswordResult>;
};

export function ChangePasswordForm({ profileHref, changePassword }: Props): ReactElement {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const submitting = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting.current) return;
    setSubmitted(true);
    setError("");
    if (!currentPassword || !newPassword || !confirmPassword) return;
    if (newPassword.length < 8) {
      setError("Use at least 8 characters for your new password.");
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
      const result = await changePassword({ currentPassword, newPassword, confirmPassword });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(true);
    } catch {
      setError("We couldn't change your password. Please try again.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <AuthShell subtitle="Change your password." backHref={profileHref}>
      {success ? (
        <AuthCard title="Password changed" center>
          <p role="status" className="text-sm text-text-secondary">
            Your password has been updated.
          </p>
          <Link
            href={profileHref}
            className="rounded-full bg-accent px-6 py-3 text-center text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Back to profile
          </Link>
        </AuthCard>
      ) : (
        <AuthCard title="Set a new password" subtitle="Choose a password you don't reuse elsewhere.">
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
                onChange={setNewPassword}
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
              {error && <p role="alert" className="text-center text-sm text-error-dark">{error}</p>}
              <AuthButton type="submit" loading={busy}>Change password</AuthButton>
            </fieldset>
          </form>
        </AuthCard>
      )}
    </AuthShell>
  );
}
