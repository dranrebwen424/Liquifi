# Admin Department Users Role Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split department members into Treasurer and Adviser previews, add combined search, improve member-card clarity, and add role-specific full-list pages.

**Architecture:** Put deterministic member sorting, grouping, and searching in one pure library with an assert-based check. Reuse one presentational member card in the Users tab and two thin static role routes backed by one shared server page component. The department workspace owns search placement and reads `?tab=users` only as its initial tab.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict mode, Tailwind CSS v4 theme tokens, Lucide icons, InsForge server SDK.

## Global Constraints

- Use only existing `@theme` utilities; no hardcoded hex values or raw Tailwind colors.
- Search mode hides section headings, totals, and `View all` links and renders every combined match.
- Empty-query previews show at most three Treasurers and three Advisers.
- Sort active accounts first, then `created_at` newest-first.
- Role pages contain no department identity card or department workspace bottom navigation.
- Preserve explicit department scoping and the existing admin layout authorization.
- Add no dependency, schema, mutation, or RLS change.

---

### Task 1: Member derivation contract

**Files:**
- Create: `lib/admin-department-users.ts`
- Create: `scripts/check-admin-department-users.ts`

**Interfaces:**
- Produces: `DepartmentMemberSummary`, `DepartmentMemberRole`, `sortDepartmentMembers(users)`, `getDepartmentUserSections(users)`, and `searchDepartmentMembers(users, query)`.
- Sorting returns a new array and never mutates the server-provided input.

- [ ] **Step 1: Write the failing pure check**

```ts
import assert from "node:assert";
import {
  getDepartmentUserSections,
  searchDepartmentMembers,
  sortDepartmentMembers,
  type DepartmentMemberSummary,
} from "../lib/admin-department-users";

const users: DepartmentMemberSummary[] = [
  { id: "t-old", first_name: "Old", last_name: "Treasurer", email: "old@example.com", role: "treasurer", account_status: "deactivated", created_at: "2026-01-01" },
  { id: "a-new", first_name: "Ana", last_name: "Adviser", email: "ana@example.com", role: "adviser", account_status: "active", created_at: "2026-05-01" },
  { id: "t-new", first_name: "New", last_name: "Treasurer", email: "new@example.com", role: "treasurer", account_status: "pending_approval", created_at: "2026-06-01" },
  { id: "t-active", first_name: "Current", last_name: "Treasurer", email: "current@example.com", role: "treasurer", account_status: "active", created_at: "2025-01-01" },
  { id: "a-old", first_name: "Former", last_name: "Adviser", email: "former@example.com", role: "adviser", account_status: "deactivated", created_at: "2026-02-01" },
];

assert.deepEqual(sortDepartmentMembers(users).map((user) => user.id), ["a-new", "t-active", "t-new", "a-old", "t-old"]);
const sections = getDepartmentUserSections(users);
assert.deepEqual(sections.treasurers.map((user) => user.id), ["t-active", "t-new", "t-old"]);
assert.deepEqual(sections.advisers.map((user) => user.id), ["a-new", "a-old"]);
assert.deepEqual(searchDepartmentMembers(users, "current").map((user) => user.id), ["t-active"]);
assert.deepEqual(searchDepartmentMembers(users, "ANA@EXAMPLE.COM").map((user) => user.id), ["a-new"]);
assert.deepEqual(searchDepartmentMembers(users, "   "), []);
assert.equal(users[0].id, "t-old");
console.log("admin department users check: all assertions passed");
```

- [ ] **Step 2: Run the check and verify it fails**

Run: `npx tsx scripts/check-admin-department-users.ts`

Expected: module-not-found failure for `lib/admin-department-users`.

- [ ] **Step 3: Implement the pure library**

```ts
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

export function sortDepartmentMembers(users: DepartmentMemberSummary[]): DepartmentMemberSummary[] {
  return [...users].sort((a, b) => {
    const activeDifference = Number(b.account_status === "active") - Number(a.account_status === "active");
    return activeDifference || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
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
    `${user.first_name} ${user.last_name} ${user.email}`.toLowerCase().includes(normalized),
  );
}
```

