# Admin Departments Experience Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a premium responsive admin departments index, a redesigned department workspace with Events first, adviser-style read-only reports, and navigable member profiles with safe account controls.

**Architecture:** Keep Server Components as data owners and reuse current client primitives. Add two small pure helpers for route visibility and department filtering, make `ReportsOverview` path-aware for admin reuse, split the 690-line department client by tab responsibility, and add one admin-only member profile route. No schema or state-machine changes.

**Tech Stack:** Next.js 16.2.10 App Router, React 19, TypeScript strict, Tailwind CSS v4 `@theme` tokens, Framer Motion, Lucide, InsForge SDK.

## Global Constraints

- Read `node_modules/next/dist/docs/` guidance relevant to App Router navigation/search params before changing Next.js behavior.
- Use only `@theme` token utilities; no hardcoded colors or raw Tailwind color classes.
- Poppins remains the only application font.
- No new dependencies or database schema changes.
- Admin event/report views remain read-only; mutating controls are omitted.
- Events is the initial department workspace tab.
- Mobile department lists remain single-column.
- The department workspace mobile top bar is absent and page content starts with at least 24px spacing.
- Do not stage the pre-existing deleted `docs/superpowers/...` files.
- Do not commit, push, or deploy implementation work unless the user explicitly requests it.

## File Structure

**Create**
- `lib/admin-routes.ts` — pure admin route visibility predicate.
- `lib/admin-departments.ts` — department summary/filter/sort types and pure filtering.
- `scripts/check-admin-routes.ts` — route predicate self-check.
- `scripts/check-admin-departments.ts` — department filtering self-check.
- `components/admin/DepartmentCard.tsx` — one responsive index card.
- `components/admin/DepartmentUsersTab.tsx` — linked member cards.
- `components/admin/DepartmentAuditTab.tsx` — audit filters and activity rows.
- `components/admin/AdminMemberProfile.tsx` — member profile and account action UI.
- `app/admin/departments/[departmentId]/users/[userId]/page.tsx` — admin-only member profile data route.

**Modify**
- `app/admin/layout.tsx`
- `components/admin/AdminMobileTopBar.tsx`
- `components/admin/AdminSidebar.tsx`
- `components/layout/MobileSidebarDrawer.tsx`
- `components/admin/DepartmentsListClient.tsx`
- `app/admin/departments/page.tsx`
- `lib/report-overview.ts`
- `scripts/check-report-overview.ts`
- `components/reports/ReportsOverview.tsx`
- `components/admin/DepartmentDetailClient.tsx`
- `app/admin/departments/[departmentId]/page.tsx`
- `actions/departments.ts`
- `context/ui-registry.md`
- `context/progress-tracker.md`

**Delete**
- `components/admin/MobileBottomNav.tsx` — superseded by the mobile drawer.

---

### Task 1: Admin mobile shell and route visibility

**Files:**
- Create: `lib/admin-routes.ts`
- Create: `scripts/check-admin-routes.ts`
- Modify: `components/admin/AdminMobileTopBar.tsx`
- Modify: `components/admin/AdminSidebar.tsx`
- Modify: `components/layout/MobileSidebarDrawer.tsx`
- Modify: `app/admin/layout.tsx`
- Delete: `components/admin/MobileBottomNav.tsx`

**Interfaces:**
- Produces: `isAdminDepartmentWorkspace(pathname: string): boolean`.
- Produces: route-aware mobile top bar with drawer, URL department search, and `/admin/approvals` shortcut.
- Consumes: existing `MobileSidebarDrawer`, `NavItemConfig`, `isImmersivePage`, and `SidebarShell`.

- [ ] **Step 1: Add the failing route self-check**

```ts
// scripts/check-admin-routes.ts
import assert from "node:assert";
import { isAdminDepartmentWorkspace } from "../lib/admin-routes";

assert.equal(isAdminDepartmentWorkspace("/admin/departments"), false);
assert.equal(isAdminDepartmentWorkspace("/admin/departments/dept-1"), true);
assert.equal(isAdminDepartmentWorkspace("/admin/departments/dept-1/users/user-1"), true);
assert.equal(isAdminDepartmentWorkspace("/admin/approvals"), false);
console.log("admin route check: all assertions passed");
```

