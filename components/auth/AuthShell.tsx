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
  progress,
}: {
  children: React.ReactNode;
  subtitle?: string;
  hideLogo?: boolean;
  top?: boolean;
  backHref?: string;
  /** Optional function back — renders a button instead of the href Link (used by multi-step wizards). */
  onBack?: () => void;
  progress?: React.ReactNode;
}) {
  return (
    <main className={`flex bg-background px-4 font-sans ${progress ? "min-h-dvh flex-col items-center justify-start pt-6 pb-12 sm:px-6 md:justify-center md:py-12" : `min-h-full justify-center ${top ? "items-start pt-0" : "items-center py-12"}`}`}>
      <div className={`w-full ${progress ? "max-w-sm md:max-w-md" : "max-w-sm"}`}>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className={`inline-flex items-center justify-center rounded-lg outline-none transition-colors hover:bg-surface hover:text-text-primary ${progress ? "mb-6 h-11 w-11 text-text-secondary focus-visible:ring-2 focus-visible:ring-accent" : "mb-4 h-9 w-9 text-text-muted"}`}
          >
            <BackIcon />
          </button>
        ) : backHref ? (
          <Link
            href={backHref}
            aria-label="Go back"
            className={`inline-flex items-center justify-center rounded-lg outline-none transition-colors hover:bg-surface hover:text-text-primary ${progress ? "mb-6 h-11 w-11 text-text-secondary focus-visible:ring-2 focus-visible:ring-accent" : "mb-4 h-9 w-9 text-text-muted"}`}
          >
            <BackIcon />
          </Link>
        ) : null}
        {progress && <div className="mb-8">{progress}</div>}
        {!hideLogo && !progress && (
          <Link
            href="/"
            className={`mb-8 flex items-center justify-center gap-2 ${top && !backHref && !onBack ? "mt-8" : ""}`}
            aria-label="Liquifi home"
          >
            <LogoMark className="text-accent" />
            <span className="text-[20px] font-bold leading-7 text-text-primary">Liquifi</span>
          </Link>
        )}
        {subtitle && !progress && (
          <p className="mb-6 text-center text-sm font-normal text-text-muted">{subtitle}</p>
        )}
        {children}
      </div>
    </main>
  );
}
