import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import AuthLink from "@/components/auth/AuthLink";

export default function PendingApprovalPage() {
  return (
    <AuthShell subtitle="Your account is awaiting approval.">
      <AuthCard title="Pending approval">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-normal text-text-secondary">
            Thanks for signing up. Your account is pending approval from the right
            authority — an administrator for advisers, or your department&rsquo;s
            adviser for treasurers.
          </p>
          <p className="text-sm font-normal text-text-secondary">
            You&rsquo;ll get an email once your account is approved. Until then,
            this page is all you can see.
          </p>
          <div className="pt-2">
            <AuthLink href="/login">Back to sign in</AuthLink>
          </div>
        </div>
      </AuthCard>
    </AuthShell>
  );
}
