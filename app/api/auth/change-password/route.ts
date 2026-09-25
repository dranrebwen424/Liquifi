import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { PASSWORD_CHANGE_COOKIE, PASSWORD_CHANGE_TOKEN_COOKIE } from "@/lib/password-change";
import { clearRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cookieStore = await cookies();
    const email = typeof body.email === "string" ? body.email : "";
    const bodyToken = typeof body.token === "string" ? body.token : "";
    const token =
      bodyToken || cookieStore.get(PASSWORD_CHANGE_TOKEN_COOKIE)?.value || "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    if (!newPassword || !token) {
      return NextResponse.json(
        { success: false, error: "New password and reset token are required." },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 8 characters." },
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

    const response = NextResponse.json({ success: true });
    if (cookieStore.get(PASSWORD_CHANGE_COOKIE)?.value === "1") {
      response.cookies.set(PASSWORD_CHANGE_COOKIE, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
    }
    if (cookieStore.get(PASSWORD_CHANGE_TOKEN_COOKIE)?.value) {
      response.cookies.set(PASSWORD_CHANGE_TOKEN_COOKIE, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
    }
    return response;
  } catch (error) {
    console.error("[auth/change-password]", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
