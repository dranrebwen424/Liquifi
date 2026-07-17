import type { ComponentProps, ReactNode } from "react";

type EmptyStateProps = ComponentProps<"div"> & {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 text-center ${className ?? ""}`}
      {...props}
    >
      {icon && (
        <div className="mb-4 text-text-muted [&>svg]:h-10 [&>svg]:w-10">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-text-primary">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
