export type DepartmentMemberRole = "treasurer" | "adviser";

export type DepartmentMemberSummary = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: DepartmentMemberRole;
  account_status: string;
  created_at: string;
};

export function sortDepartmentMembers(
  users: DepartmentMemberSummary[],
): DepartmentMemberSummary[] {
  return [...users].sort((a, b) => {
    const activeDifference =
      Number(b.account_status === "active") - Number(a.account_status === "active");
    return activeDifference
      || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function getDepartmentUserSections(users: DepartmentMemberSummary[]): {
  treasurers: DepartmentMemberSummary[];
  advisers: DepartmentMemberSummary[];
} {
  const sorted = sortDepartmentMembers(users);
  return {
    treasurers: sorted.filter((user) => user.role === "treasurer"),
    advisers: sorted.filter((user) => user.role === "adviser"),
  };
}

export function searchDepartmentMembers(
  users: DepartmentMemberSummary[],
  query: string,
): DepartmentMemberSummary[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return sortDepartmentMembers(users).filter((user) =>
    `${user.first_name} ${user.last_name} ${user.email}`
      .toLowerCase()
      .includes(normalized),
  );
}
