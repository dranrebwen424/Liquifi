import Link from "next/link";
import { HeroSection } from "@/components/landing/HeroSection";
import { AnimatedBlock } from "@/components/ui/AnimatedBlock";

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
      <HeroSection />

      {/* Features — eyebrow → heading → intro → cards */}
      <section id="features" className="mx-auto w-full max-w-[1440px] px-4 py-28 md:px-8 md:py-36">
        <AnimatedBlock>
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-text-muted">Capabilities</p>
            <h2 className="mt-3 text-base font-semibold text-text-primary">Features</h2>
            <div className="mx-auto mt-3 h-0.5 w-12 rounded-full bg-accent" />
            <p className="mx-auto mt-6 max-w-xl text-sm font-normal text-text-secondary">
              Everything a department council needs to keep liquidation honest and effortless.
            </p>
          </div>
        </AnimatedBlock>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <AnimatedBlock key={feature.title} delay={i * 0.1}>
              <div className={cardClass}>
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-muted text-accent">{feature.icon}</span>
                <h3 className="mt-6 text-base font-semibold text-text-primary">{feature.title}</h3>
                <p className="mt-3 text-sm font-normal leading-6 text-text-secondary">{feature.body}</p>
              </div>
            </AnimatedBlock>
          ))}
        </div>
      </section>

      {/* How it works — eyebrow → heading → cards */}
      <section id="how" className="mx-auto w-full max-w-[1440px] px-4 pb-28 md:px-8 md:pb-36">
        <AnimatedBlock>
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-text-muted">The process</p>
            <h2 className="mt-3 text-base font-semibold text-text-primary">How it works</h2>
            <div className="mx-auto mt-3 h-0.5 w-12 rounded-full bg-accent" />
          </div>
        </AnimatedBlock>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <AnimatedBlock key={step.n} delay={i * 0.1}>
              <div className={cardClass}>
                <div className="text-sm font-semibold text-accent">{step.n}</div>
                <h3 className="mt-4 text-base font-semibold text-text-primary">{step.title}</h3>
                <p className="mt-3 text-sm font-normal leading-6 text-text-secondary">{step.body}</p>
              </div>
            </AnimatedBlock>
          ))}
        </div>
      </section>

      {/* Final CTA — eyebrow → heading → subcopy → button */}
      <AnimatedBlock>
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
      </AnimatedBlock>

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
