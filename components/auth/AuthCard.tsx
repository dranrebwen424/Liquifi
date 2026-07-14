export default function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-9 text-text-primary">{title}</h1>
        {subtitle && <p className="text-sm font-normal text-text-secondary">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
