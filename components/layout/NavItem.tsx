"use client";

import Link from "next/link";
import type { SVGProps } from "react";
import { Bell, CircleCheckBig, FileText, Home, LayoutGrid, User, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type NavItemConfig = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
};

type NavItemProps = NavItemConfig & {
  isActive: boolean;
  variant: "sidebar" | "bottom";
  collapsed?: boolean;
};

// X-style active state: filled silhouette counterparts for the nav icons
// (Lucide is stroke-only — filling its paths directly turns FileText into a blob).
// Keyed by the outline icon so role configs stay unchanged. Unmapped icons fall
// back to a heavier stroke.
type FilledSvg = (props: SVGProps<SVGSVGElement>) => React.JSX.Element;

const FILLED = new Map<LucideIcon, FilledSvg>([
  [Home, (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        d="M3.709 8.472 10.709 2.473a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2h-4a1 1 0 0 1-1-1v-6a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v6a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 .709-1.528Z"
        clipRule="evenodd"
      />
    </svg>
  )],
  [FileText, (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2ZM8 11.25h8v1.5H8v-1.5Zm0 3.5h8v1.5H8v-1.5Zm0-7h4v1.5H8V7.75Z"
        clipRule="evenodd"
      />
    </svg>
  )],
  [Bell, (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 2a6 6 0 0 0-6 6c0 4.499-1.411 5.956-2.738 7.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8a6 6 0 0 0-6-6Z" />
      <path d="M9.55 19a2.5 2.5 0 0 0 4.9 0h-4.9Z" />
    </svg>
  )],
  [User, (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <circle cx="12" cy="7" r="4.2" />
      <path d="M12 14a5 5 0 0 0-5 5v1.5a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5V19a5 5 0 0 0-5-5Z" />
    </svg>
  )],
  [CircleCheckBig, (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Zm-1.4-7.1 5.8-5.8-1.4-1.4-4.4 4.4-2.1-2.1-1.4 1.4 3.5 3.5Z"
        clipRule="evenodd"
      />
    </svg>
  )],
  [LayoutGrid, (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )],
]);

export function NavItem({ label, href, icon: Icon, isActive, variant, badge = 0, collapsed = false }: NavItemProps) {
  const ActiveIcon = FILLED.get(Icon);

  const renderIcon = () =>
    isActive && ActiveIcon ? (
      <ActiveIcon className={variant === "bottom" ? "h-6 w-6" : "h-5 w-5"} />
    ) : (
      <Icon className={variant === "bottom" ? "h-6 w-6" : "h-5 w-5"} strokeWidth={2} />
    );

  if (variant === "sidebar") {
    return (
      <Link
        href={href}
        title={collapsed ? label : undefined}
        className={cn(
          "group relative flex items-center rounded-xl text-sm font-medium transition-colors duration-200",
          collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
          isActive
            ? "bg-nav-active text-text-inverse"
            : "text-text-muted hover:bg-nav-hover hover:text-text-inverse",
        )}
      >
        <span className="relative z-10 transition-transform duration-200 group-hover:scale-110">
          {renderIcon()}
        </span>
        {!collapsed && (
          <span className="relative z-10 truncate">{label}</span>
        )}
        {!collapsed && badge > 0 && (
          <span className="relative z-10 ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-text-inverse/20 px-1.5 text-[11px] font-semibold leading-none text-text-inverse">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
        {collapsed && badge > 0 && (
          <span className="absolute -right-0.5 -top-0.5 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-text-inverse px-1 text-[9px] font-semibold leading-none text-nav">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </Link>
    );
  }

  // bottom nav variant — X-style: filled icon + accent when active, no pill
  return (
    <Link
      href={href}
      className={cn(
        "relative flex flex-1 flex-col items-center gap-1 py-2.5 transition-all duration-200 active:scale-95",
        isActive ? "text-accent" : "text-text-muted",
      )}
    >
      <span className="relative z-10">
        {renderIcon()}
        {badge > 0 && (
          <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-none text-accent-foreground">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      <span className="relative z-10 text-[11px] font-medium">{label}</span>
    </Link>
  );
}
