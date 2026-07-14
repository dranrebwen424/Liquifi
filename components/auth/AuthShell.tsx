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
  hideLogo,
  top,
}: {
  children: React.ReactNode;
  subtitle?: string;
  hideLogo?: boolean;
  top?: boolean;
}) {
  return (
    <main className={`flex min-h-full ${top ? "items-start pt-0" : "items-center py-12"} justify-center bg-background px-4 font-sans`}>
      <div className="w-full max-w-sm">
        {!hideLogo && (
          <Link href="/" className="mb-8 flex items-center justify-center gap-2" aria-label="Liquifi home">
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
