# Workforce Operations (Tasks, Attendance, Announcements, Requests) — implementation plan

Spec: `docs/superpowers/specs/2026-08-24-workforce-operations-design.md`
(read it in full before starting any task — it documents the audit, the
explicit phase-scope decision, and all 6 architecture decisions).

## Global Constraints

- No new Supabase migration should be needed — every domain's table/RLS/
  permission catalog already exists (permission codes confirmed during
  plan-writing: `tasks.read/create/update/assign/complete/verify/archive`,
  `announcements.read/create/update/publish/archive/acknowledge`,
  `attendance.read/clockin/update/correct`, `leave.read/create/approve/cancel`,
  `swaps.read/request/respond/approve`, `notifications.read`). If a task's
  implementer discovers a genuine gap, flag it explicitly — do not silently
  skip the feature or work around it.
- No new npm dependencies. Reuse `@shiftos/ui` (`PageContainer`,
  `PageHeader`, `ContentSection`, `Panel`, `StatCard`, `QuickAction`,
  `Badge`, `Button`, `FormField`, `Input`, `Select`, `InlineError`,
  `SkeletonRows`, `EmptyState`, `Avatar` — check `packages/ui/src/components/`
  for the full list and exact prop shapes before using any of them).
- Gate every control by `hasPermission(...)` from `useSession()`, never by
  role name — matching every existing dashboard's own established pattern.
  The backend's own RLS/service layer is the real authorization boundary;
  hiding controls client-side is UX only (same principle already documented
  in `apps/web/src/layout/Sidebar.tsx`'s own `NavItem` comment).
- Use `useRpcQuery`/`useRpcMutation` from `apps/web/src/lib/useRpc.ts` for
  every new RPC call — the same hooks every existing page already uses.
  Read that file if its exact API isn't obvious from existing call sites.
- Keep `apps/web`'s build clean (`tsc -p tsconfig.json && vite build`) after
  every task.
- Read the actual current state of any file you're extending (`App.tsx`,
  `Sidebar.tsx`, `EmployeeDashboardPage.tsx`, `TopBar.tsx`) before editing —
  several of these were touched by the Auth/Onboarding phases this session
  and may not match older descriptions.

## Task 1 — Shared domain types

Add client-side type mirrors to `apps/web/src/types/domain.ts` for `Task`,
`AttendanceRecord`, `Announcement`, `LeaveRequest`, `ShiftSwap`,
`Notification` — none exist yet. Follow the exact pattern already
established for `Department` (added during the Onboarding phase) and
`Branch`/`Employee`/`Schedule`/`Shift` (pre-existing) in this same file:
read the actual return shape each RPC produces before writing the type,
don't guess field names. Trace each type from its real source:
- `Task`: `packages/services/src/.../taskService.ts` (or wherever
  `TaskService` lives — find it) and `packages/repositories`' task
  repository/row type, cross-checked against `packages/api/src/operations/task.ts`'s
  RPC signatures (`createTask`, `listTasks`, etc.).
- `AttendanceRecord`: `AttendanceService`/attendance repository, cross-checked
  against `packages/api/src/operations/attendance.ts`.
- `Announcement`: `AnnouncementService`/announcement repository, cross-checked
  against `packages/api/src/operations/announcement.ts`.
- `LeaveRequest`: `LeaveRequestService`/leave repository, cross-checked
  against `packages/api/src/operations/leave.ts`.
- `ShiftSwap`: `ShiftSwapService`/shift-swap repository, cross-checked
  against `packages/api/src/operations/shiftSwap.ts`.
- `Notification`: `NotificationService`/notification repository, cross-checked
  against `packages/api/src/operations/notification.ts`.

This task only touches `domain.ts` — no page, no route, no nav change. Run
the build and confirm clean, then commit.

## Task 2 — Tasks page

Depends on Task 1 (uses the `Task` type). Create
`apps/web/src/pages/tasks/TasksPage.tsx`:
- List tasks for the caller's accessible branch(es) via `list_tasks`
  (no `branchId` for org-wide/Manager scope, matching the org-wide-count
  pattern the Onboarding phase's `FinishStep` already established for
  `list_departments`; a Supervisor's own branch scoping is already correct
  server-side).
- If `hasPermission('tasks.create')`: a "New task" action (title,
  description, due date/time, priority — read the design's `Manager/Tasks`
  and `Supervisor/Tasks` CFG entries in `Local file check/design_handoff_shiftos/ShiftOS
  Dashboards.dc.html`, search for `"Manager/Tasks"` and `"Supervisor/Tasks"`
  inside the `const CFG` block, for the exact field set and copy) calling
  `create_task`.
- If `hasPermission('tasks.assign')`: an assign action on an unassigned task
  calling `assign_task` (needs a supervisor-employee picker — reuse
  whatever employee-listing pattern `EmployeeDirectoryPage.tsx` or
  `EmployeeFormPage.tsx` already uses for picking a person, scoped to
  supervisors only if the RPC/service expects that — check `TaskService`'s
  `assignTask` implementation for what it actually validates).
