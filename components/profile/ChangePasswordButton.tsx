import Link from "next/link";
import { ChevronRight, Shield } from "lucide-react";

export default function ChangePasswordButton() {
  return (
    <Link
      href="/profile/change-password"
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-secondary">
        <Shield className="h-4 w-4 text-text-secondary" aria-hidden="true" />
      </span>
      <span className="flex-1 text-sm font-medium text-text-primary">
        Change password
      </span>
      <ChevronRight className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
    </Link>
  );
}
