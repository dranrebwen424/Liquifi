import { NextRequest, NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code, intent } = body;

    if (!email || !code || !intent) {
      return NextResponse.json(
        { success: false, error: "Email, code, and intent are required." },
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
      // Verify the signup OTP
      const { error } = await insforge.auth.verifyEmail({ email, otp: code });
      if (error) {
        console.error("[auth/otp/verify] verifyEmail failed:", error);
        // Distinguish wrong code from expired/locked
        const message =
          error.message?.toLowerCase().includes("invalid") ||
          error.message?.toLowerCase().includes("wrong")
            ? "Invalid code. Please check and try again."
            : error.message || "Verification failed. Please request a new code.";
        return NextResponse.json({ success: false, error: message }, { status: 400 });
      }

      // Stamp otp_verified_at on the users row
      await insforge.database
        .from("users")
        .update({ otp_verified_at: new Date().toISOString() })
        .eq("email", email);

      return NextResponse.json({ success: true });
    } else {
      // Exchange reset code for a reset token
      const { data, error } = await insforge.auth.exchangeResetPasswordToken({ email, code });
      if (error || !data) {
        console.error("[auth/otp/verify] exchangeResetPasswordToken failed:", error);
        const msg = error?.message || "";
        const message =
          msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("wrong")
            ? "Invalid code. Please check and try again."
            : error?.message || "Verification failed. Please request a new code.";
        return NextResponse.json({ success: false, error: message }, { status: 400 });
      }

      return NextResponse.json({ success: true, token: data.token });
    }
  } catch (error) {
    console.error("[auth/otp/verify]", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
