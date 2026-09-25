"use client";

import { useState } from "react";

import { ChevronRight, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ChangePasswordForm } from "@/components/profile/ChangePasswordForm";
import type {
  ChangePasswordInput,
  ChangePasswordResult,
} from "@/components/profile/ChangePasswordForm";

async function changePassword(
  input: ChangePasswordInput,
): Promise<ChangePasswordResult> {
  try {
    const res = await fetch("/api/auth/change-password/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.success || typeof data.email !== "string") {
      throw new Error(
        data?.error || "We couldn't change your password. Please try again.",
      );
    }

    const otpRes = await fetch("/api/auth/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.email, intent: "reset" }),
    });

    const otpData = await otpRes.json().catch(() => null);

    if (!otpRes.ok || !otpData?.success) {
      throw new Error(otpData?.error || "Failed to send reset code.");
    }

    // The email comes from the server response only — never from the client.
    window.location.assign(
      `/otp?email=${encodeURIComponent(data.email)}&intent=reset`,
    );
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error && error.message
          ? error.message
          : "Something went wrong. Please try again.",
    };
  }
}

export default function ChangePasswordButton({
  profileHref,
}: {
  profileHref: string;
}) {
  const [showForm, setShowForm] = useState(false);

  if (showForm) {
    return <ChangePasswordForm profileHref={profileHref} changePassword={changePassword} />;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className="w-full justify-start gap-3 rounded-lg px-3 py-2 text-left h-auto"
      onClick={() => setShowForm(true)}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-secondary">
        <Shield className="h-4 w-4 text-text-secondary" />
      </span>
      <span className="flex-1 text-sm font-medium text-text-primary">
        Change password
      </span>
      <ChevronRight className="h-4 w-4 text-text-tertiary" />
    </Button>
  );
}