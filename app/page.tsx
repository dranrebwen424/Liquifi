import Link from "next/link";
import Image from "next/image";

const FEATURES = [
  {
    title: "AI receipt parsing",
    body: "Upload a receipt photo — the system reads the document type, number, supplier, amount, and itemized breakdown for you. No manual typing of parsed fields.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
        <path d="M6 3h9l3 3v15H6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M9 9h6M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Real-time budget tracking",
    body: "Total, Spent, and Remaining update the moment an entry is deducted. Overspend is flagged the instant it happens — nothing slips through.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
        <path d="M4 19V5M4 19h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M8 15l3-4 3 2 4-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Signed, anchored reports",
    body: "Generate the financial report, route it to your adviser, collect the physical signatures, then anchor and archive it for good.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
        <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const STEPS = [
  { n: "01", title: "Log", body: "Upload a receipt photo or enter an expense by hand. AI reads the receipt for you." },
  { n: "02", title: "Track", body: "Total, Spent, and Remaining update the moment an entry is deducted. Overspend is flagged instantly." },
  { n: "03", title: "Report", body: "Generate the financial report, route it to your adviser, get it signed, then anchor and archive." },
];

const cardClass =
  "flex h-full flex-col rounded-lg border border-border bg-surface p-8 shadow-[0px_1px_2px_rgba(17,17,20,0.04),0px_1px_3px_rgba(17,17,20,0.06)]";

export default function LandingPage() {
  return (
    <main className="flex min-h-full flex-col bg-background font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-surface/90 backdrop-blur">
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
        <span className="mb-7 inline-flex items-center rounded-full bg-accent-light px-3.5 py-1.5 text-xs font-medium text-text-dark">
          For Mabini Colleges department councils
        </span>
        <h1 className="mx-auto max-w-3xl text-[34px] font-bold leading-[1.12] tracking-tight text-text-primary sm:text-[48px] md:text-[56px]">
          From receipt to signed report — all in one place.
        </h1>
        <p className="mx-auto mt-7 max-w-xl text-base font-normal text-text-secondary md:text-lg">
          Log expenses, track your budget in real time, and hand your adviser a signed,
          verifiable report — without the paper trail.
        </p>
        <div className="mt-12 flex items-center justify-center gap-3">
          <Link href="/signup" className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover">Get started</Link>
          <Link href="/login" className="rounded-full border border-border bg-surface px-6 py-3 text-sm font-medium text-text-primary transition-colors hover:border-border-strong hover:bg-surface-secondary">Sign in</Link>
        </div>
      </section>

      {/* Hero product visual — image holder */}
      <section className="mx-auto w-full max-w-[1440px] px-4 md:px-8">
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

      {/* Features — eyebrow → heading → intro → cards */}
      <section id="features" className="mx-auto w-full max-w-[1440px] px-4 py-28 md:px-8 md:py-36">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-text-muted">Capabilities</p>
          <h2 className="mt-3 text-base font-semibold text-text-primary">Features</h2>
          <div className="mx-auto mt-3 h-0.5 w-12 rounded-full bg-accent" />
          <p className="mx-auto mt-6 max-w-xl text-sm font-normal text-text-secondary">
            Everything a department council needs to keep liquidation honest and effortless.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className={cardClass}>
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-muted text-accent">{feature.icon}</span>
              <h3 className="mt-6 text-base font-semibold text-text-primary">{feature.title}</h3>
              <p className="mt-3 text-sm font-normal leading-6 text-text-secondary">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works — eyebrow → heading → cards */}
      <section id="how" className="mx-auto w-full max-w-[1440px] px-4 pb-28 md:px-8 md:pb-36">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-text-muted">The process</p>
          <h2 className="mt-3 text-base font-semibold text-text-primary">How it works</h2>
          <div className="mx-auto mt-3 h-0.5 w-12 rounded-full bg-accent" />
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n} className={cardClass}>
              <div className="text-sm font-semibold text-accent">{step.n}</div>
              <h3 className="mt-4 text-base font-semibold text-text-primary">{step.title}</h3>
              <p className="mt-3 text-sm font-normal leading-6 text-text-secondary">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA — eyebrow → heading → subcopy → button */}
      <section className="mx-auto w-full max-w-[1440px] px-4 pb-28 md:px-8">
        <div className="rounded-lg border border-border bg-surface px-6 py-16 text-center shadow-[0px_1px_2px_rgba(17,17,20,0.04),0px_1px_3px_rgba(17,17,20,0.06)] md:px-10 md:py-20">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-text-muted">Get started</p>
          <h2 className="mx-auto mt-3 max-w-xl text-base font-semibold text-text-primary">
            Ready to get your council&rsquo;s liquidation in order?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm font-normal text-text-secondary">
            Create an event, invite your treasurer, and close the loop from first receipt to final signature.
          </p>
          <div className="mt-9 flex items-center justify-center">
            <Link href="/signup" className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover">Get started</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-surface">
        <div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-2 px-4 py-10 sm:flex-row sm:items-center md:px-8">
          <div className="flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="26" height="26" rx="7" stroke="var(--color-accent)" strokeWidth="2" />
              <path d="M9 20c2-7 12-7 14 0" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" />
              <circle cx="16" cy="12" r="2.5" fill="var(--color-accent)" />
            </svg>
            <span className="text-sm font-semibold text-text-primary">Liquifi</span>
          </div>
          <p className="text-xs font-normal text-text-muted">
            Internal liquidation tool for Mabini Colleges department councils.
          </p>
        </div>
      </footer>
    </main>
  );
}
