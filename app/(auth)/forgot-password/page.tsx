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
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setApiError("");
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, intent: "reset" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setApiError(data.error || "Failed to send reset code.");
        return;
      }
      router.push(`/otp?email=${encodeURIComponent(email)}&intent=reset`);
    } catch {
      setApiError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
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
          {apiError && (
            <p className="text-sm text-red-500 text-center">{apiError}</p>
          )}
          <AuthButton type="submit" loading={loading}>Send reset code</AuthButton>
          <p className="text-center text-sm font-normal text-text-secondary">
            Remembered it? <AuthLink href="/login">Sign in</AuthLink>
          </p>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
