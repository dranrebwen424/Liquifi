import { createServerClient } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";

type CookieSetter = {
  set: (name: string, value: string, opts?: Record<string, unknown>) => void;
};

export async function createInsforgeServer(opts?: { responseCookies?: CookieSetter }) {
  const cookieStore = await cookies();
  return createServerClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    cookies: {
      get: (name: string) => cookieStore.get(name),
      set: (name: string, value: string, opts?: Record<string, unknown>) =>
        cookieStore.set(name, value, opts as Parameters<typeof cookieStore.set>[2]),
    } as any,
    // When responseCookies is provided (Route Handler), the SDK writes auth
    // cookies to it instead of relying on cookies().set() which may not
    // produce Set-Cookie headers on NextResponse.json().
    ...(opts?.responseCookies ? { responseCookies: opts.responseCookies } : {}),
  });
}
