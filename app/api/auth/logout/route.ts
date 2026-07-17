import { createAuthActions, type CookieWriter } from "@insforge/sdk/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(_req: NextRequest) {
  try {
    // Buffer for auth cookies the SDK sets via responseCookies.
    // signOut() will clear these cookies; we apply them to the response.
    const pendingCookies: Array<{ name: string; value: string }> = [];
    const pendingCookieOpts = new Map<string, Record<string, unknown>>();

    const auth = createAuthActions({
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

    const { error } = await auth.signOut();
    if (error) {
      console.error("[auth/logout] signOut failed:", error);
      return NextResponse.json(
        { success: false, error: "Failed to sign out." },
        { status: 500 },
      );
    }

    // Apply cleared cookies to the response
    const response = NextResponse.json({ success: true });
    for (const { name, value } of pendingCookies) {
      const opts = pendingCookieOpts.get(name);
      response.cookies.set(name, value, opts as Parameters<typeof response.cookies.set>[2]);
    }
    return response;
  } catch (err) {
    console.error("[auth/logout]", err);
    return NextResponse.json(
      { success: false, error: "Something went wrong." },
      { status: 500 },
    );
  }
}
