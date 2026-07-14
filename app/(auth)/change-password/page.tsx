"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import AuthInput from "@/components/auth/AuthInput";
import AuthButton from "@/components/auth/AuthButton";
import AuthLink from "@/components/auth/AuthLink";

function ChangePasswordPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // ponytail: email is carried through so the future real flow can target the right account.
  const email = searchParams.get("email") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // ponytail: mock — real flow hits app/api/auth/change-password.
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!newPassword || !confirm) return;
    if (newPassword !== confirm) return;
    router.push("/login");
  }

  const mismatch = submitted && newPassword !== confirm;

  return (
    <AuthShell
      subtitle="Reset your password."
      backHref={email ? `/otp?purpose=reset&email=${encodeURIComponent(email)}` : "/login"}
    >
      <AuthCard title="Set a new password" subtitle="Choose a password you don't reuse elsewhere.">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
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
            value={confirm}
            onChange={setConfirm}
            required
            error={submitted && !confirm}
          />
          {mismatch && (
            <p className="text-sm font-normal text-error">Passwords don't match.</p>
          )}
          <AuthButton type="submit">Reset password</AuthButton>
          <p className="text-center text-sm font-normal text-text-secondary">
            Remembered it? <AuthLink href="/login">Sign in</AuthLink>
          </p>
        </form>
      </AuthCard>
    </AuthShell>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={null}>
      <ChangePasswordPageInner />
    </Suspense>
  );
}