- [ ] **Step 2: Run the check and confirm the missing-module failure**

Run: `npx tsx scripts/check-admin-routes.ts`

Expected: FAIL because `lib/admin-routes.ts` does not exist.

- [ ] **Step 3: Add the minimal route predicate**

```ts
// lib/admin-routes.ts
export function isAdminDepartmentWorkspace(pathname: string): boolean {
  return /^\/admin\/departments\/[^/]+(?:\/|$)/.test(pathname);
}
```

- [ ] **Step 4: Run the route check**

Run: `npx tsx scripts/check-admin-routes.ts`

Expected: `admin route check: all assertions passed`.

- [ ] **Step 5: Replace the mobile shell**

Implement `AdminMobileTopBar` with local drawer/search state. Use `Menu`, `Search`, `ArrowLeft`, and `ClipboardCheck`; `router.push("/admin/departments?search=1")` enters search and a 150ms effect writes `q`. Return `null` when `isImmersivePage(pathname) || isAdminDepartmentWorkspace(pathname)`.

```tsx
const ADMIN_NAV_ITEMS: NavItemConfig[] = [
  { label: "Departments", href: "/admin/departments", icon: LayoutGrid },
  { label: "Approvals", href: "/admin/approvals", icon: ClipboardCheck },
];

const hidden = isImmersivePage(pathname) || isAdminDepartmentWorkspace(pathname);
if (hidden) return null;

return (
  <>
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 bg-background px-4 lg:hidden">
      <button aria-label="Open menu" className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-secondary" onClick={() => setDrawerOpen(true)}>
        <Menu className="h-6 w-6" />
      </button>
      <button className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm text-text-muted" onClick={enterSearch}>
        <Search className="h-4 w-4" />
        Search departments
      </button>
      <Link href="/admin/approvals" aria-label="Open approvals" className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-secondary">
        <ClipboardCheck className="h-6 w-6" />
      </Link>
    </header>
    <MobileSidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} navItems={ADMIN_NAV_ITEMS} role="admin" />
  </>
);
```

The search-active branch uses Back + autofocus input and exits to `/admin/departments`. Keep icon-only buttons labelled.

- [ ] **Step 6: Update admin navigation and layout**

Change `AdminSidebar` Approvals from `CircleCheckBig` to `ClipboardCheck`. In `MobileSidebarDrawer`, replace `bg-black/50` with `bg-overlay-alpha` and `text-white` with `text-text-inverse`. Remove `AdminMobileBottomNav` from `app/admin/layout.tsx`, render `<SidebarShell mobileBottomNav={false}>`, then delete `components/admin/MobileBottomNav.tsx`.

- [ ] **Step 7: Verify the shell task**

Run: `npx eslint components/admin/AdminMobileTopBar.tsx components/admin/AdminSidebar.tsx components/layout/MobileSidebarDrawer.tsx app/admin/layout.tsx lib/admin-routes.ts scripts/check-admin-routes.ts`

Run: `npx tsc --noEmit`

Expected: both exit 0.

---

### Task 2: Responsive departments index

**Files:**
- Create: `lib/admin-departments.ts`
- Create: `scripts/check-admin-departments.ts`
- Create: `components/admin/DepartmentCard.tsx`
- Modify: `components/admin/DepartmentsListClient.tsx`
- Modify: `app/admin/departments/page.tsx`

**Interfaces:**
- Produces: `DepartmentSummary`, `DepartmentStatusFilter`, `DepartmentStaffingFilter`, `DepartmentSort`, and `filterDepartments`.
- Produces: `DepartmentCard({ department }: { department: DepartmentSummary })`.
- Consumes: URL `q`, existing `createDepartment`, `CssBottomSheet`, and `EmptyState`.

- [ ] **Step 1: Add the failing filter self-check**

