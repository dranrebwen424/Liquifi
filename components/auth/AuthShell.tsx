import Link from "next/link";

function LogoMark({ className }: { className?: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <rect x="3" y="3" width="26" height="26" rx="7" stroke="currentColor" strokeWidth="2" />
      <path d="M9 20c2-7 12-7 14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="12" r="2.5" fill="currentColor" />
    </svg>
  );
}

export default function AuthShell({
  children,
  subtitle,
}: {
  children: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <main className="flex min-h-full font-sans">
      {/* Left brand panel — web only */}
      <div className="hidden w-1/2 flex-col justify-between bg-surface-inverse p-12 text-text-inverse lg:flex">
        <Link href="/" className="flex items-center gap-2 text-text-inverse" aria-label="Liquifi home">
          <LogoMark />
          <span className="text-[20px] font-bold leading-7">Liquifi</span>
        </Link>

        <div className="flex flex-col gap-8">
          <h2 className="text-[28px] font-semibold leading-9">
            From receipt to signed report — all in one place.
          </h2>
          <ul className="flex flex-col gap-3 text-sm font-normal text-text-inverse/70">
            <li>Log expenses by photo or by hand — AI reads the receipt.</li>
            <li>Track your budget in real time, overspend flagged instantly.</li>
            <li>Hand your adviser a signed, anchored, verifiable report.</li>
          </ul>
        </div>

        <p className="text-xs font-normal text-text-inverse/60">
          Internal liquidation tool for Mabini Colleges department councils.
        </p>
      </div>

      {/* Right form side */}
      <div className="flex w-full flex-col items-center justify-center bg-background px-4 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 flex items-center gap-2 lg:hidden" aria-label="Liquifi home">
            <LogoMark className="text-accent" />
            <span className="text-[20px] font-bold leading-7 text-text-primary">Liquifi</span>
          </Link>
          {subtitle && <p className="mb-6 text-sm font-normal text-text-muted">{subtitle}</p>}
          {children}
        </div>
      </div>
    </main>
  );
}
