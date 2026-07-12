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
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
