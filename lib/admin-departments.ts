export type DepartmentSummary = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
  adviser: string | null;
  treasurer: string | null;
};

export type DepartmentStatusFilter = "all" | "active" | "inactive";
export type DepartmentStaffingFilter = "all" | "fully_staffed" | "needs_adviser" | "needs_treasurer";
export type DepartmentSort = "name" | "newest" | "oldest";

export function filterDepartments(
  rows: DepartmentSummary[],
  options: {
    query: string;
    status: DepartmentStatusFilter;
    staffing: DepartmentStaffingFilter;
    sort: DepartmentSort;
  },
): DepartmentSummary[] {
  const query = options.query.trim().toLowerCase();
  return rows
    .filter((row) => !query || row.name.toLowerCase().includes(query) || row.code.toLowerCase().includes(query))
    .filter((row) => options.status === "all" || row.is_active === (options.status === "active"))
    .filter(
      (row) =>
        options.staffing === "all" ||
        (options.staffing === "fully_staffed" && row.adviser && row.treasurer) ||
        (options.staffing === "needs_adviser" && !row.adviser) ||
        (options.staffing === "needs_treasurer" && !row.treasurer),
    )
    .sort((a, b) =>
      options.sort === "newest"
        ? b.created_at.localeCompare(a.created_at)
        : options.sort === "oldest"
          ? a.created_at.localeCompare(b.created_at)
          : a.name.localeCompare(b.name),
    );
}
