import { NextRequest, NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, intent } = body;

    if (!email || !intent) {
      return NextResponse.json(
        { success: false, error: "Email and intent are required." },
        { status: 400 },
      );
    }
    if (!["signup", "reset"].includes(intent)) {
      return NextResponse.json(
        { success: false, error: "Invalid intent." },
        { status: 400 },
      );
    }

    const insforge = await createInsforgeServer();

    if (intent === "signup") {
      // Resend the signup verification code (OTP)
      const { error } = await insforge.auth.resendVerificationEmail({ email });
      if (error) {
        console.error("[auth/otp/send] resendVerificationEmail failed:", error);
        return NextResponse.json(
          { success: false, error: error.message || "Failed to send code. Please try again." },
          { status: 400 },
        );
      }
    } else {
      // Send password-reset code (OTP)
      const { error } = await insforge.auth.sendResetPasswordEmail({ email });
      if (error) {
        console.error("[auth/otp/send] sendResetPasswordEmail failed:", error);
        return NextResponse.json(
          { success: false, error: error.message || "Failed to send reset code. Please try again." },
          { status: 400 },
        );
      }
    }

    // Prevent user enumeration: always return success regardless of whether the email exists
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[auth/otp/send]", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
