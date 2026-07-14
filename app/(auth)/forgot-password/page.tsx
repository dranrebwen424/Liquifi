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
  const [submitted, setSubmitted] = useState(false);

  // ponytail: mock — real flow triggers the OTP-reset email via InsForge.
  // Validate on submit: empty email turns red instead of greying the button.
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!email) return;
    router.push(`/otp?purpose=reset&email=${encodeURIComponent(email)}`);
  }

  return (
    <AuthShell subtitle="Reset your password." backHref="/login">
      <AuthCard title="Forgot password" subtitle="We'll send a reset code to your email.">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
          <AuthInput
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            required
            error={submitted && !email}
          />
          <AuthButton type="submit">Send reset code</AuthButton>
          <p className="text-center text-sm font-normal text-text-secondary">
            Remembered it? <AuthLink href="/login">Sign in</AuthLink>
          </p>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
