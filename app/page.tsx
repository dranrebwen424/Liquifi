import Link from "next/link";
import { RoleCard } from "@/components/landing/RoleCard";

const STEPS = [
  {
    n: "01",
    title: "Log",
    body: "Upload a receipt photo or enter an expense by hand. AI reads the receipt for you — no manual typing of parsed fields.",
  },
  {
    n: "02",
    title: "Track",
    body: "Total, Spent, and Remaining update the moment an entry is deducted. Overspend is flagged the instant it happens.",
  },
  {
    n: "03",
    title: "Report",
    body: "Generate the financial report, route it to your adviser, get it signed, then anchor and archive it for good.",
  },
];

export default function LandingPage() {
  return (
    <main className="flex min-h-full flex-col bg-background">
      {/* Header */}
      <header className="w-full border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2" aria-label="Liquifi home">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="26" height="26" rx="7" stroke="var(--color-accent)" strokeWidth="2" />
              <path d="M9 20c2-7 12-7 14 0" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" />
              <circle cx="16" cy="12" r="2.5" fill="var(--color-accent)" />
            </svg>
            <span className="text-[20px] font-bold leading-7 text-text-primary">Liquifi</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-md px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-[1440px] px-6 pb-16 pt-20 text-center">
        <span className="mb-6 inline-flex items-center rounded-full bg-accent-light px-3 py-1 text-xs font-medium text-text-dark">
          For Mabini Colleges department councils
        </span>
        <h1 className="mx-auto max-w-3xl text-[32px] font-semibold leading-10 text-text-primary sm:text-[40px] sm:leading-[48px]">
          The liquidation system built for your department council.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base font-normal text-text-secondary">
          Log expenses, track your budget in real time, and hand your adviser a signed,
          verifiable report — without the paper trail.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-text-primary transition-colors hover:border-border-strong hover:bg-surface-secondary"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Roles — confirm the visitor is in the right place */}
      <section className="mx-auto w-full max-w-[1440px] px-6 pb-16">
        <div className="mb-6 text-center">
          <h2 className="text-base font-semibold text-text-primary">
            Built for the three people who run it
          </h2>
          <p className="mt-1 text-sm font-normal text-text-muted">
            Find where you fit — Liquifi is shaped around your role.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <RoleCard
            role="Treasurer"
            title="Log it, watch it add up"
            description="Record every receipt or no-receipt expense, see your budget update live, and generate the report your adviser signs."
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="6" width="18" height="13" rx="2" />
                <path d="M3 10h18" />
                <circle cx="17" cy="14" r="1.5" />
              </svg>
            }
          />
          <RoleCard
            role="Adviser"
            title="Review without the chase"
            description="Approve no-receipt expenses in a batch, sign off on the report, and confirm any overspend in a single pass."
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M8 12l3 3 5-6" />
              </svg>
            }
          />
          <RoleCard
            role="Admin"
            title="Provision and oversee"
            description="Create departments, approve signups, and audit every action taken across your councils — all in one place."
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z" />
              </svg>
            }
          />
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-[1440px] px-6 pb-20">
        <div className="rounded-lg border border-border bg-surface p-6 shadow-[0px_1px_2px_rgba(17,17,20,0.04),0px_1px_3px_rgba(17,17,20,0.06)]">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n}>
                <div className="mb-2 text-sm font-semibold text-accent">{step.n}</div>
                <h3 className="mb-1 text-base font-semibold text-text-primary">{step.title}</h3>
                <p className="text-sm font-normal leading-5 text-text-secondary">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-surface">
        <div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-2 px-6 py-6 sm:flex-row sm:items-center">
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