```ts
// scripts/check-admin-departments.ts
import assert from "node:assert";
import { filterDepartments, type DepartmentSummary } from "../lib/admin-departments";

const rows: DepartmentSummary[] = [
  { id: "1", name: "College of Accountancy", code: "COA", is_active: true, created_at: "2026-01-01", adviser: "Ada", treasurer: "Tess" },
  { id: "2", name: "Engineering", code: "COE", is_active: false, created_at: "2026-02-01", adviser: null, treasurer: "Theo" },
];

assert.deepEqual(filterDepartments(rows, { query: "coa", status: "all", staffing: "all", sort: "name" }).map((row) => row.id), ["1"]);
assert.deepEqual(filterDepartments(rows, { query: "", status: "inactive", staffing: "all", sort: "name" }).map((row) => row.id), ["2"]);
assert.deepEqual(filterDepartments(rows, { query: "", status: "all", staffing: "needs_adviser", sort: "name" }).map((row) => row.id), ["2"]);
assert.deepEqual(filterDepartments(rows, { query: "", status: "all", staffing: "all", sort: "newest" }).map((row) => row.id), ["2", "1"]);
console.log("admin department check: all assertions passed");
```

- [ ] **Step 2: Run the check and confirm the missing-module failure**

Run: `npx tsx scripts/check-admin-departments.ts`

Expected: FAIL because `lib/admin-departments.ts` does not exist.

- [ ] **Step 3: Implement deterministic filtering**

```ts
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

export function filterDepartments(rows: DepartmentSummary[], options: { query: string; status: DepartmentStatusFilter; staffing: DepartmentStaffingFilter; sort: DepartmentSort }): DepartmentSummary[] {
  const query = options.query.trim().toLowerCase();
  return rows
    .filter((row) => !query || row.name.toLowerCase().includes(query) || row.code.toLowerCase().includes(query))
    .filter((row) => options.status === "all" || row.is_active === (options.status === "active"))
    .filter((row) => options.staffing === "all" || (options.staffing === "fully_staffed" && row.adviser && row.treasurer) || (options.staffing === "needs_adviser" && !row.adviser) || (options.staffing === "needs_treasurer" && !row.treasurer))
    .sort((a, b) => options.sort === "newest" ? b.created_at.localeCompare(a.created_at) : options.sort === "oldest" ? a.created_at.localeCompare(b.created_at) : a.name.localeCompare(b.name));
}
```

- [ ] **Step 4: Run the department check**

Run: `npx tsx scripts/check-admin-departments.ts`

Expected: `admin department check: all assertions passed`.

- [ ] **Step 5: Build one responsive card**

Create `DepartmentCard.tsx` as a full-card prefetched link. Use `Building2`, `BookOpen`, `Landmark`, `ChevronRight`, and the shared `StatusBadge`. Mobile is one wide rounded card; `md` converts it to the current vertical grid card. Remove the old top-right check.

```tsx
<Link href={`/admin/departments/${department.id}`} prefetch className="group flex min-h-[150px] flex-col rounded-2xl border border-border bg-surface p-5 shadow-card transition-[transform,border-color,background-color,color] duration-200 hover:-translate-y-0.5 hover:border-border-strong active:scale-[0.99] active:bg-surface-inverse md:min-h-[220px]">
  <div className="flex items-start gap-3">
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-secondary text-text-primary group-active:bg-nav-active group-active:text-text-inverse"><Building2 className="h-5 w-5" /></span>
    <span className="min-w-0 flex-1">
      <span className="block line-clamp-2 text-base font-semibold text-text-primary group-active:text-text-inverse">{department.name}</span>
      <span className="mt-1 flex items-center gap-2 text-[11px] uppercase tracking-wide text-text-muted">{department.code} · {department.is_active ? "Active" : "Inactive"}</span>
    </span>
    <ChevronRight className="h-4 w-4 text-text-muted md:hidden" />
  </div>
  <div className="mt-auto grid gap-2 border-t border-border-light pt-3 text-xs group-active:border-nav-border">
    <span className="flex items-center gap-2 text-text-secondary group-active:text-text-inverse"><BookOpen className="h-4 w-4" /> Adviser: {department.adviser ?? "Not assigned"}</span>
    <span className="flex items-center gap-2 text-text-secondary group-active:text-text-inverse"><Landmark className="h-4 w-4" /> Treasurer: {department.treasurer ?? "Not assigned"}</span>
  </div>
</Link>
```

- [ ] **Step 6: Rebuild index hierarchy and empty states**

In `DepartmentsListClient`, read `q` from `useSearchParams`, keep desktop search state, add status/staffing/sort state, and call `filterDepartments`. Render mobile `grid-cols-1`; desktop remains `md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`. Add:

