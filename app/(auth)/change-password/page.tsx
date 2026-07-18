"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import AuthInput from "@/components/auth/AuthInput";
import AuthButton from "@/components/auth/AuthButton";
import AuthLink from "@/components/auth/AuthLink";
import LottiePlayer from "@/components/LottiePlayer";

function ChangePasswordPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setApiError("");
    if (!newPassword || !confirm) return;
    if (newPassword !== confirm) {
      setApiError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setApiError(data.error || "Password reset failed.");
        return;
      }
      setSuccess(true);
    } catch {
      setApiError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const mismatch = submitted && newPassword !== confirm;

  return (
    <AuthShell
      subtitle="Reset your password."
      backHref={email ? `/otp?intent=reset&email=${encodeURIComponent(email)}` : "/login"}
    >
      {success ? (
        <AuthCard title="Password Changed!" center>
          <div className="flex flex-col items-center mt-8">
            <LottiePlayer
              src="/Auth%20pages/success.json"
              className="h-48 w-48"
              loop={false}
              onComplete={() => router.push("/login")}
            />
          </div>
        </AuthCard>
      ) : (
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
          {apiError && (
            <p className="text-sm text-red-500 text-center">{apiError}</p>
          )}
          <AuthButton type="submit" loading={loading}>Reset password</AuthButton>
          <p className="text-center text-sm font-normal text-text-secondary">
            Remembered it? <AuthLink href="/login">Sign in</AuthLink>
          </p>
        </form>
      </AuthCard>
      )}
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
