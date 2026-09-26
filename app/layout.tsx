import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

// Loaded once, root only. next/font exposes the loaded face as --font-sans,
// which is the @theme token every component resolves through `font-sans`.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Liquifi",
  description: "Liquidation management for Mabini Colleges department councils",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // No `h-full`/`min-h-full` on html/body: a percentage height there resolves
    // against the initial containing block, which on mobile is the LARGEST
    // viewport (browser chrome hidden). That is taller than 100svh, so it gave a
    // short page ~100px of surplus scroll range — a real document bottom edge to
    // bounce off. Pinning both to 100svh keeps a short page unscrollable.
    <html lang="en" className={`${poppins.variable} min-h-[100svh] antialiased`}>
      <body className="min-h-[100svh] flex flex-col">{children}</body>
    </html>
  );
}
