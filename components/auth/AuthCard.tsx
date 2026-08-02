export default function AuthCard({
  title,
  subtitle,
  children,
  center,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  center?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-6 ${center ? "text-center" : ""}`}>
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-9 text-text-primary">{title}</h1>
        {subtitle && <p className="text-sm font-normal text-text-secondary">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
