export default function AuthCard({
  title,
  subtitle,
  children,
  center,
  compactSubtitle,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  center?: boolean;
  compactSubtitle?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-6 ${center ? "text-center" : ""}`}>
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-9 text-text-primary">{title}</h1>
        {subtitle && <p className={`${compactSubtitle ? "text-xs leading-5 sm:text-sm" : "text-sm"} font-normal text-text-secondary`}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
