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
    // No height on the root. A viewport-relative floor here forced every page to be
    // scrollable by the floor's margin — 96px of dead scroll on desktop, where
    // 100vh is the viewport — and never fixed anything. Nothing here needs one: the
    // background propagates to the canvas, so a short page still paints full-screen.
    // Percentage heights (h-full / min-h-full) are equally wrong: they resolve
    // against the large viewport and are how this file grew a phantom height once
    // already. See context/ui-registry.md.
    <html lang="en" className={`${poppins.variable} antialiased`}>
      <body className="flex flex-col">{children}</body>
    </html>
  );
}
