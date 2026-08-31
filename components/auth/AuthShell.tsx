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

function BackIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

export default function AuthShell({
  children,
  subtitle,
  hideLogo,
  top,
  backHref,
  onBack,
}: {
  children: React.ReactNode;
  subtitle?: string;
  hideLogo?: boolean;
  top?: boolean;
  backHref?: string;
  /** Optional function back — renders a button instead of the href Link (used by multi-step wizards). */
  onBack?: () => void;
}) {
  return (
    <main className={`flex min-h-full ${top ? "items-start pt-0" : "items-center py-12"} justify-center bg-background px-4 font-sans`}>
      <div className="w-full max-w-sm">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-muted outline-none transition-colors hover:bg-surface hover:text-text-primary"
          >
            <BackIcon />
          </button>
        ) : backHref ? (
          <Link
            href={backHref}
            aria-label="Go back"
            className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-muted outline-none transition-colors hover:bg-surface hover:text-text-primary"
          >
            <BackIcon />
          </Link>
        ) : null}
        {!hideLogo && (
          <Link
            href="/"
            className={`mb-8 flex items-center justify-center gap-2 ${top && !backHref && !onBack ? "mt-8" : ""}`}
            aria-label="Liquifi home"
          >
            <LogoMark className="text-accent" />
            <span className="text-[20px] font-bold leading-7 text-text-primary">Liquifi</span>
          </Link>
        )}
        {subtitle && (
          <p className="mb-6 text-center text-sm font-normal text-text-muted">{subtitle}</p>
        )}
        {children}
      </div>
    </main>
  );
}