- [ ] **Step 4: Run the check and typecheck**

Run: `npx tsx scripts/check-admin-department-users.ts; npx tsc --noEmit`

Expected: check prints `all assertions passed`; TypeScript exits 0.

- [ ] **Step 5: Commit**

```bash
git add lib/admin-department-users.ts scripts/check-admin-department-users.ts
git commit -m "Add department member grouping contract"
```

---

### Task 2: Readable card and role previews

**Files:**
- Create: `components/admin/DepartmentMemberCard.tsx`
- Modify: `components/admin/DepartmentUsersTab.tsx`
- Modify: `components/admin/DepartmentDetailClient.tsx`
- Modify: `app/admin/departments/[departmentId]/page.tsx`
- Modify: `scripts/check-admin-department-users.ts`

**Interfaces:**
- Consumes: Task 1 member type and pure derivation functions.
- Produces: `DepartmentMemberCard({ departmentId, user })` and `DepartmentUsersTab({ departmentId, users, query })`.
- `DepartmentDetailClient` gains `initialTab?: Tab`, owns `userQuery`, and places the search field immediately after the identity card while Users is active.

- [ ] **Step 1: Extend the structural check before UI changes**

Append checks that read source files and assert:

```ts
import { readFileSync } from "node:fs";

const tabSource = readFileSync("components/admin/DepartmentUsersTab.tsx", "utf8");
const detailSource = readFileSync("components/admin/DepartmentDetailClient.tsx", "utf8");
const cardSource = readFileSync("components/admin/DepartmentMemberCard.tsx", "utf8");
assert.match(tabSource, /slice\(0, 3\)/);
assert.match(tabSource, /View all/);
assert.match(tabSource, /query\.trim\(\)/);
assert.match(detailSource, /placeholder="Search users"/);
assert.match(detailSource, /activeTab === "Users"/);
assert.match(cardSource, /Pending approval/);
assert.match(cardSource, /Deactivated/);
assert.match(cardSource, /ChevronRight/);
```

Run: `npx tsx scripts/check-admin-department-users.ts`

Expected: file-not-found failure for `DepartmentMemberCard.tsx`.

- [ ] **Step 2: Build the shared readable member card**

Create a tokenized Link card with this data contract and visible copy:

```ts
const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  pending_approval: "Pending approval",
  deactivated: "Deactivated",
  rejected: "Rejected",
};

const STATUS_CLASSES: Record<string, string> = {
  active: "bg-success-light text-success-dark",
  pending_approval: "bg-warning-light text-warning-dark",
  deactivated: "bg-neutral-light text-neutral-foreground",
  rejected: "bg-error-light text-error-dark",
};
```

The card must render initials, name, email, `Treasurer`/`Adviser`, a textual status chip, and `ChevronRight`; link to `/admin/departments/${departmentId}/users/${user.id}`; and use `rounded-2xl border border-border bg-surface p-4 shadow-card` with visible focus styling.

- [ ] **Step 3: Rewrite the Users tab around preview and search modes**

Implement these exact branches:

```tsx
const normalizedQuery = query.trim();
const sections = getDepartmentUserSections(users);
const searchResults = searchDepartmentMembers(users, query);

if (normalizedQuery) {
  return searchResults.length ? (
    <div className="flex flex-col gap-2">
      {searchResults.map((user) => <DepartmentMemberCard key={user.id} departmentId={departmentId} user={user} />)}
    </div>
  ) : (
    <EmptyState icon={<UsersRound aria-hidden="true" />} title="No matching users" description="No department users match your search." />
  );
}
```

For empty-query mode, render Treasurers then Advisers. Each header contains role title, `Total of {count} users`, and a `View all` link to its static route. Render `members.slice(0, 3)` with the shared card, or a compact role-specific empty sentence.

