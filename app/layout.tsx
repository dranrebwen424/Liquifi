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
    // Full-height floor is `100vh + 6rem` everywhere (see ui-registry). `100vh`
    // IS the large viewport and is constant, so the document never resizes while
    // mobile browser chrome animates. The +6rem is load-bearing: the document must
    // never land in the half-open band (svh, lvh], or collapsing the URL bar drives
    // maxScroll negative and the browser clamps scrollY back in a loop.
    // No percentage heights on the root — those resolve against the large viewport
    // and reintroduce exactly that band.
    <html lang="en" className={`${poppins.variable} min-h-[calc(100vh+6rem)] antialiased`}>
      <body className="min-h-[calc(100vh+6rem)] flex flex-col">{children}</body>
    </html>
  );
}
