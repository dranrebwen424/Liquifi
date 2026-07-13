"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import AuthInput from "@/components/auth/AuthInput";
import AuthButton from "@/components/auth/AuthButton";
import AuthLink from "@/components/auth/AuthLink";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  // ponytail: mock — real flow triggers the OTP-reset email via InsForge.
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <AuthShell subtitle="Reset your password.">
      <AuthCard title="Forgot password" subtitle="We'll send a reset code to your email.">
        {sent ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-normal text-text-secondary">
              If an account exists for <span className="font-medium text-text-primary">{email}</span>,
              a reset code is on its way. (Mock: no email is actually sent.)
            </p>
            <div className="pt-2">
              <AuthLink href="/login">Back to sign in</AuthLink>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <AuthInput
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              placeholder="you@mabini.edu.ph"
              required
            />
            <AuthButton type="submit" disabled={!email}>Send reset code</AuthButton>
            <p className="text-center text-sm font-normal text-text-secondary">
              Remembered it? <AuthLink href="/login">Sign in</AuthLink>
            </p>
          </form>
        )}
      </AuthCard>
    </AuthShell>
  );
}