- [ ] **Step 4: Put search under the identity card and restore `?tab=users`**

In `DepartmentDetailClient`, export the tab type, initialize state from `initialTab`, add `userQuery`, and render this only while Users is active directly after the identity card:

```tsx
{activeTab === "Users" && (
  <label className="relative block">
    <span className="sr-only">Search users</span>
    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
    <input
      type="search"
      value={userQuery}
      onChange={(event) => setUserQuery(event.target.value)}
      placeholder="Search users"
      className="h-11 w-full rounded-full border border-border-strong bg-surface pl-11 pr-4 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
    />
  </label>
)}
```

Pass `query={userQuery}` to `DepartmentUsersTab`. In the server page, add `searchParams: Promise<{ tab?: string }>` and pass `initialTab={tab === "users" ? "Users" : "Events"}`. Extend the users select with `created_at`, order newest-first, and filter the mapped data to `treasurer`/`adviser` before the typed prop.

- [ ] **Step 5: Run scoped checks**

Run: `npx tsx scripts/check-admin-department-users.ts; npx eslint "components/admin/DepartmentMemberCard.tsx" "components/admin/DepartmentUsersTab.tsx" "components/admin/DepartmentDetailClient.tsx" "app/admin/departments/[departmentId]/page.tsx"; npx tsc --noEmit`

Expected: all commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add components/admin/DepartmentMemberCard.tsx components/admin/DepartmentUsersTab.tsx components/admin/DepartmentDetailClient.tsx app/admin/departments/[departmentId]/page.tsx scripts/check-admin-department-users.ts
git commit -m "Redesign department user role previews"
```

---

### Task 3: Role-specific full-list pages

**Files:**
- Create: `components/admin/DepartmentRoleUsersPage.tsx`
- Create: `app/admin/departments/[departmentId]/users/treasurers/page.tsx`
- Create: `app/admin/departments/[departmentId]/users/advisers/page.tsx`
- Modify: `scripts/check-admin-department-users.ts`

**Interfaces:**
- Consumes: `DepartmentMemberRole`, `sortDepartmentMembers`, and `DepartmentMemberCard`.
- Produces: `DepartmentRoleUsersPage({ departmentId, role, title })`, used by both static route wrappers.

- [ ] **Step 1: Add failing route assertions**

```ts
const rolePageSource = readFileSync("components/admin/DepartmentRoleUsersPage.tsx", "utf8");
const treasurerPageSource = readFileSync("app/admin/departments/[departmentId]/users/treasurers/page.tsx", "utf8");
const adviserPageSource = readFileSync("app/admin/departments/[departmentId]/users/advisers/page.tsx", "utf8");
assert.match(rolePageSource, /eq\("department_id", departmentId\)/);
assert.match(rolePageSource, /eq\("role", role\)/);
assert.match(rolePageSource, /\?tab=users/);
assert.match(rolePageSource, /pt-6/);
assert.match(treasurerPageSource, /role="treasurer"/);
assert.match(adviserPageSource, /role="adviser"/);
```

Run: `npx tsx scripts/check-admin-department-users.ts`

Expected: file-not-found failure for `DepartmentRoleUsersPage.tsx`.

- [ ] **Step 2: Implement the shared server page**

The async server component must create the server client, fetch the department by ID and users by both department and fixed role in parallel, call `notFound()` if the department is missing, and throw on either SDK error. Render:

```tsx
<div className="flex flex-col gap-6 pb-10 pt-6">
  <Link href={`/admin/departments/${departmentId}?tab=users`} className="inline-flex w-fit items-center gap-2 text-lg font-medium text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
    <ArrowLeft className="h-5 w-5" aria-hidden="true" />
    {title}
  </Link>
  {members.length ? (
    <div className="flex flex-col gap-2">
      {members.map((member) => <DepartmentMemberCard key={member.id} departmentId={departmentId} user={member} />)}
    </div>
  ) : (
    <EmptyState icon={<UsersRound aria-hidden="true" />} title={`No ${title.toLowerCase()}`} description={`This department has no ${title.toLowerCase()} yet.`} />
  )}
