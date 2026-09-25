import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-guard";
import { createInsforgeServer } from "@/lib/insforge-server";
import {
  PASSWORD_CHANGE_COOKIE,
  PASSWORD_CHANGE_TTL_SECONDS,
} from "@/lib/password-change";
import {
  CHANGE_PASSWORD_LIMIT,
  checkRateLimit,
  clearRateLimit,
  recordFailure,
} from "@/lib/rate-limit";

const StartChangeSchema = z.object({
  currentPassword: z.string().min(1),
});

function lockedResponse(retryAfterSec: number): NextResponse {
  return NextResponse.json(
    { success: false, error: "Too many attempts. Try again later." },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
  );
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.accountStatus !== "active") {
      return NextResponse.json(
        { success: false, error: "You must be signed in to change your password." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = StartChangeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Current password is required." },
        { status: 400 },
      );
    }

    const key = `cp:${user.id}`;
    const lock = checkRateLimit(key);
    if (lock.blocked) return lockedResponse(lock.retryAfterSec);

    const insforge = await createInsforgeServer();
    const { error: verifyError } = await insforge.auth.signInWithPassword({
      email: user.email,
      password: parsed.data.currentPassword,
    });

    if (verifyError) {
      const remaining = recordFailure(key, CHANGE_PASSWORD_LIMIT);
      const failedLock = checkRateLimit(key);
      if (failedLock.blocked) return lockedResponse(failedLock.retryAfterSec);

      const suffix =
        remaining > 0
          ? ` ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
          : "";
      return NextResponse.json(
        { success: false, error: `Current password is incorrect.${suffix}` },
        { status: 400 },
      );
    }

    const { error: sendError } = await insforge.auth.sendResetPasswordEmail({
      email: user.email,
    });
    if (sendError) {
      console.error("[auth/change-password/verify] send code failed:", sendError);
      return NextResponse.json(
        { success: false, error: "We couldn't send a verification code. Please try again." },
        { status: 500 },
      );
    }

    clearRateLimit(key);
    const response = NextResponse.json({ success: true });
    response.cookies.set(PASSWORD_CHANGE_COOKIE, "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: PASSWORD_CHANGE_TTL_SECONDS,
    });
    return response;
  } catch (error) {
    console.error("[auth/change-password/verify]", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
