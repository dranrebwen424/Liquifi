import { createServerClient } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";

export async function createInsforgeServer() {
  const cookieStore = await cookies();
  return createServerClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    // SDK expects string | undefined; Next.js cookies().get() returns { name, value }
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value ?? null,
    },
  });
}
