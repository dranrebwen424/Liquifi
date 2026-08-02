import { createClient } from "@insforge/sdk";

const insforge = createClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
});

async function main() {
  // 1. Sign up
  const { data: signup, error: signupErr } = await insforge.auth.signUp({
    email: "admin@mabini.edu.ph",
    password: "try123",
    name: "System Admin",
  });
  if (signupErr || !signup) {
    console.error("Signup failed:", signupErr);
    process.exit(1);
  }
  console.log("Signup OK, requireEmailVerification:", signup.requireEmailVerification);
  console.log("User ID:", signup.user?.id);
  console.log("Email:", signup.user?.email);
}

main();
