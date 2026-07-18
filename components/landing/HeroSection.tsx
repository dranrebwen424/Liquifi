"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export function HeroSection() {
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 50); return () => clearTimeout(t); }, []);

  const reveal = (delay: number): React.CSSProperties => ({
    opacity: ready ? 1 : 0,
    transition: `opacity 0.4s ease-out ${delay}ms`,
    pointerEvents: ready ? "auto" : "none" as React.CSSProperties["pointerEvents"],
  });

  return (
    <>
      {/* Header */}
      <header
        style={reveal(0)}
        className="sticky top-0 z-50 w-full border-b border-border bg-surface/90 backdrop-blur"
      >
        <div className="relative mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 md:px-8">
          <Link href="/" className="flex items-center gap-2" aria-label="Liquifi home">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="26" height="26" rx="7" stroke="var(--color-accent)" strokeWidth="2" />
              <path d="M9 20c2-7 12-7 14 0" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" />
              <circle cx="16" cy="12" r="2.5" fill="var(--color-accent)" />
            </svg>
            <span className="text-[20px] font-bold leading-7 text-text-primary">Liquifi</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            <a href="#features" className="rounded-md px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary">Features</a>
            <a href="#how" className="rounded-md px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary">How it works</a>
            <Link href="/login" className="ml-2 rounded-md px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary">Sign in</Link>
            <Link href="/signup" className="ml-1 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover">Get started</Link>
          </nav>

          {/* Mobile menu */}
          <details className="group relative md:hidden">
            <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-md border border-border text-text-primary [&::-webkit-details-marker]:hidden">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </summary>
            <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-border bg-surface p-2 shadow-[0px_4px_16px_rgba(17,17,20,0.10)]">
              <a href="#features" className="block rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary hover:text-text-primary">Features</a>
              <a href="#how" className="block rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary hover:text-text-primary">How it works</a>
              <div className="my-2 h-px bg-border" />
              <Link href="/login" className="block rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary hover:text-text-primary">Sign in</Link>
              <Link href="/signup" className="mt-1 block rounded-full bg-accent px-3 py-2 text-center text-sm font-medium text-accent-foreground hover:bg-accent-hover">Get started</Link>
            </div>
          </details>
        </div>
      </header>

      {/* Hero — eyebrow → headline → subcopy → CTAs */}
      <section className="mx-auto w-full max-w-[1440px] px-4 pb-20 pt-24 text-center md:px-8 md:pb-28 md:pt-40">
        <span style={reveal(80)} className="mb-7 inline-flex items-center rounded-full bg-accent-light px-3.5 py-1.5 text-xs font-medium text-text-dark">
          For Mabini Colleges department councils
        </span>

        <h1 className="mx-auto max-w-3xl text-center text-[34px] font-bold leading-[1.12] tracking-tight text-text-primary sm:text-[48px] md:text-[56px]">
          From receipt to signed report &mdash; all in one place.
        </h1>

        <p style={reveal(160)} className="mx-auto mt-7 max-w-xl text-base font-normal text-text-secondary md:text-lg">
          Log expenses, track your budget in real time, and hand your adviser a signed,
          verifiable report — without the paper trail.
        </p>

        <div style={reveal(240)} className="mt-12 flex items-center justify-center gap-3">
          <Link href="/signup" className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover">Get started</Link>
          <Link href="/login" className="rounded-full border border-border bg-surface px-6 py-3 text-sm font-medium text-text-primary transition-colors hover:border-border-strong hover:bg-surface-secondary">Sign in</Link>
        </div>
      </section>

      {/* Hero product visual */}
      <section style={reveal(320)} className="mx-auto w-full max-w-[1440px] px-4 md:px-8">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-[24px] border border-border bg-surface shadow-[0px_1px_2px_rgba(17,17,20,0.04),0px_8px_24px_rgba(17,17,20,0.06)]">
          <Image
            src="/landing/img-1.png"
            alt="Liquifi event budget dashboard preview"
            width={722}
            height={530}
            className="h-auto w-full"
            priority
          />
        </div>
      </section>
    </>
  );
}