- If `hasPermission('tasks.complete')`: a "Mark complete" action on tasks
  assigned to the caller's own employee record, calling `complete_task`
  (with optional notes).
- If `hasPermission('tasks.verify')`: a verify/request-rework action on
  completed tasks, calling `verify_task`.
- If `hasPermission('tasks.archive')`: an archive action, calling
  `archive_task`.
- An Employee/Staff caller with none of the above except perhaps
  implicit read access sees a simple read-only list of tasks relevant to
  them (their own assigned tasks) with just the complete action if they
  have `tasks.complete`.
- Status/priority displayed via `Badge` with sensible tone mapping (reuse
  patterns like `ScheduleListPage.tsx`'s or `EmployeeDirectoryPage.tsx`'s
  existing status-badge conventions rather than inventing new tone logic).

Add the route to `apps/web/src/App.tsx`'s `AppShellRoutes` (`/tasks`,
lazy-loaded, same pattern as every other route there) and a nav item to
`apps/web/src/layout/Sidebar.tsx`'s `NAV_ITEMS` (`{ to: '/tasks', label:
'Tasks', requiresPermission: 'tasks.read' }`).

## Task 3 — Attendance page (Manager/Supervisor)

Depends on Task 2 (sequential — both touch `App.tsx`/`Sidebar.tsx`; read
their current state after Task 2 lands, not this plan's paraphrase). Create
`apps/web/src/pages/attendance/AttendancePage.tsx`, gated entirely by
`hasPermission('attendance.read')` (per spec decision 2, this page is for
Manager/Supervisor — a plain Employee without any attendance-management
permission shouldn't see this nav item at all, since their own clock-in/out
lives on the dashboard instead, per Task 6).

- List attendance records for the caller's accessible branch(es) via
  `list_attendance_for_branch_and_range` (needs a date range — default to
  the current week, with simple prev/next navigation; read the design's
  `Manager/Attendance Calendar`/`Supervisor/Attendance` CFG entries for the
  expected shape).
- If `hasPermission('attendance.update')`: a "Mark absent" / "no-show"
  action calling `mark_attendance_absent`.
- If `hasPermission('attendance.correct')`: a correction action (corrected
  status/clock-in/clock-out/reason) calling `record_attendance_correction`,
  with the correction history visible via `list_attendance_corrections`.

Add the route (`/attendance`) and nav item (`requiresPermission:
'attendance.read'`) the same way Task 2 did.

## Task 4 — Announcements page

Depends on Task 3 (sequential, same file-overlap reason). Create
`apps/web/src/pages/announcements/AnnouncementsPage.tsx`:
- List announcements via `list_announcements` (no `branchId` for org-wide
  scope where applicable).
- If `hasPermission('announcements.create')`: a "New announcement" form
  (title, content, type, optional expiry — read the design's
  `Manager/Announcements`/`Supervisor/Announcements` CFG entries for exact
  field set/copy) calling `create_announcement`, then
  `publish_announcement` if `hasPermission('announcements.publish')`
  (or a separate explicit "Publish" action on a draft — check whether the
  design implies immediate publish-on-create or a draft step, and match
  it).
- If `hasPermission('announcements.archive')`: an archive action.
- Every caller with `announcements.read` (including plain Staff, per the
  design's `Staff/Announcements` screen) sees the list with an
  "Acknowledge" action per announcement (using
  `has_acknowledged_announcement` to know current state, `acknowledge_announcement`
  to record it) — this is the one control every role gets regardless of
  other permissions.

Add the route (`/announcements`) and nav item (`requiresPermission:
'announcements.read'`, NOT `orgWideOnly` — Staff needs this too, unlike
Attendance).

## Task 5 — Requests page (shift swaps + leave, combined)

Depends on Task 4 (sequential, same file-overlap reason). Create
`apps/web/src/pages/requests/RequestsPage.tsx` with two sections (or a
simple segmented control) — Shift Swaps and Leave — matching the design's
own `Manager/Requests`/`Supervisor/Requests`/`Staff/My Requests` CFG
entries (each literally describes both together, e.g. "2 swaps and 3 leave
requests").

**Shift swaps:**
- If `hasPermission('swaps.request')`: a "Request a swap" action on one of
  the caller's own upcoming shift assignments, calling `request_shift_swap`
  (optionally targeting a specific coworker, or leaving it open to the
  branch pool — read `ShiftSwapService.requestSwap`'s actual signature to
  confirm both paths are supported before building UI for both).
- Every caller with any swap-related permission sees `list_my_shift_swaps`
  (their own) and, if `hasPermission('swaps.respond')`,
  `list_open_shift_swaps` (open-pool swaps they could claim) with a
  respond action (`respond_to_shift_swap`).
- If `hasPermission('swaps.approve')`: `list_pending_shift_swap_approvals`
  with approve/reject actions (`approve_shift_swap`/`reject_shift_swap`).
- A cancel action (`cancel_shift_swap`) on the requester's own still-pending
  request.

**Leave:**
- If `hasPermission('leave.create')`: a "Request leave" form (type, start/
  end date, reason) calling `create_leave_request`.
- Every caller sees `list_my_leave` (their own requests and status).
- If `hasPermission('leave.approve')`: `list_pending_leave` (scoped by
  branch where relevant) with approve/reject actions
  (`approve_leave_request`/`reject_leave_request` — the latter requires
  `managerNotes`, make that a required field in the reject UI).
- A cancel action (`cancel_leave_request`, requires a reason) on the
  requester's own still-pending request.

Add the route (`/requests`) and nav item (`requiresPermission:
'leave.read'` — check whether a caller with only `swaps.read` but not
`leave.read` is a realistic gap in the seeded permission sets from the
plan-writing audit; if so, gate on whichever single permission code is
guaranteed present for anyone who should see this page at all, or gate on
"either" if the nav item type doesn't support that — extend `NavItem`'s
shape minimally if genuinely needed, don't leave a real gap unaddressed).

## Task 6 — Clock in/out on the Employee dashboard

Independent of Tasks 2-5 (different file) — may run in parallel with them.
Depends on Task 1 (uses the `AttendanceRecord` type, if needed for typing
the mutation response).

Read `apps/web/src/pages/dashboard/EmployeeDashboardPage.tsx`'s current
"Upcoming shifts" section in full. For whichever shift's `shift_date`
equals today (if any), add Clock In / Clock Out controls gated by
`hasPermission('attendance.clockin')`:
- Clock In: calls `clock_in` with that shift's shift-assignment id (find
  how the existing `myShifts` query's `Shift` type relates to a shift
  *assignment* id — the RPC takes `shiftAssignmentId`, not a raw shift id;
  check `AttendanceService.clockIn`'s expected input and whatever query
  already resolves the caller's own assignment for a shift, e.g.
  `list_shifts_for_employee_in_schedule`'s actual return shape, before
  assuming the two ids are interchangeable).
- Once clocked in, the same control becomes Clock Out (`clock_out`),
  reflecting real current-shift attendance state — query
  `list_my_attendance` (or `get_attendance_record` for just today's) to
  determine which state to show on load/refresh, don't just track it as
  ephemeral local state that resets on reload.
- Shifts that aren't today's just show their existing read-only badge, no
  new controls.

## Task 7 — Notifications bell in TopBar

Independent of Tasks 2-6 (different file) — may run in parallel with them.
Depends on Task 1 (uses the `Notification` type).

Read `apps/web/src/layout/TopBar.tsx` in full. Add a bell icon + dropdown
(a simple `lucide-react` `Bell` icon button that toggles a small panel —
check whether `@shiftos/ui` already has a dropdown/popover primitive before
building raw open/close state + an absolutely-positioned panel, matching
whatever pattern this codebase already uses elsewhere for a similar
transient panel, e.g. the mobile nav slide-over in `AppShell.tsx` or
anything in `packages/ui`):
- Unread count badge, from `list_my_notifications({ unreadOnly: true })`'s
  length (or a dedicated count if the service exposes one more cheaply —
  check `NotificationService.listMine`'s return shape).
- Dropdown list via `list_my_notifications` (recent, not just unread),
  each with its own read/unread visual state and a click-to-`mark_notification_read`
  action.
- A "Mark all read" action calling `mark_all_notifications_read`.
- No preference toggles (explicitly out of scope per spec decision 4/6 —
  don't build `get_my_notification_preferences`/`set_my_notification_preference`
  UI in this task).

## Task 8 — Final verification pass

After Tasks 1-7 all land: re-read `App.tsx` and `Sidebar.tsx` end to end to
confirm all 4 new routes/nav items are present, correctly ordered, and
none collide or got silently dropped across the sequential edits. Confirm
`EmployeeDashboardPage.tsx` and `TopBar.tsx`'s changes (Tasks 6/7) didn't
conflict with anything Tasks 2-5 assumed. Grep for any leftover TODO/stub
comment in the new pages that should have been resolved. Run the full
`apps/web` build/typecheck and confirm clean. Write a brief note on
anything found but not fixed (out-of-scope-for-a-quick-fix items are still
worth recording, matching the Onboarding phase's own Task 7 precedent).

## Self-review checklist (before dispatching any task)

- Every permission code referenced above was confirmed to exist in the
  seeded catalog during plan-writing (038/037/039/040/042/035 migrations) —
  re-verify against the live schema only if a task's implementer has doubt,
  don't re-derive from scratch.
- Tasks 2→3→4→5 are sequential (shared `App.tsx`/`Sidebar.tsx` edits);
  Tasks 6 and 7 are independent of that chain and of each other, and may
  run in parallel with it once Task 1 lands.
- No task builds Reports, the Admins tab, the standalone Admin console,
  Settings v2, Import Employees, or notification preferences — see the
  spec's "Out of scope" section.
