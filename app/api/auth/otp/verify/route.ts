import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { getCurrentUser } from "@/lib/auth-guard";
import { PASSWORD_CHANGE_COOKIE, PASSWORD_CHANGE_TOKEN_COOKIE, PASSWORD_CHANGE_TTL_SECONDS } from "@/lib/password-change";
import { REFRESH_COOKIE_MAX_AGE } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = typeof body.code === "string" ? body.code : "";
    const intent = typeof body.intent === "string" ? body.intent : "";
    let targetEmail = typeof body.email === "string" ? body.email.trim() : "";

    if (!code || !intent) {
      return NextResponse.json(
        { success: false, error: "Code and intent are required." },
        { status: 400 },
      );
    }
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
          { success: false, error: "Verify your current password first." },
          { status: 403 },
        );
      }
      targetEmail = user.email;
    } else if (!targetEmail) {
      return NextResponse.json(
        { success: false, error: "Email and code are required." },
        { status: 400 },
      );
    }

    const insforge = await createInsforgeServer();

    if (intent === "signup") {
      // Verify the signup OTP
      const { data, error } = await insforge.auth.verifyEmail({ email: targetEmail, otp: code });
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
            maxAge: REFRESH_COOKIE_MAX_AGE,
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
      const { data, error } = await insforge.auth.exchangeResetPasswordToken({ email: targetEmail, code });
      if (error || !data) {
        console.error("[auth/otp/verify] exchangeResetPasswordToken failed:", error);
        const msg = error?.message || "";
        const message =
          intent === "change"
            ? "Invalid code. Please request a new code."
            : msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("wrong")
              ? "Invalid code. Please check and try again."
              : error?.message || "Verification failed. Please request a new code.";
        return NextResponse.json({ success: false, error: message }, { status: 400 });
      }

      if (intent === "change") {
        const response = NextResponse.json({ success: true });
        response.cookies.set(PASSWORD_CHANGE_TOKEN_COOKIE, data.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: PASSWORD_CHANGE_TTL_SECONDS,
        });
        return response;
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
