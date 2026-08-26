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
