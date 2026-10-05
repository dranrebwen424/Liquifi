export default function AuthCard({
  title,
  subtitle,
  children,
  center,
  compactSubtitle,
  flow,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  center?: boolean;
  compactSubtitle?: boolean;
  flow?: boolean;
}) {
  return (
    <div className={`flex flex-col ${flow ? "gap-8 [&_button[type=submit]]:mt-2" : "gap-6"} ${center ? "text-center" : ""}`}>
      <div className={`flex flex-col ${flow ? "gap-3 text-center" : "gap-1"}`}>
        <h1 className={`${flow ? "text-2xl font-semibold leading-8 tracking-tight md:text-3xl md:leading-10" : "text-[28px] font-bold leading-9"} text-text-primary`}>{title}</h1>
        {subtitle && <p className={`${compactSubtitle ? "text-xs leading-5 sm:text-sm" : "text-sm"} ${flow ? "text-balance md:leading-6" : ""} font-normal text-text-secondary`}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
