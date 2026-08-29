/**
 * Detect event detail pages across all roles.
 * All event page URLs contain /events/ — no nav item href matches this,
 * so it's a clean, collision-free signal.
 *
 * treasurer:  /treasurer/events/[eventId]
 * adviser:    /adviser/events/[eventId]
 * admin:      /admin/departments/[deptId]/events/[eventId]
 */
export function isEventPage(pathname: string): boolean {
  return pathname.includes("/events/");
}

/**
 * Detect report detail pages across all roles.
 * A report URL has a trailing id after /reports/ — the /reports list page
 * has no trailing segment and stays normal.
 *
 * treasurer:  /treasurer/reports/[eventId]
 * adviser:    /adviser/reports/[eventId]
 * admin:      /admin/departments/[deptId]/reports/[eventId]
 */
export function isReportDetailPage(pathname: string): boolean {
  return pathname.includes("/reports/");
}

/**
 * Pages that go immersive on mobile: chrome (top bar + bottom nav) slides
 * away and content fills the screen. Event + report detail pages.
 */
export function isImmersivePage(pathname: string): boolean {
  return isEventPage(pathname) || isReportDetailPage(pathname);
}
