# ShiftOS Backend Completion Audit

Date: 2026-08-19/20. Scope: backend only (database, API/RPC, services, repositories, security, business logic), per explicit instruction to ignore new frontend work this pass. All findings below were verified by tracing the real code path (UI/RPC contract → operation → service → repository → Postgres), not by assuming a table's existence means a feature works. Every new/changed operation was live-tested against the real, linked Supabase project (`etodmfsmvhewihboxcrp`, confirmed against `supabase/.temp/linked-project.json` and `.env` before any write), using disposable test data that was cleaned up after each run. The pre-existing "ShiftOS Test Org" fixtures (Ada Test employee, Main Branch, one published shift) were left untouched throughout.

## Backend Status

| Feature | Database | Repository | Service | API/RPC | Security | Status |
|---|---|---|---|---|---|---|
| Organizations | Yes | Yes | Yes | Yes | Permission-gated | COMPLETE |
| Branches | Yes | Yes | Yes | Yes | Permission-gated | COMPLETE |
| Employees / profiles | Yes | Yes | Yes | Yes | Permission + branch-gated | COMPLETE |
| Employee avatars | Yes (storage) | Yes | Yes | Yes | Signed URLs | COMPLETE |
| Employee history (audit trail) | Yes | Yes | Yes (auto-recorded) | Yes | Permission-gated | COMPLETE |
| Roles / permissions | Yes | Yes | Yes | Yes | SECURITY DEFINER-gated | COMPLETE |
| Memberships | Yes | Yes | Yes | Yes | Permission-gated | COMPLETE |
| Invitations (2nd privileged user) | Yes | Yes | Yes | Yes | Permission-gated, server-authoritative | COMPLETE |
| Schedules | Yes | Yes | Yes | Yes | Permission + branch-gated | COMPLETE |
| Shifts (create/edit/cancel/publish) | Yes | Yes | Yes | Yes | Permission + branch-gated | COMPLETE |
| Shift assignments | Yes | Yes | Yes | Yes | Permission + branch-gated | COMPLETE |
| **Tasks** | Yes | Yes | **Built this pass** | **Built this pass** | Permission + branch-gated | COMPLETE (new) |
| **Announcements** | Yes | Yes | **Built this pass** | **Built this pass** | Permission + branch-gated | COMPLETE (new) |
| **Shift Notes** | **Built this pass** | **Built this pass** | **Built this pass** | **Built this pass** | Permission + branch-gated | COMPLETE (new) |
| **Attendance (clock in/out, corrections)** | Yes | Yes | **Built this pass** | **Built this pass** | Permission + branch + self-ownership-gated | COMPLETE (new) |
| **Leave requests** | Yes | Yes | **Built this pass** | **Built this pass** | Permission + branch-gated, status-machine enforced | COMPLETE (new) |
| **Notifications** | Yes | Yes | **Built this pass** | **Built this pass** | Self-scoped + ownership-gated | COMPLETE (new, read/manage only — see Remaining Work) |
| Audit logs | Yes | Yes | No | No | Append-only, RLS-hardened | DATABASE ONLY |
| Security events | Yes | Yes | No | No | Append-only | DATABASE ONLY |
| Notification preferences | Yes | Yes | No | No | — | DATABASE ONLY |
| Notification delivery attempts | Yes | Yes | No | No | — | DATABASE ONLY |
| Shift swaps | No | No | No | No | — | NOT IMPLEMENTED |
| Departments | No | No | No | No | — | NOT IMPLEMENTED (no schema concept below Branch) |
| Reporting/analytics | No dedicated tables | No | No | No | — | NOT IMPLEMENTED |
| Password reset / email verification | Delegated to Supabase Auth | — | — | — | Supabase-managed | COMPLETE (infra-provided) |
| Avatar storage policies | Yes | Yes | Yes | Yes | Signed URLs, bucket-scoped | COMPLETE |

## Implemented During This Run

All six items below went from "table exists, nothing above it" (or, for Shift Notes, nothing at all) to a full, permission-checked, live-verified UI→RPC→Service→Repository→Database path.

