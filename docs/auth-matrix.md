# Route × Role × Precondition Matrix

Phase 0 authorization foundation. This single artifact drives both the InsForge RLS policies (see `architecture.md` → RLS / Realtime Scoping) and `lib/auth-guard.ts`. Every later wiring step references this matrix instead of re-deriving guard conditions.

## Legend

- **Dept match?**
  - `yes` — target resource must belong to the actor's `department_id` (adviser/treasurer only; admin is unrestricted).
  - `no` — resource is the actor's own or a new resource in the actor's department (no cross-department match required).
  - `n/a` — admin-global, or a public/unauthenticated surface.
- **State preconditions** — resource-state checks required before allowing the action (see state machines in `project-overview.md` / `architecture.md`). Empty = no additional state gate beyond role × department.
- **RLS policy**
  - `DEPT` — row policy `department_id = current_user.department_id`; admin unrestricted. Applies to every `department_id`-bearing table (`events`, `entries`, `reports`, `report_signatories`, `entry_comments`, `department_report_counters`, `notifications`, `push_subscriptions`, `audit_logs`).
  - `ADMIN` — role check only (`role = 'admin'`); admin-only tables (`departments`, cross-department `audit_logs` reads).
  - `PUB` — public/unauthenticated.
  - `n/a` — not a data-bearing surface.

## Public (unauthenticated)

| Route | Method | Role | Dept match? | State preconditions | RLS policy |
| --- | --- | --- | --- | --- | --- |
| `/` | GET | public | n/a | — | PUB |
| `/login` | GET | public | n/a | — | PUB |
| `/signup` | GET | public | n/a | — | PUB |
| `/pending-approval` | GET | public | n/a | — | PUB |
| `/forgot-password` | GET | public | n/a | — | PUB |
| `/api/auth/otp/send` | POST | public | n/a | — | PUB |
| `/api/auth/otp/verify` | POST | public | n/a | Valid OTP required (verified before any account transition) | PUB |

## Treasurer

