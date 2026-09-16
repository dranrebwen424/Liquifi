export function isAdminDepartmentWorkspace(pathname: string): boolean {
  return /^\/admin\/departments\/[^/]+(?:\/|$)/.test(pathname);
}
