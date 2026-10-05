"use client";

import {
  useEffect,
  useState,
  type FormEvent,
  type ReactElement,
} from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import AuthOtpInput from "@/components/auth/AuthOtpInput";
import AuthButton from "@/components/auth/AuthButton";
import { AuthFlowProgress } from "@/components/auth/AuthFlowProgress";
import { usePendingNewPassword } from "@/components/profile/PasswordChangeProvider";
import { PASSWORD_CHANGE_OTP_SENT_KEY } from "@/lib/password-change";

const RESEND_SECONDS = 60;

type Props = {
  email: string;
};

function getOtpSentAt(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const value = sessionStorage.getItem(PASSWORD_CHANGE_OTP_SENT_KEY);
    const parsed = value ? Number(value) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function setOtpSentAt(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PASSWORD_CHANGE_OTP_SENT_KEY, String(Date.now()));
  } catch {
    // Ignore storage failures; resend still works.
  }
}

export function ChangePasswordOtpForm({ email }: Props): ReactElement | null {
  const router = useRouter();
  const { newPassword, setNewPassword } = usePendingNewPassword();
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const sentAt = getOtpSentAt();
    if (!sentAt) return RESEND_SECONDS;
    return Math.max(0, RESEND_SECONDS - Math.floor((Date.now() - sentAt) / 1000));
  });
  const [code, setCode] = useState("");
  const [submitted, setSubmitted] = useState(0);
  const [codeInvalid, setCodeInvalid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);

  useEffect(() => {
    if (!newPassword && !otpVerified) {
      router.replace("/profile/change-password");
    }
  }, [newPassword, otpVerified, router]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  function restart(): void {
    setNewPassword("");
    setOtpVerified(false);
    setCode("");
    setApiError("");
    router.replace("/profile/change-password");
  }

  async function completeChange(): Promise<void> {
    setOtpVerified(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        setNewPassword("");
        setApiError(data?.error || "We couldn't update your password. Please start again.");
        return;
      }

      setNewPassword("");
      router.replace("/profile/change-password/success");
    } catch {
      setNewPassword("");
      setApiError("We couldn't update your password. Please start again.");
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitted((attempt) => attempt + 1);
    setApiError("");
    setCodeInvalid(false);
    if (code.length !== 6) return;

    setLoading(true);
    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, intent: "change" }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        setCodeInvalid(response.status === 400);
        setApiError(data?.error || "Verification failed. Please try again.");
        return;
      }

      await completeChange();
    } catch {
      setApiError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend(): Promise<void> {
    setSecondsLeft(RESEND_SECONDS);
    setApiError("");
    setCodeInvalid(false);
    try {
      const response = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "change" }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        setApiError(data?.error || "Failed to resend code.");
        return;
      }
      setOtpSentAt();
    } catch {
      setApiError("Something went wrong.");
    }
  }

  if (!newPassword && !otpVerified) return null;

  return (
    <AuthShell onBack={restart} progress={<AuthFlowProgress flow="change" step={2} />}>
      {otpVerified ? (
        <AuthCard title="Start again" subtitle="The password update could not finish." compactSubtitle flow>
          {apiError && (
            <p role="alert" className="text-sm text-error-dark">
              {apiError}
            </p>
          )}
          <AuthButton type="button" onClick={restart}>
            Start over
          </AuthButton>
        </AuthCard>
      ) : (
        <div>
          <AuthCard
            title="Verify your email"
            compactSubtitle
            flow
            subtitle={`We sent a 6-digit code to ${email}.`}
          >
            <form onSubmit={handleVerify} noValidate className="flex flex-col gap-6">
              <AuthOtpInput
                value={code}
                onChange={(value) => {
                  setCode(value);
                  setCodeInvalid(false);
                  if (apiError) setApiError("");
                }}
                error={codeInvalid ? "Check your verification code or request a new one." : submitted > 0 && code.length !== 6 && "Enter the complete 6-digit code."}
                validationAttempt={submitted}
              />
              {apiError && (
                <p role="alert" className="text-center text-sm text-error-dark">
                  {apiError}
                </p>
              )}
              <AuthButton type="submit" loading={loading}>
                Verify
              </AuthButton>
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
                {secondsLeft > 0
                  ? `Resend code in ${secondsLeft}s`
                  : "Resend code"}
              </button>
            </form>
          </AuthCard>
        </div>
      )}
    </AuthShell>
  );
}
