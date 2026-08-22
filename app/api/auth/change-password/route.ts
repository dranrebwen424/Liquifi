import { NextRequest, NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { clearRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, token, newPassword } = body;

    if (!newPassword || !token) {
      return NextResponse.json(
        { success: false, error: "New password and reset token are required." },
        { status: 400 },
      );
    }

    const insforge = await createInsforgeServer();

    const { error } = await insforge.auth.resetPassword({
      newPassword,
      otp: token,
    });

    if (error) {
      console.error("[auth/change-password] resetPassword failed:", error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to reset password. The link may have expired.",
        },
        { status: 400 },
      );
    }

    // A proven password reset redeems the lockout — clear the email bucket so
    // the user can sign in immediately. Requires completing OTP with inbox
    // access, so an attacker brute-forcing the login cannot trigger this.
    if (email) {
      clearRateLimit(`e:${String(email).trim().toLowerCase()}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[auth/change-password]", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
