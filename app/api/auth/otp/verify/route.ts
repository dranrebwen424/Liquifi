import { cookies } from "next/headers";
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
      const { data, error } = await insforge.auth.verifyEmail({ email, otp: code });
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

      // Note: otp_verified_at is stamped by POST /api/auth/create-profile
      // after this route succeeds, not here (RLS blocks unauthenticated updates).

      // Persist session cookies — verifyEmail() on the SSR class doesn't write
      // cookies in server mode (known SDK gap). We write them manually so
      // subsequent calls (create-profile, status polling) are authenticated.
      if (data?.accessToken) {
        const cookieStore = await cookies();
        cookieStore.set("insforge_access_token", data.accessToken, {
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 3600,
        });
        // ponytail: refreshToken is optional in the SDK return type but always
        // present when accessToken is set; only persist cookies once we have it.
        if (data.refreshToken) {
          cookieStore.set("insforge_refresh_token", data.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 30,
          });
        }
      }

      // Fallback: SDK verifyEmail() may not return user.id in server mode.
      // Decode the userId from the access token JWT's `sub` claim instead.
      let userId: string | null = data?.user?.id ?? null;
      if (!userId && data?.accessToken) {
        try {
          const payload = JSON.parse(
            Buffer.from(data.accessToken.split(".")[1], "base64").toString(),
          );
          userId = payload?.sub ?? null;
        } catch {
          // Non-fatal — token is well-formed by the SDK, this is a belt-and-suspenders parse.
        }
      }

      return NextResponse.json({
        success: true,
        userId,
      });
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
