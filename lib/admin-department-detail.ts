export type DepartmentEventSortItem = {
  id: string;
  name: string;
  status: "open" | "archived";
  created_at: string;
};

export function getDepartmentEventSections<T extends DepartmentEventSortItem>(
  events: T[],
  query: string,
  archiveSort: "newest" | "oldest",
): {
  activeEvents: T[];
  recentActiveEvents: T[];
  archivedEvents: T[];
} {
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? events.filter((event) => event.name.toLowerCase().includes(normalizedQuery))
    : events;
  const byNewest = (a: T, b: T) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  const activeEvents = filtered.filter((event) => event.status === "open").sort(byNewest);
  const archivedEvents = filtered
    .filter((event) => event.status === "archived")
    .sort(archiveSort === "oldest" ? (a, b) => -byNewest(a, b) : byNewest);

  return {
    activeEvents,
    recentActiveEvents: activeEvents.slice(0, 4),
    archivedEvents,
  };
}
