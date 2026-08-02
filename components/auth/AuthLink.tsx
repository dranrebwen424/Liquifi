import Link from "next/link";

export default function AuthLink({
  href,
  children,
  muted = false,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  muted?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`text-sm font-medium ${
        muted
          ? "text-text-muted hover:text-text-secondary"
          : "text-accent hover:underline"
      } ${className}`}
    >
      {children}
    </Link>
  );
}
