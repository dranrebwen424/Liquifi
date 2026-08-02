import { createServerClient } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";

export async function createInsforgeServer() {
  const cookieStore = await cookies();
  // ponytail: cast needed — SDK type only declares `get`, but `set`/`remove` work at runtime
  return createServerClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    // SDK expects string | undefined; Next.js cookies() returns RequestCookies
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value ?? null,
      set: (name: string, value: string, options?: Record<string, unknown>) => {
        cookieStore.set(name, value, options as Partial<{ path: string; maxAge: number; httpOnly: boolean; secure: boolean; sameSite: "lax" | "strict" | "none" }>);
      },
      remove: (name: string, _options?: Record<string, unknown>) => {
        cookieStore.delete(name);
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  });
}
