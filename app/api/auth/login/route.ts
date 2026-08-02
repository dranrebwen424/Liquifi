import { createAuthActions, createServerClient, type CookieWriter } from "@insforge/sdk/ssr";
import { NextRequest, NextResponse } from "next/server";

const ROLE_REDIRECTS: Record<string, string> = {
  treasurer: "/treasurer/home",
  adviser: "/adviser/home",
  admin: "/admin/departments",
};

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
      return NextResponse.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const authUserId = data?.user?.id;
    if (!authUserId) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 },
      );
    }

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
