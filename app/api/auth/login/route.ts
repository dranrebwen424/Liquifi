import { createAuthActions, createServerClient, type CookieWriter } from "@insforge/sdk/ssr";
import { NextRequest, NextResponse } from "next/server";
import {
  EMAIL_LIMIT,
  IP_LIMIT,
  checkRateLimit,
  clearRateLimit,
  recordFailure,
} from "@/lib/rate-limit";

const ROLE_REDIRECTS: Record<string, string> = {
  treasurer: "/treasurer/home",
  adviser: "/adviser/home",
  admin: "/admin/departments",
};

function formatWait(retryAfterSec: number): string {
  if (retryAfterSec < 90) {
    return `${retryAfterSec} second${retryAfterSec === 1 ? "" : "s"}`;
  }
  return `${Math.ceil(retryAfterSec / 60)} minutes`;
}

function lockedResponse(scope: "account" | "network", retryAfterSec: number): NextResponse {
  const error =
    scope === "account"
      ? `Too many failed attempts. Try again in ${formatWait(retryAfterSec)}.`
      : `Too many login attempts from this network. Try again in ${formatWait(retryAfterSec)}.`;
  return NextResponse.json(
    { success: false, error },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
  );
}

function failedAttemptResponse(remainingEmailAttempts: number): NextResponse {
  let error = "Invalid email or password.";
  if (remainingEmailAttempts <= 2) {
    const plural = remainingEmailAttempts === 1 ? "attempt" : "attempts";
    error = `Invalid email or password. ${remainingEmailAttempts} more ${plural} before your account is temporarily locked.`;
  }
  return NextResponse.json({ success: false, error }, { status: 401 });
}

/** Records the failure on both buckets; a failure can itself trip a ladder — surface that as 429, not another 401. */
function handleFailedAttempt(emailKey: string, ipKey: string | null): NextResponse {
  const remaining = recordFailure(emailKey, EMAIL_LIMIT);
  if (ipKey) recordFailure(ipKey, IP_LIMIT);

  const emailLock = checkRateLimit(emailKey);
  if (emailLock.blocked) {
    return lockedResponse("account", emailLock.retryAfterSec);
  }
  const ipLock = ipKey ? checkRateLimit(ipKey) : null;
  if (ipLock?.blocked) {
    return lockedResponse("network", ipLock.retryAfterSec);
  }
  return failedAttemptResponse(remaining);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 },
      );
    }

    // Rate limiting runs before any auth work — blocked requests never reach InsForge.
    // Without x-forwarded-for/x-real-ip we cannot identify the client, so the IP
    // bucket is skipped rather than lumping every visitor into one shared bucket.
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip")?.trim() ||
      null;
    const emailKey = `e:${String(email).toLowerCase()}`;
    const ipKey = ip ? `ip:${ip}` : null;

    const ipLock = ipKey ? checkRateLimit(ipKey) : null;
    if (ipLock?.blocked) {
      return lockedResponse("network", ipLock.retryAfterSec);
    }
    const emailLock = checkRateLimit(emailKey);
    if (emailLock.blocked) {
      return lockedResponse("account", emailLock.retryAfterSec);
    }

    // Buffer for auth cookies the SDK sets via responseCookies.
    // We'll apply these to the response after all checks pass.
    const pendingCookies: Array<{
      name: string;
      value: string;
    }> = [];

    let pendingCookieOpts = new Map<string, Record<string, unknown>>();

    // 1. Sign in via createAuthActions which wraps auth with cookie persistence.
    const authActions = createAuthActions({
      baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
      anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
      responseCookies: {
        set: (name, value, opts) => {
          pendingCookies.push({ name, value });
          if (opts) pendingCookieOpts.set(name, opts as Record<string, unknown>);
          return undefined;
        },
      } as CookieWriter,
    });

    const { data, error } = await authActions.signInWithPassword({ email, password });

    if (error) {
      console.error("[auth/login] signInWithPassword failed:", error);
      return handleFailedAttempt(emailKey, ipKey);
    }

    const authUserId = data?.user?.id;
    if (!authUserId) {
      return handleFailedAttempt(emailKey, ipKey);
    }

    // Credentials are proven correct — forgive prior typos on this account.
    clearRateLimit(emailKey);

    // 2. Fetch user profile — use the accessToken from pendingCookies to
    //    authenticate the DB query (cookies aren't on the wire yet).
    const accessToken = pendingCookies.find(
      (c) => c.name === "insforge_access_token",
    )?.value;
    const insforge = createServerClient({
      baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
      anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
      accessToken: accessToken ?? void 0,
    });
    const { data: profile, error: profileError } = await insforge.database
      .from("users")
      .select("role, account_status")
      .eq("id", authUserId)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("[auth/login] users lookup failed:", profileError);
      return NextResponse.json(
        { success: false, error: "Account not found. Please sign up first." },
        { status: 404 },
      );
    }

    // 3. Rejected accounts cannot log in
    if (profile.account_status === "rejected") {
      return NextResponse.json(
        {
          success: false,
          error:
            "This account has been rejected. Please sign up again with a different email.",
        },
        { status: 403 },
      );
    }

    // 4. Pending-approval accounts get a specific message
    if (profile.account_status !== "active") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your account is still pending approval. Please wait for an admin to approve your account.",
        },
        { status: 403 },
      );
    }

    // 5. Determine redirect based on role
    const redirectTo = ROLE_REDIRECTS[profile.role];
    if (!redirectTo) {
      return NextResponse.json(
        { success: false, error: "Unknown role. Contact an administrator." },
        { status: 403 },
      );
    }

    // 6. Build success response — apply auth cookies to it
    const response = NextResponse.json({ success: true, redirectTo });
    // Store role in a cookie so the proxy can redirect logged-in users to the right dashboard
    response.cookies.set("user_role", profile.role, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 2, // 2 days
    });
    for (const { name, value } of pendingCookies) {
      const opts = pendingCookieOpts.get(name);
      response.cookies.set(name, value, opts as Parameters<typeof response.cookies.set>[2]);
    }
    return response;
  } catch (error) {
    console.error("[auth/login]", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
