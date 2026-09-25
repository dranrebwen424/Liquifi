"use client";

import { useRef, useState, type FormEvent, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import AuthInput from "@/components/auth/AuthInput";
import AuthButton from "@/components/auth/AuthButton";

const MIN_PASSWORD_LENGTH = 8;

export function NewPasswordForm(): ReactElement {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
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
    if (!newPassword || !confirmPassword) return;
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for your new password.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Your new passwords don't match.");
      return;
    }

    submitting.current = true;
    setBusy(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        setError(data?.error || "We couldn't update your password. Please try again.");
        return;
      }

      router.replace("/profile/change-password/success");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <AuthShell subtitle="Choose a new password." backHref="/profile/change-password">
      <AuthCard
        title="Set a new password"
        subtitle="Use at least 8 characters and avoid passwords you reuse elsewhere."
      >
        <form onSubmit={handleSubmit} noValidate aria-busy={busy}>
          <fieldset disabled={busy} className="flex min-w-0 flex-col gap-6">
            <legend className="sr-only">Set a new password</legend>
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
            {error && (
              <p role="alert" className="text-center text-sm text-error-dark">
                {error}
              </p>
            )}
            <AuthButton type="submit" loading={busy}>
              Change password
            </AuthButton>
          </fieldset>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