```tsx
{departments.length === 0 ? (
  <EmptyState icon={<Building2 />} title="No departments yet" description="Create a department to start organizing events, reports, and accounts." action={<button onClick={openCreate}>Create Department</button>} />
) : filtered.length === 0 ? (
  <EmptyState icon={<SearchX />} title="No matching departments" description="Try another search or clear the current filters." action={<button onClick={clearFilters}>Clear search</button>} />
) : (
  <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4 xl:grid-cols-5">
    {filtered.map((department) => <DepartmentCard key={department.id} department={department} />)}
  </div>
)}
```

Use a mobile filter `CssBottomSheet` containing native status/staffing/sort selects and a desktop inline filter row. Keep the existing create modal/sheet behavior. Make the FAB `md:hidden`, rounded-square, and place it outside animated card containers.

- [ ] **Step 7: Surface index query failures**

Fetch departments and active users in `Promise.all`, inspect both SDK `error` fields, and pass a `loadError` string to the client instead of silently converting a failed query into the zero-department state.

- [ ] **Step 8: Verify the index task**

Run: `npx eslint components/admin/DepartmentCard.tsx components/admin/DepartmentsListClient.tsx app/admin/departments/page.tsx lib/admin-departments.ts scripts/check-admin-departments.ts`

Run: `npx tsc --noEmit`

Expected: both exit 0.

---

### Task 3: Admin-capable shared report overview

**Files:**
- Modify: `lib/report-overview.ts`
- Modify: `scripts/check-report-overview.ts`
- Modify: `components/reports/ReportsOverview.tsx`

**Interfaces:**
- Changes: `ReportOverviewRole` becomes `Extract<Role, "treasurer" | "adviser" | "admin">`.
- Changes: `ReportsOverview` accepts `basePath?: string` and `embedded?: boolean`.
- Preserves: existing treasurer/adviser default paths and behavior.

- [ ] **Step 1: Extend the existing failing check first**

Add:

```ts
assert.deepEqual(getFeaturedReportItems(items, "admin").map((item) => item.eventId), ["pending"]);
assert.equal(getActionRequiredReport(items, "admin"), null);
```

- [ ] **Step 2: Run the check and confirm the type failure**

Run: `npx tsx scripts/check-report-overview.ts`

Expected: TypeScript rejects `"admin"` as `ReportOverviewRole`.

- [ ] **Step 3: Extend the role and path contracts**

```ts
export type ReportOverviewRole = Extract<Role, "treasurer" | "adviser" | "admin">;

const pendingReviewer = role === "adviser" || role === "admin";
const status = pendingReviewer ? "pending_adviser_approval" : "approved";
```

Update component props:

```ts
type Props = {
  role: ReportOverviewRole;
  items: ReportOverviewItem[];
  basePath?: string;
  embedded?: boolean;
};
```

Use `const detailHref = (eventId: string) => `${basePath ?? `/${role}/reports`}/${eventId}`;`. Treat admin featured copy like adviser, suppress the page-level header when `embedded`, and keep action-required treasurer-only.

- [ ] **Step 4: Run the report check and regression typecheck**

Run: `npx tsx scripts/check-report-overview.ts`

Run: `npx tsc --noEmit`

Expected: assertions pass and TypeScript exits 0.

---

### Task 4: Department workspace redesign

**Files:**
- Create: `components/admin/DepartmentUsersTab.tsx`
- Create: `components/admin/DepartmentAuditTab.tsx`
- Modify: `components/admin/DepartmentDetailClient.tsx`
- Modify: `app/admin/departments/[departmentId]/page.tsx`

**Interfaces:**
- Produces: `DepartmentMemberSummary` exported from `DepartmentUsersTab.tsx`.
- Produces: `DepartmentAuditLog` and `DepartmentAuditActor` exported from `DepartmentAuditTab.tsx`.
- Consumes: `EventBrowserItem`, `ReportOverviewItem`, `ReportsOverview`, `EventBrowser`, and admin base paths.

- [ ] **Step 1: Extract linked user cards**

`DepartmentUsersTab` accepts `{ departmentId: string; users: DepartmentMemberSummary[] }`. Render an empty state or linked cards only; account actions move to the member profile.

