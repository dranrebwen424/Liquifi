"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import AuthOtpInput from "@/components/auth/AuthOtpInput";
import AuthButton from "@/components/auth/AuthButton";
import AuthLink from "@/components/auth/AuthLink";

const RESEND_SECONDS = 60;

function OtpPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // intent=signup | reset — accept both `intent` (new) and `purpose` (legacy compat)
  const intentParam = searchParams.get("intent") || searchParams.get("purpose") || "signup";
  const isReset = intentParam === "reset";
  const email = searchParams.get("email") ?? "";

  const [code, setCode] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [resetToken, setResetToken] = useState("");

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setApiError("");
    if (!code) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, intent: intentParam }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setApiError(data.error || "Verification failed.");
        return;
      }
      if (isReset && data.token) {
        setResetToken(data.token);
        router.push(`/change-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(data.token)}`);
      } else {
        // For signup: create the users table row now that the user is verified
        const pending = sessionStorage.getItem("pending_signup");
        if (pending && data.userId) {
          try {
            const signupData = JSON.parse(pending);
            const res = await fetch("/api/auth/create-profile", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: data.userId,
                ...signupData,
              }),
            });
            const profileData = await res.json();
            if (res.ok && profileData.success) {
              sessionStorage.removeItem("pending_signup");
            } else {
              // ponytail: keep sessionStorage so pending-approval can retry
              console.error("[otp] create-profile rejected:", profileData.error);
            }
          } catch (e) {
            // ponytail: keep sessionStorage so pending-approval can retry
            console.error("[otp] create-profile call failed:", e);
          }
        }
        router.push("/pending-approval");
      }
    } catch {
      setApiError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setSecondsLeft(RESEND_SECONDS);
    setApiError("");
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, intent: intentParam }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setApiError(data.error || "Failed to resend code.");
      }
    } catch {
      setApiError("Something went wrong.");
    }
  }

  return (
    <AuthShell
      subtitle={isReset ? "Reset your password." : "Enter the code we sent to your email."}
      backHref={isReset ? "/forgot-password" : "/signup"}
    >
      <AuthCard
        title="Verify your email"
        subtitle={
          isReset
            ? `We sent a 6-digit code to ${email || "your email"}.`
            : "Check your inbox for a 6-digit code."
        }
      >
        <form onSubmit={handleVerify} noValidate className="flex flex-col gap-6">
          <AuthOtpInput value={code} onChange={(v) => { setCode(v); if (apiError) setApiError(""); }} error={submitted && !code} />
          {apiError && (
            <p className="text-sm text-red-500 text-center">{apiError}</p>
          )}
          <AuthButton type="submit" loading={loading}>Verify</AuthButton>
          <button
            type="button"
            onClick={handleResend}
            disabled={secondsLeft > 0}
            className={`text-center text-sm font-medium outline-none transition-colors ${
              secondsLeft > 0
                ? "text-text-muted disabled:cursor-not-allowed disabled:opacity-50"
                : "text-accent hover:text-accent-hover"
            }`}
          >
            {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : "Resend code"}
          </button>
          <p className="text-center text-sm font-normal text-text-secondary">
            {isReset ? (
              <>
                Remembered it? <AuthLink href="/login">Sign in</AuthLink>
              </>
            ) : (
              <>
                Wrong email? <AuthLink href="/signup">Sign up</AuthLink>
              </>
            )}
          </p>
        </form>
      </AuthCard>
    </AuthShell>
  );
}

export default function OtpPage() {
  return (
    <Suspense fallback={null}>
      <OtpPageInner />
    </Suspense>
  );
}