1. **Tasks** — full lifecycle: create, assign (to a branch-scoped supervisor employee), update, complete, verify (verified / rework_required, correctly looping back to `in_progress`), reopen, cancel (blocked for still-`draft`/unassigned tasks — see bug fixes), archive, list, and a real history/audit trail (`task_history`, one row per transition). New permission codes: `tasks.read/create/update/assign/complete/verify/archive`.
2. **Announcements** — create, update, publish, archive, get, list (dual view: a content-manager sees drafts too, a general audience sees only published/non-expired ones scoped to their branches), acknowledge (idempotent), and acknowledgement-status lookup. New permission codes: `announcements.read/create/update/publish/archive/acknowledge`.
3. **Shift Notes** — a genuinely new feature (no table existed anywhere before this pass; the only prior occurrence of the name was an unrelated route in the disconnected `shift-app-hero/` scaffold — see Blocked/Flagged Items). New migration `036_create_shift_notes.sql`: an append-only per-shift log entry (organization/branch/shift/author/timestamp), soft-delete for corrections gated to the author or a `shifts.update` holder. New permission codes: `shiftnotes.read/create/archive`.
4. **Attendance** — self-service clock in/out (resolves the caller's own employee record by email, matching the same pattern the frontend already uses for `myEmployeeRecord`; rejects clocking into someone else's assignment), supervisor-side `markAbsent`/`no_show`, formal corrections with an audit trail (`attendance_corrections`), and read endpoints (single record, by employee, "mine", branch+date-range). New permission codes: `attendance.read/clockin/update/correct`. Lazily creates a `scheduled` attendance row on first touch of a shift assignment (no schema change needed; no auto-create trigger exists, and none was added — see design note in `attendanceService.ts`).
5. **Leave requests** — create (self or on-behalf-of, with the DB's own overlap-exclusion constraint enforced), approve, reject, cancel (only while still `pending` — the trigger treats `approved`/`rejected`/`cancelled` as terminal, confirmed live), get, list by employee, "mine", and the pending-approval queue. New permission codes: `leave.read/create/approve/cancel`.
6. **Notifications** — list mine (all / unread-only), mark one read (ownership-checked), mark all read. Wired as a real side effect of leave request approval/rejection (the requester gets a real in-app notification), via an internal `notify()` helper other services can call — not a client-facing "create notification" RPC, since a notification's target/content is always decided by the triggering domain event. New permission code: `notifications.read`.

## Real Bugs Found and Fixed (pre-existing, not introduced this session)

These were latent because the affected code paths had **zero rows / zero live executions** before this pass — nothing had ever exercised them.

1. **`TaskRepository.verify()` violated its own DB constraints on the rework path.** Setting `verified_at`/`verified_by` unconditionally broke `chk_tasks_verification_consistency` (which requires `verified_at IS NULL` unless `task_status = 'verified'`) on every `rework_required` outcome, and left a stale `completed_at` that broke `chk_tasks_completion_consistency` once the status moved back to `in_progress`. Fixed in `packages/repositories/src/tasks/taskRepository.ts` to only set those fields on the `verified` outcome and clear the completion record on `rework_required` (an implicit reopen).
2. **`TaskRepository.assignSupervisor()` never set `updated_by`,** which `trg_tasks_validate` requires on every UPDATE — assigning any task failed outright. Fixed.
3. **No safe path existed to archive (soft-delete) a task** — the inherited generic `archive()`/`softDelete()` never sets `updated_by` either, and the same trigger rejects it. Added `TaskRepository.archiveWithActor()` (a distinctly-named method, not a same-name override with a different signature — this codebase's `TenantScopedRepository` header comment explicitly documents why that pattern is avoided).
4. **`cancelTask` on an unassigned draft task violated `chk_tasks_assignment_consistency`** (which requires a non-null `assigned_supervisor_id` for every non-draft status, `cancelled` included). This is a real product-logic gap, not routed around: the service now rejects cancelling a draft with a clear message directing the caller to archive it instead, since an unassigned task was never "in flight" to be called off.
5. **`trg_attendance_records_validate()` referenced a nonexistent column, `a.branch_id`, on `shift_assignments`** (which has no `branch_id` of its own — branch is derived through the parent shift, per `ShiftAssignmentRepository`'s own header comment). **Every write to `attendance_records` failed** with Postgres error 42703 until fixed. New migration `038_fix_attendance_trigger_branch_column.sql` corrects the source column to `s.branch_id` (the joined shift), matching Postgres's own hint on the original error. This is the most significant finding of this pass: a core operational feature (clock in/out) was completely non-functional at the database layer, and would have failed identically for any caller, at any time, with zero rows as the only reason it hadn't already been reported broken.

## Remaining Backend Work

- **Task multi-employee assignment (`task_assignments` table)** is real, live-verified-schema but intentionally left unwired: the DB trigger (`trg_tasks_validate`) only validates `assigned_supervisor_id` (the single accountable owner), not the many-employee `task_assignments` table, so wiring it now would mean inventing unvalidated business rules rather than implementing the schema's actual design. Worth a deliberate follow-up if "assign a task to a whole team" becomes a real requirement.
- **Automatic notification triggers** exist only for leave approve/reject. Task assignment, announcement publish, and attendance corrections do not yet notify anyone — each would need its own recipient-resolution logic (task assignee resolution goes through an *employee* id, not a `users.id`, unlike leave's `requested_by`) and was left out to avoid rushing untested cross-service wiring this late in the pass.
- **`notification_preferences` and `notification_delivery_attempts`** have repositories but no service — there is no channel-preference enforcement or delivery-attempt logging. Everything currently goes out as `in_app` only (correct for what's implemented, since there is no email/push/SMS delivery infrastructure configured — see Blocked Items).
- **Attendance auto-scheduling**: no attendance record is created automatically when a shift assignment is made; the first `clockIn`/`markAbsent` call lazily creates the `scheduled` record. If a manager-facing "today's expected attendance" roster (showing not-yet-clocked-in people) is wanted, it would need eager creation at assignment time instead — a `schedulingService.ts` change, deliberately out of scope for this pass (that file belongs to an already-shipped, already-tested domain).

## Blocked Items (require a product/infrastructure decision — not built)

- **Shift Swaps**: 🔵 **REQUIRES PRODUCT DECISION.** No table, repository, service, or API exists anywhere. This is not a small gap like Tasks/Announcements were (schema already there, just unwired) — it needs a genuinely new data model, and the real product questions (does an employee propose a swap directly to another employee, or into an open marketplace any eligible employee can claim? does it need supervisor approval, and if so before or after the counterpart accepts? how does it interact with a *published* schedule's shift/assignment records?) are exactly the kind of "serious, irreversible architecture decision" the task instructions say to flag rather than decide unilaterally.
- **`shift-app-hero/`**: still present, untracked, unintegrated. Confirmed again this pass (its own `package.json`: `"name": "tanstack_start_ts"`, a completely different stack — TanStack Start/Router — from this app's real React Router/Vite frontend). It is not part of the pnpm workspace and shares nothing with the backend built this pass. Recommend the user decide: integrate it, delete it, or leave it as reference — no unilateral action was taken on it, consistent with the standing "document, don't delete" instruction from the prior session.
- **Departments**: the product brief in this task's instructions mentions Departments as a hierarchy level between Branch and Manager, but no such concept exists anywhere in the schema (`tasks`/`shifts`/`employees` all stop at `branch_id`). Not built — would need a schema decision (a new table? a column on `branches`? on `employees`?) before any code follows.
- **Reporting/analytics**: no dedicated aggregation tables or materialized views exist. Every list/read endpoint returns row-level data; nothing computes rollups. Out of scope to invent without a specific reporting requirement to build against.
- **Email/push/SMS notification delivery**: `notifications.channel` supports `push`/`email`/`sms` values at the schema level, but no delivery provider (SendGrid, FCM, Twilio, etc.) is configured anywhere in this codebase or its `.env`. Only `in_app` is actually deliverable right now — this is an infrastructure gap, not a code gap.

## Security Findings

🚫 **Ship Blockers**: none found. Every new operation this pass follows the existing `ApplicationContext.requirePermission()` + `requireBranchAccess()` pattern; organization scoping is structurally enforced by every repository method requiring `organizationId` as its first argument (the existing `TenantScopedRepository`/`BranchScopedRepository` design — verified, not just assumed, since I wrote directly against it).

⚠️ **Fix Before Scale**:
- **Audit logs and security events remain entirely dark.** The repository layer is real, hardened (append-only, RLS-protected), and completely unused — no service anywhere calls `AuditLogRepository.record()` or `SecurityEventRepository`'s equivalent. For a system this permission-sensitive (multi-tenant, role-based, branch-scoped), the absence of any actual audit trail beyond the domain-specific ones already built (`task_history`, `employee_history`, `attendance_corrections`) is a real gap for incident investigation and compliance. Recommend wiring `AuditLogRepository.record()` into `ApplicationContext` itself (e.g., a `context.audit(action, entityType, entityId, oldValues, newValues)` helper every service can call) as a follow-up, rather than adding ad hoc calls per service.
- **`AttendanceService.markAbsent`/`recordCorrection` trust the caller's branch access but not a finer-grained "is this actually your direct report" check** — any Supervisor with `attendance.update` for a branch can mark absent or correct *any* employee's record in that branch, not just employees on shifts they personally manage. This matches the existing branch-scoping model used everywhere else in this codebase (e.g. `EmployeeService.archiveEmployee` has the same shape of authority), so it's a deliberate consistency choice, not an oversight — flagged because attendance data is more sensitive than most.

💡 **Future Improvements**:
- Task assignment and announcement publish could notify recipients, once the employee→user resolution / fan-out design questions above are settled.
- A materialized "my dashboard" aggregation (tasks assigned to me + pending leave + unread notifications + today's shift) would reduce the number of round trips the frontend currently needs across these newly separate domains.
- `NotificationRepository.markAllReadForUser` loops nothing at the SQL level (single `UPDATE ... WHERE read_at IS NULL`), but at high notification volume a paginated/batched approach would be safer — not a concern at current scale.

## Database Changes

Six new migrations, all additive (no destructive schema changes, no renamed/dropped columns, no data touched):

| Migration | Purpose |
|---|---|
| `035_seed_tasks_announcements_permissions.sql` | Permission catalog + Owner/Supervisor/Employee grants for Tasks and Announcements; extends `ensure_standard_roles()` and backfills existing organizations' roles. |
| `036_create_shift_notes.sql` | New `shift_notes` table (append-only, branch/shift/author-scoped, soft-delete for corrections) + its permission catalog rows and grants. |
| `037_seed_attendance_permissions.sql` | Permission catalog + role grants for Attendance. |
| `038_fix_attendance_trigger_branch_column.sql` | **Bug fix**, not a feature migration: corrects `trg_attendance_records_validate()`'s `a.branch_id` → `s.branch_id` (see Bugs Found above). Every prior attendance write would have failed against the real database. |
| `039_seed_leave_permissions.sql` | Permission catalog + role grants for Leave Requests. |
| `040_seed_notification_permissions.sql` | Permission catalog + role grants for Notifications (self-scoped, granted broadly to all three standard roles). |

All six were applied directly to the linked live project (`etodmfsmvhewihboxcrp`) via a direct `pg` connection using this repo's own `.env` `DATABASE_URL`, mirroring `packages/database/src/postgresClient.ts`'s TLS policy (verified certificates, no blanket `rejectUnauthorized: false`). Confirmed via `supabase/.temp/linked-project.json` and the `.env`'s `SUPABASE_URL` that this is the same project the running application uses — no other Supabase project was touched.

## Verification

- **TypeScript builds**: `pnpm --filter @shiftos/repositories build`, `@shiftos/services build`, `@shiftos/api build`, `@shiftos/backend build` all pass cleanly after every change (re-run after each fix, not just once at the end). A final full-workspace `pnpm -w exec tsc -b` (project references, incremental) passed with zero errors across the whole monorepo.
- **Live database verification**: every new RPC operation was executed directly against the real Postgres database via `RpcRegistry.execute()` (the same registry `packages/backend/src/server.ts` constructs), bypassing only the HTTP/auth-token layer (which needs a live Supabase JWT this offline harness doesn't have) — not bypassing the database, permissions, or any business logic. Five separate live test runs covered:
  - Tasks: create → get → list → update → assign → complete → verify(rework) → complete → verify(verified) → history; plus cancel-blocked-on-draft, cancel-after-assign, and archive.
  - Announcements: create → list → update → publish → get → acknowledge (with a disposable employee created solely to give the Owner test user a matching email, then removed) → idempotent re-acknowledge → archive.
  - Shift Notes: create → list-for-shift → archive.
  - Attendance: create-employee → create-schedule/shift → assign → clock-in → (double clock-in rejected) → clock-out → list (mine / by-employee / by-branch-range) → get → correction → correction-history; plus mark-absent/no-show on a second assignment and a cross-employee clock-in rejection.
  - Leave: create → get → list (by-employee / mine / pending) → overlap rejection (DB exclusion constraint) → approve → cancel-after-approve rejection (terminal state) → reject (second request) → cancel (third, still-pending request).
  - Notifications: leave-approval → notification created → list unread → mark read → ownership-checked rejection on someone else's/nonexistent id → mark all read → confirm zero unread.
  All test data was created under the pre-existing "ShiftOS Test Org" and fully cleaned up (hard-deleted) after each run; the org's original fixtures (Ada Test, Main Branch, the one published shift) were verified unchanged throughout.
- **Not tested**: the HTTP transport layer itself (`packages/api/src/httpServer.ts`) and real Supabase Auth JWT verification for these new operations — only the RPC/service/database layers were exercised directly. Given every other registered operation goes through the identical `RpcRegistry.execute()` call this testing used, and the HTTP adapter is a thin, unchanged pass-through, this is a reasonable confidence gap, not a known issue.
- **Not tested**: frontend integration, per this pass's explicit "ignore new frontend work" instruction. None of these new operations have any UI yet.