</div>
```

Select `id, first_name, last_name, email, role, account_status, created_at`; call `sortDepartmentMembers` before rendering. Do not import or render `DepartmentDetailClient`.

- [ ] **Step 3: Add the two static wrappers**

Treasurers:

```tsx
import { DepartmentRoleUsersPage } from "@/components/admin/DepartmentRoleUsersPage";

export default async function TreasurersPage({ params }: { params: Promise<{ departmentId: string }> }) {
  const { departmentId } = await params;
  return <DepartmentRoleUsersPage departmentId={departmentId} role="treasurer" title="Treasurers" />;
}
```

Advisers:

```tsx
import { DepartmentRoleUsersPage } from "@/components/admin/DepartmentRoleUsersPage";

export default async function AdvisersPage({ params }: { params: Promise<{ departmentId: string }> }) {
  const { departmentId } = await params;
  return <DepartmentRoleUsersPage departmentId={departmentId} role="adviser" title="Advisers" />;
}
```

- [ ] **Step 4: Verify routes and build**

Run: `npx tsx scripts/check-admin-department-users.ts; npx eslint "components/admin/DepartmentRoleUsersPage.tsx" "app/admin/departments/[departmentId]/users/treasurers/page.tsx" "app/admin/departments/[departmentId]/users/advisers/page.tsx"; npx tsc --noEmit; npm run build`

Expected: pure/structural checks pass; build lists both new role routes and exits 0.

- [ ] **Step 5: Commit**

```bash
git add components/admin/DepartmentRoleUsersPage.tsx app/admin/departments/[departmentId]/users/treasurers/page.tsx app/admin/departments/[departmentId]/users/advisers/page.tsx scripts/check-admin-department-users.ts
git commit -m "Add department role user lists"
```

---

### Task 4: Browser verification and durable UI documentation

**Files:**
- Modify: `context/ui-registry.md`
- Modify: `context/progress-tracker.md`

**Interfaces:**
- Documents the final Users tab, member-card anatomy, search mode, sorting, and role-list pages.

- [ ] **Step 1: Verify the real rendered UI**

Use an authenticated admin session or a temporary mock preview that is restored before commit. At 390px and 1440px verify:

1. Users search appears immediately below the department card only on Users.
2. Empty query shows Treasurer and Adviser sections, counts, three-card maximum, and `View all`.
3. Active account is first; remaining cards are newest-first.
4. Search text hides both headers and both `View all` links and shows all combined matches.
5. Cards explain role and status in text and open the existing profile.
6. Both full-list pages begin with 24px top spacing and `← Treasurers`/`← Advisers`.
7. Full-list pages have no department hero and no workspace bottom navigation.
8. Browser console has no errors.

- [ ] **Step 2: Update registry and progress tracker**

Update the `DepartmentUsersTab` registry entry with the two-section preview, search-only result mode, readable status/role card, and full-list routes. Update `Latest completed` with the same behavior and verification evidence.

- [ ] **Step 3: Run final verification**

Run: `npx tsx scripts/check-admin-department-users.ts; npx eslint "components/admin/DepartmentMemberCard.tsx" "components/admin/DepartmentUsersTab.tsx" "components/admin/DepartmentDetailClient.tsx" "components/admin/DepartmentRoleUsersPage.tsx" "app/admin/departments/[departmentId]/page.tsx" "app/admin/departments/[departmentId]/users/treasurers/page.tsx" "app/admin/departments/[departmentId]/users/advisers/page.tsx" "scripts/check-admin-department-users.ts"; npx tsc --noEmit; npm run build; git diff --check`

Expected: every command exits 0.

- [ ] **Step 4: Commit documentation**

```bash
git add context/ui-registry.md context/progress-tracker.md
git commit -m "Document department user role views"
```