| Route | Method | Role | Dept match? | State preconditions | RLS policy |
| --- | --- | --- | --- | --- | --- |
| `/treasurer/home` | GET | treasurer | no | — | DEPT |
| `/treasurer/events/[eventId]` | GET | treasurer | yes | — (archived events viewable read-only) | DEPT |
| `/treasurer/events/[eventId]/entries/new` | GET | treasurer | yes | `Event.is_locked = false`, `Event.status != 'archived'` | DEPT |
| `/treasurer/reports` | GET | treasurer | n/a | — | DEPT |
| `/treasurer/reports/[eventId]` | GET | treasurer | yes | — | DEPT |
| `/treasurer/notifications` | GET | treasurer | n/a | — | DEPT |
| `/treasurer/profile` | GET | treasurer | n/a | — | DEPT |
| `actions/events.ts → createEvent` | POST (action) | treasurer | no | — (new event `status = open` in actor's dept) | DEPT |
| `actions/events.ts → editBudget` | POST (action) | treasurer | yes | `budget_locked = false`, `Event.status != 'archived'` | DEPT |
| `actions/entries.ts → confirmEntry` | POST (action) | treasurer | yes | `Entry.status ∈ {ai_parsed, treasurer_reviewed}`, `Event.is_locked = false`, `Event.status != 'archived'` | DEPT |
| `actions/entries.ts → discardEntry` | POST (action) | treasurer | yes | `Event.is_locked = false`, `Event.status != 'archived'` | DEPT |
| `actions/entries.ts → submitManualEntry` | POST (action) | treasurer | yes | `Event.is_locked = false`, `Event.status != 'archived'` | DEPT |
| `/api/entries/receipt` | POST | treasurer | yes | `Event.is_locked = false`, `Event.status != 'archived'`; reject if `(document_type_raw + document_number)` already exists in event | DEPT |
| `/api/entries/manual` | POST | treasurer | yes | `Event.is_locked = false`, `Event.status != 'archived'` | DEPT |
| `/api/entries/[entryId]/void` | POST | treasurer (current active) | yes | `Event.is_locked = false`, `Event.status != 'archived'`; voider = current active treasurer (fresh lookup, not `created_by`) | DEPT |
| `/api/reports/generate` | POST | treasurer | yes | Pre: all manual entries resolved (`approved`/`discarded`/terminally `rejected`); no existing `Report` for event is `pending_adviser_approval` or `approved`; `Event.status != 'archived'`. Side effect: `Event.is_locked = true` | DEPT |
| `actions/reports.ts → signatorySetup` | POST (action) | treasurer | yes | Only before first report generation for the event | DEPT |
| `/api/reports/[reportId]/cancel` | POST | treasurer | yes | `Report.status = pending_adviser_approval` (only before adviser acts); `Event.status != 'archived'`. Side effect: `Event.is_locked = false` | DEPT |
| `actions/reports.ts → cancelReport` | POST (action) | treasurer | yes | `Report.status = pending_adviser_approval`; `Event.status != 'archived'` | DEPT |
| `/api/events/[eventId]/archive` | POST | treasurer | yes | Pre: `Report.status = approved` for event; `Event.has_unresolved_overspend = false`; `Event.status != 'archived'`. Side effect: `Event.status = archived` (terminal) | DEPT |

## Adviser

| Route | Method | Role | Dept match? | State preconditions | RLS policy |
| --- | --- | --- | --- | --- | --- |
| `/adviser/home` | GET | adviser | n/a | — | DEPT |
| `/adviser/events/[eventId]` | GET | adviser | yes | — (view-only) | DEPT |
| `/adviser/approvals` | GET | adviser | n/a | — | DEPT |
| `/adviser/reports` | GET | adviser | n/a | — | DEPT |
| `/adviser/reports/[eventId]` | GET | adviser | yes | — | DEPT |
| `/adviser/notifications` | GET | adviser | n/a | — | DEPT |
| `/adviser/profile` | GET | adviser | n/a | — | DEPT |
| `/api/entries/[entryId]/approve` | POST | adviser | yes | `Entry.status = pending_approval`, `Entry.type = manual`, `Event.status != 'archived'` (not voided) | DEPT |
| `/api/reports/[reportId]/approve` | POST | adviser | yes | `Report.status = pending_adviser_approval`, `Event.status != 'archived'`. Side effect: resolves overspend + `Report.status = approved`; `Event.is_locked` stays true; Polygon anchor | DEPT |
| `/api/reports/[reportId]/reject` | POST | adviser | yes | `Report.status = pending_adviser_approval`, `Event.status != 'archived'`. Side effect: `Event.is_locked = false` | DEPT |
| `/api/approvals/treasurer` | POST | adviser | yes | Target user `account_status = pending_approval` AND `role = treasurer` AND `department_id = actor.department_id` | DEPT |

## Admin

| Route | Method | Role | Dept match? | State preconditions | RLS policy |
| --- | --- | --- | --- | --- | --- |
| `/admin/departments` | GET | admin | n/a | — | ADMIN |
| `/admin/departments/new` | GET | admin | n/a | — | ADMIN |
| `/admin/departments/[deptId]` | GET | admin | n/a | — | ADMIN |
| `/admin/departments/[deptId]/events` | GET | admin | n/a | — | ADMIN |
| `/admin/departments/[deptId]/events/[eventId]` | GET | admin | n/a | — | ADMIN |
| `/admin/departments/[deptId]/reports` | GET | admin | n/a | — | ADMIN |
| `/admin/departments/[deptId]/reports/[eventId]` | GET | admin | n/a | — | ADMIN |
| `/admin/departments/[deptId]/audit-logs` | GET | admin | n/a | — | ADMIN |
| `/admin/departments/[deptId]/users` | GET | admin | n/a | — | ADMIN |
| `/admin/approvals` | GET | admin | n/a | — | ADMIN |
| `/admin/profile` | GET | admin | n/a | — | ADMIN |
| `actions/departments.ts → createDepartment` | POST (action) | admin | n/a | — | ADMIN |
| `actions/departments.ts → toggleDepartmentActive` | POST (action) | admin | n/a | — | ADMIN |
| `actions/departments.ts → setUserStatus` | POST (action) | admin | n/a | Target `account_status` transition only (active ↔ deactivated, or approve/reject `pending_approval`) | ADMIN |
| `/api/approvals/adviser` | POST | admin | n/a | Target user `account_status = pending_approval` AND `role = adviser` | ADMIN |

## Shared (authenticated, role-scoped)

| Route | Method | Role | Dept match? | State preconditions | RLS policy |
| --- | --- | --- | --- | --- | --- |
| `/api/notifications/subscribe` | POST | treasurer \| adviser | n/a | — | DEPT |

## Derived-state notes (enforced in `preconditionCheck`, never trusted from client)

- `Event.budget_locked` is derived (`true` once any entry for the event reaches `deducted`) — the budget edit gate uses this derivation, not a stored flag.
- `Event.is_locked` is derived (`true` while a `Report` for the event is `pending_adviser_approval` or `approved`).
- `Event.status = archived` is terminal — every route above under that event rejects mutations at the guard layer regardless of role.
- Void authority is department-wide (current active treasurer), not limited to `Entry.created_by`.
