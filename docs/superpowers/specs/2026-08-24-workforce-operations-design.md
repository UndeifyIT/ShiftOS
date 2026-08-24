# Workforce Operations (Tasks, Attendance, Announcements, Requests) — design spec

Status: approved-by-default (user explicitly directed "get started on that"
after being shown the audit below; proceeding per standing instruction to
keep moving autonomously, same rigor as the Auth/Onboarding phases).

## Why

An audit (done directly, not from memory) found six backend domains fully
implemented in `packages/api`/`packages/services`/`packages/repositories`
with real RPCs, real Postgres tables, real RLS — and **zero frontend
consumers**: Tasks, Attendance, Announcements, Leave requests, Shift swaps,
Notifications. `apps/web/src/layout/Sidebar.tsx`'s nav has no entry for any
of them. The three dashboards (`ManagerDashboardPage`/`SupervisorDashboardPage`/
`EmployeeDashboardPage`) only surface employees/branches/schedules.

The design handoff (`Local file check/design_handoff_shiftos/ShiftOS
Dashboards.dc.html`) documents a much larger surface than this: per-role
screens for Overview, Schedules, Employees, Attendance, Tasks, Announcements,
Requests, an "Admins" management tab (inviting Admin-role users, distinct
from a wholly separate standalone Admin console — a different design file,
`ShiftOS Admin.dc.html`, a different phase), Reports, and a Settings
revamp — roughly 20+ distinct screens across Manager/Supervisor/Staff.

## Scope decision — phase this, don't attempt all 20+ screens at once

Attempting the full Dashboards design in one pass would be an unreviewable
amount of change. This phase ("Workforce Operations") covers the four
domains that are both fully backend-ready and core to daily operations —
**Tasks, Attendance, Announcements, Requests (shift swaps + leave)** — since
closing those is what actually connects the orphaned backends. Explicitly
deferred to later phases, named so they aren't silently dropped:

- **Reports** (`reporting.ts`'s 3 RPCs: attendance summary, task
  completion, leave usage) — a reporting/analytics UI, naturally a
  follow-on once the underlying data (tasks, attendance, leave) has a real
  UI generating it.
- **Manager's "Admins" tab** (inviting/managing Admin-role users within
  Manager settings) — blocked on the same "no `create_role` RPC yet" gap
  `RoleDashboard.tsx`'s own comment already documents; there is currently
  no Admin role to invite anyone into.
- **The standalone Admin console** (`ShiftOS Admin.dc.html`) — a
  structurally separate application/audience from these three
  operational dashboards, its own future phase.
- **Settings v2 revamp** (Branch Hours / Notifications / Security / Billing
  tabs) — `account/SecurityPage.tsx`/`organization/OrganizationSettingsPage.tsx`
  already exist in a simpler form; a full tabbed revamp is cosmetic
  polish, not a missing backend connection.
- **Import Employees** — a bulk-upload feature, not a missing backend
  domain (single-employee create already works).
- **Notification preferences UI** (`get_my_notification_preferences`/
  `set_my_notification_preference`) — deferred; this phase does add a
  basic notifications list/mark-read surface (see below), since that's
  small and high-value, but per-channel preference toggles are cosmetic
  polish on top of it.

## Architecture decisions

1. **One page per domain, not one page per role.** Matching
   `RoleDashboard.tsx`'s own explicit principle ("real capability signals,
   never a role-name check"), each new page (`TasksPage`, `AttendancePage`,
   `AnnouncementsPage`, `RequestsPage`) renders different controls based on
   `hasPermission(...)` checks, the same pattern every existing dashboard
   already uses — not three separate Manager/Supervisor/Staff components
   per domain. A Manager sees org-wide data with create/assign/verify
   controls; a Supervisor sees their branch(es)' data with the same
   controls scoped by the backend's own branch-access resolution (already
   correct server-side, per every RPC's `context`-scoped service call); an
   Employee sees only what's theirs, read/acknowledge/complete/request
   only.
2. **Clock in/out is not a separate nav item.** The design's own Staff
   screens (`Staff/My Shift`, `Staff/My Schedule`, `Staff/My Requests`,
   `Staff/Announcements`, `Staff/Profile`) have no dedicated Attendance
   entry — clocking in/out is an action on *today's own shift*, not a
   standalone screen. Add Clock In/Clock Out directly to
   `EmployeeDashboardPage.tsx`'s existing "Upcoming shifts" section, on
   whichever shift matches today's date. Manager/Supervisor get a real
   dedicated Attendance page (marking present/absent for their team,
   corrections, history) — that part of the design does have a dedicated
   screen for them.
3. **Requests page combines shift swaps and leave**, matching the design's
   own `Manager/Requests`, `Supervisor/Requests`, `Staff/My Requests`
   screens, which each describe both ("2 swaps and 3 leave requests").
   One page, two sections (or a simple tab/segment control) — not two
   separate nav items.
4. **A minimal notifications surface, not the full preferences UI.** Add a
   simple notification bell + dropdown list (unread count, mark-read, mark-
   all-read) to `apps/web/src/layout/TopBar.tsx`, backed by
   `list_my_notifications`/`mark_notification_read`/
   `mark_all_notifications_read`. This makes the six-domain backend genuinely
   end-to-end (task assignments, announcement posts, leave/swap decisions
   all plausibly generate notifications server-side already — verify this
   during planning) without building the full preferences screen.
5. **New client-side domain type mirrors are needed** in
   `apps/web/src/types/domain.ts` for `Task`, `AttendanceRecord`,
   `Announcement`, `LeaveRequest`, `ShiftSwap`, `Notification` — none exist
   yet (confirmed by grep). Follow the exact pattern the Onboarding phase's
   `Department` mirror already established: read the actual service/
   repository return shape before writing the type, don't guess field
   names.
6. **New nav items**: Tasks, Attendance (Manager/Supervisor only, per
   decision 2), Announcements, Requests — added to
   `apps/web/src/layout/Sidebar.tsx`'s `NAV_ITEMS`, gated by the relevant
   `requiresPermission` the same way every existing item already is (e.g.
   `tasks.read`, `attendance` read-equivalent permission — check the actual
   permission codes seeded in `packages/../migrations` before assuming
   names).

## Out of scope reminders for implementers

- No new migration should be needed — every domain's table/RLS/permission
  catalog already exists. If a task's implementer discovers a genuine gap
  (missing permission code, missing RLS grant), treat it the same way the
  Onboarding phase's migration 046 was handled: flag it explicitly, don't
  silently work around it or silently skip the feature.
- Don't build Reports, the Admins tab, the standalone Admin console,
  Settings v2, Import Employees, or notification preferences — see the
  Scope decision section above for why each is deferred.
