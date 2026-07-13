import Link from "next/link";

export default function AuthLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`text-sm font-medium text-accent hover:underline ${className}`}
    >
      {children}
    </Link>
  );
}