```tsx
export type DepartmentMemberSummary = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  account_status: string;
};

<Link href={`/admin/departments/${departmentId}/users/${user.id}`} className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card transition-[transform,border-color] hover:-translate-y-0.5 hover:border-border-strong active:scale-[0.99]">
  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-light text-sm font-semibold text-accent">{initials}</span>
  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-text-primary">{fullName}</span><span className="block truncate text-xs text-text-muted">{user.email}</span></span>
  <span className="flex items-center gap-2"><RoleBadge role={user.role} /><AccountStatusBadge status={user.account_status} /><ChevronRight className="h-4 w-4 text-text-muted" /></span>
</Link>
```

- [ ] **Step 2: Extract and restyle audit activity**

Move current actor/category/date filter logic unchanged into `DepartmentAuditTab`. Keep native date inputs. Render one responsive activity-row surface with icon tile, action, actor, date, summary, and accessible expand button; expanded details use `bg-surface-secondary`.

- [ ] **Step 3: Rebuild the workspace shell**

Reduce `DepartmentDetailClient` to header, accessible tabs, and child composition. Use:

```ts
const TABS = ["Events", "Reports", "Users", "Audit Logs"] as const;
const [activeTab, setActiveTab] = useState<Tab>("Events");
```

Header classes: `flex flex-col gap-6 pb-10`, back button with `ArrowLeft`, identity surface `rounded-2xl border border-border bg-surface p-5 shadow-card`, `Building2` tile, name/code/status. Tablist is horizontally scrollable with active underline and reliable counts.

Wire content:

```tsx
{activeTab === "Events" && <EventBrowser events={events} basePath={`/admin/departments/${department.id}/events`} emptyTitle="No events" emptyDescription="This department has no events yet." />}
{activeTab === "Reports" && <ReportsOverview role="admin" items={reports} basePath={`/admin/departments/${department.id}/reports`} embedded />}
{activeTab === "Users" && <DepartmentUsersTab departmentId={department.id} users={users} />}
{activeTab === "Audit Logs" && <DepartmentAuditTab logs={auditLogs} actors={auditActors} />}
```

Implement Left/Right/Home/End key movement on tab buttons and matching `aria-controls`/`role="tabpanel"`.

- [ ] **Step 4: Map report data into the shared contract**

Replace the old `reportRows` with `ReportOverviewItem[]` and include `generatedAt`:

```ts
const reportRows: ReportOverviewItem[] = events.flatMap((event) => {
  const report = reportsByEvent.get(event.id);
  if (!report) return [];
  return [{
    eventId: event.id,
    eventName: event.name,
    eventStatus: event.status,
    createdAt: event.created_at,
    report: { id: report.id, fsDocumentNumber: report.fs_document_number, status: report.status, generatedAt: report.generated_at },
  }];
});
```

Keep no-report/cancelled-latest events excluded through `getLatestReportsByEvent`.

- [ ] **Step 5: Verify the workspace task**

Run: `npx eslint components/admin/DepartmentDetailClient.tsx components/admin/DepartmentUsersTab.tsx components/admin/DepartmentAuditTab.tsx app/admin/departments/[departmentId]/page.tsx components/reports/ReportsOverview.tsx lib/report-overview.ts scripts/check-report-overview.ts`

Run: `npx tsc --noEmit`

Expected: both exit 0.

---

### Task 5: Department member profile and safe account mutation

**Files:**
- Create: `components/admin/AdminMemberProfile.tsx`
- Create: `app/admin/departments/[departmentId]/users/[userId]/page.tsx`
- Modify: `actions/departments.ts`

**Interfaces:**
- Produces: `AdminMemberProfile({ department, member })`.
- Consumes: `setUserAccountStatus(userId, departmentId, newStatus)` with unchanged call signature.

- [ ] **Step 1: Strengthen the mutation guard**

Select `department_id` with status/role, then reject mismatches before the transition check:

```ts
const { data: targetUser, error: fetchErr } = await insforge.database
  .from("users")
  .select("account_status, role, department_id")
  .eq("id", userId)
  .maybeSingle();

if (fetchErr || !targetUser || targetUser.department_id !== departmentId) {
  return { success: false as const, error: "User not found in this department." };
}
```

Add `.eq("department_id", departmentId)` to the update and revalidate both the workspace and member profile route.

- [ ] **Step 2: Add the server member route**

