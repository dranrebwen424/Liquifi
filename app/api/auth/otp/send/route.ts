import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-guard";
import { createInsforgeServer } from "@/lib/insforge-server";
import { PASSWORD_CHANGE_COOKIE } from "@/lib/password-change";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const intent = typeof body.intent === "string" ? body.intent : "";

    if (!["signup", "reset", "change"].includes(intent)) {
      return NextResponse.json(
        { success: false, error: "Invalid intent." },
        { status: 400 },
      );
    }

    if (intent === "change") {
      const user = await getCurrentUser();
      if (!user || user.accountStatus !== "active") {
        return NextResponse.json(
          { success: false, error: "Start the password change again." },
          { status: 401 },
        );
      }

      const cookieStore = await cookies();
      if (cookieStore.get(PASSWORD_CHANGE_COOKIE)?.value !== "1") {
        return NextResponse.json(
          { success: false, error: "Verify your current password before requesting a code." },
          { status: 403 },
        );
      }

      const insforge = await createInsforgeServer();
      const { error } = await insforge.auth.sendResetPasswordEmail({ email: user.email });
      if (error) {
        console.error("[auth/otp/send] change resend failed:", error);
        return NextResponse.json(
          { success: false, error: "Failed to send code. Please try again." },
          { status: 400 },
        );
      }
      return NextResponse.json({ success: true });
    }

    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required." },
        { status: 400 },
      );
    }

    const insforge = await createInsforgeServer();

    if (intent === "signup") {
      const { error } = await insforge.auth.resendVerificationEmail({ email });
      if (error) {
        console.error("[auth/otp/send] resendVerificationEmail failed:", error);
        return NextResponse.json(
          { success: false, error: error.message || "Failed to send code. Please try again." },
          { status: 400 },
        );
      }
    } else {
      const { error } = await insforge.auth.sendResetPasswordEmail({ email });
      if (error) {
        console.error("[auth/otp/send] sendResetPasswordEmail failed:", error);
        return NextResponse.json(
          { success: false, error: error.message || "Failed to send reset code. Please try again." },
          { status: 400 },
        );
      }
    }

    // Prevent user enumeration: always return success regardless of whether the email exists.
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[auth/otp/send]", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