Fetch department and member in parallel. The member query includes `.eq("department_id", departmentId)` and selects `id, first_name, middle_name, last_name, email, role, account_status, department_id, approved_at`. Call `notFound()` if either row is absent; pass plain serializable props to `AdminMemberProfile`.

- [ ] **Step 3: Build the member profile UI**

Use an in-page back link and one centered `max-w-3xl` profile surface. `AdminMemberProfile` is client-only for mutation state. Display initials, full name, role/status labels with shared badge icons, Email, Department, Department code, and Approved date. Render Deactivate only for active and Reactivate only for deactivated; pending/rejected show explanatory text without action.

```tsx
const nextStatus: AccountStatus | null = member.account_status === "active" ? "deactivated" : member.account_status === "deactivated" ? "active" : null;

async function submit(): Promise<void> {
  if (!nextStatus || busy) return;
  setBusy(true);
  setError("");
  const result = await setUserAccountStatus(member.id, department.id, nextStatus);
  if (result.success) router.refresh();
  else setError(result.error);
  setBusy(false);
}
```

Use outline destructive styling for Deactivate and tokenized secondary styling for Reactivate. Keep errors inline and human-readable.

- [ ] **Step 4: Verify profile and action code**

Run: `npx eslint components/admin/AdminMemberProfile.tsx app/admin/departments/[departmentId]/users/[userId]/page.tsx actions/departments.ts`

Run: `npx tsc --noEmit`

Expected: both exit 0.

---

### Task 6: Full verification and durable UI documentation

**Files:**
- Modify: `context/ui-registry.md`
- Modify: `context/progress-tracker.md`

**Interfaces:**
- Documents: new admin mobile shell, responsive department cards, workspace tabs, shared admin reports, member profile route, and mutation guard.

- [ ] **Step 1: Run all pure checks**

Run:

```powershell
npx tsx scripts/check-admin-routes.ts
npx tsx scripts/check-admin-departments.ts
npx tsx scripts/check-report-overview.ts
```

Expected: all assertion summaries pass.

- [ ] **Step 2: Run static verification**

Run:

```powershell
npx eslint app/admin components/admin components/reports/ReportsOverview.tsx lib/admin-routes.ts lib/admin-departments.ts lib/report-overview.ts actions/departments.ts scripts/check-admin-routes.ts scripts/check-admin-departments.ts scripts/check-report-overview.ts
npx tsc --noEmit
npm run build
```

Expected: all commands exit 0 and the build lists the new member-profile dynamic route.

- [ ] **Step 3: Browser verification at desktop and mobile widths**

Using an authenticated admin session, verify at 1440×900 and 390×844:

1. `/admin/departments` has no card-corner check, desktop keeps a multi-column grid, mobile is one column, and card icons/role rows are present.
2. Mobile menu opens, search filters by name/code, Approvals opens `/admin/approvals`, and no bottom navigation remains.
3. Zero departments and no-match filtering show distinct empty states; Create Department opens the existing modal/sheet.
4. `/admin/departments/[departmentId]` has no mobile top bar, begins with at least 24px top spacing, and opens on Events.
5. Reports exclude no-report events and every event/report detail remains read-only.
6. User cards open the matching member profile; active/deactivated action succeeds and wrong-department URLs return not found.
7. Audit filters/expanders still work.
8. Console has no errors and relevant network requests have no unexpected 4xx/5xx responses.

If no admin session is available, complete build/static checks and report authenticated visual verification as the sole blocker instead of claiming it passed.

- [ ] **Step 4: Update durable docs**

Add exact component/file/class conventions to `context/ui-registry.md`. Add the completed feature, verification evidence, and the retained audit newest-100 ceiling to `context/progress-tracker.md`.

- [ ] **Step 5: Final working-tree review**

Run: `git status --short` and `git diff --stat`.

Expected: only intended implementation/docs files plus the known pre-existing `docs/superpowers/...` deletions. Do not stage those deletions.

- [ ] **Step 6: Commit only on explicit request**

If the user explicitly requests a commit, inspect `git status`, `git diff`, and `git log --oneline -10`, stage only intended files, and use:

```powershell
git commit -m "Redesign admin departments experience"
```

Push/deploy only after a separate explicit request or when included in the same user instruction.
