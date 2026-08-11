# ShiftOS Scheduling Domain Workflow (Implementation)

**Document ID:** API-012

**Document Title:** Scheduling Domain Workflow (Implementation)

**Version:** 1.0.0

**Status:** Approved

**Classification:** Backend

**Owner:** ShiftOS Product Team

**Created:** 2026-08-09

---

# 1. Purpose

Milestone 5 built the scheduling domain service (`SchedulingService`, `packages/services/src/scheduling/`) on top of the Milestone 3 scheduling repositories (`ScheduleRepository`, `ScheduleVersionRepository`, `ShiftRepository`, `ShiftAssignmentRepository`) and the Milestone 4 `ApplicationContext`/API layer (API-013). This document describes **what is actually implemented and enforced today**, against the real database schema — not the full product vision in SCH-001 through SCH-012, which this document explicitly cross-references and reconciles where the two differ (§3).

# 2. Workflow: Schedule → Schedule Version → Shifts → Shift Assignments

```
createSchedule(branchId, name, startDate, endDate)
        v
   Schedule (status: draft)
        v
createShift(scheduleId, ...) [repeated per shift]
        v
   Shift (status: draft)  x N
        v
assignEmployee(shiftId, employeeId) [repeated per assignment]
        v
   ShiftAssignment (status: assigned)  x N
        v
publishSchedule(scheduleId)
        v
   [atomic transaction: publishScheduleWithVersion(), API-011 §3.3]
   Schedule.status -> published
   ScheduleVersion recorded (version = previous max + 1, or 1)
        v
   Republishing later (after further edits) records version 2, 3, ...
   — publish history accumulates, never overwrites (§4.4)
```

# 3. Reconciling the Implementation Against SCH-002/SCH-007 (Known, Documented Gap)

**SCH-002 (Approved)** specifies a 7-state schedule lifecycle: `Draft → Ready → Published → Active → Completed → Archived`, plus `Cancelled`. **SCH-007 §10** likewise describes publication as valid "only if it is in the Draft or Ready state."

The live database's `schedules_status_check` constraint (verified live against project `etodmfsmvhewihboxcrp`, 2026-08-09) only allows:

```sql
CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]))
```

Three states, not seven. `SchedulingService` implements exactly this 3-state subset (`draft → published`, `draft|published → archived`) and does not invent unenforced application-level-only states (`Ready`, `Active`, `Completed`, `Cancelled`) that the database cannot actually reject or persist. Inventing them at the service layer would create a lifecycle that looks enforced in TypeScript but isn't backed by any constraint — exactly the kind of "fake completion evidence" this project's standards prohibit.

This is flagged here as the authoritative implementation record, not silently worked around. If the full 7-state lifecycle is required going forward, it needs a schema migration (extending or replacing `schedules_status_check`, plus equivalent work on `shifts` if per-shift state should track the schedule's) design-reviewed against SCH-002 before any service-layer change — out of scope for this milestone, which was explicitly bounded to "use the existing schema as source of truth; do not redesign these tables unless an actual defect is found."

`shifts.status` (a real Postgres enum, `shift_status_enum`, verified live) is richer than `schedules.status`: `draft, published, scheduled, active, completed, cancelled, archived`. `SchedulingService` currently drives shifts through `draft → published` (via publish, implicitly through the schedule), `cancelled` (`cancelShift`), and `archived` (`archiveShift`); the `scheduled`/`active`/`completed` values exist in the schema but have no service-layer transition into them yet — a `💡 Future Improvement`, not a blocker, since nothing currently writes an invalid value into them.

# 4. Business Rules Enforced

## 4.1 Schedule Creation

- `branches.create`... — actually `schedules.create` permission required; caller must have branch access to `branchId` (`ApplicationContext.requireBranchAccess`).
- `startDate <= endDate` (`assertValidDateRange`).
- Exactly one non-deleted schedule may exist for a given `(branch_id, start_date, end_date)` — enforced at the database level by the unique partial index `uq_schedules_branch_active_dates` (verified live: `CREATE UNIQUE INDEX ... ON public.schedules USING btree (branch_id, start_date, end_date) WHERE (deleted_at IS NULL)`). `ScheduleRepository.findExact()` pre-checks this so callers get a clean `ValidationError` ("A schedule already exists for this branch and period") instead of a raw unique-constraint violation surfacing from the database.

## 4.2 Shifts Belong To A Schedule By Inference, Not A Foreign Key

**`shifts` has no `schedule_id` column** (verified live). A shift "belongs to" a schedule by `branch_id` match plus `shift_date` falling within `[schedule.start_date, schedule.end_date]`. This inference is reliable specifically because of `uq_schedules_branch_active_dates` (§4.1): at most one non-deleted schedule can cover a given branch+date-range at a time, so the (branch, date-range) pair uniquely identifies a schedule, making the inference sound rather than a workaround for a bug. `createShift` rejects a `shiftDate` outside the parent schedule's date range for the same reason — a shift dated outside the range would be ambiguous (or silently belong to a different schedule).

## 4.3 State-Transition Rejection

- Editing (`updateSchedule`), adding shifts (`createShift`), and publishing (`publishSchedule`) all reject when `schedule.status === 'archived'`.
- Editing a shift (`updateShift`) rejects when `shift.status` is `cancelled`, `completed`, or `archived`.
- `archiveSchedule`/`archiveShift` set `status = 'archived'` via `patch()` — **not** the generic repository `archive()` (soft-delete via `deleted_at`). This was a real defect caught by the verification suite (§6): the repository-level `archive()` method is a soft-delete, which would have made an "archived" schedule/shift permanently unfetchable (`NotFoundError` on the next lookup), silently making every one of the status-based checks above dead code, and would have hidden published schedules from listings entirely — the opposite of "preserve history." Fixed by having `SchedulingService` archive via `status` update instead; both `schedules.status` and `shifts.status` (`shift_status_enum`) have `'archived'` as a valid, live enum/constraint value, confirmed against the actual database. `EmployeeService.archiveEmployee`/`BranchService.archiveBranch` were checked and do **not** have this issue — neither `employees.employment_status` nor `branches` has an `'archived'` status concept, so soft-delete is the correct and only intended behavior there.

## 4.4 Publishing

`publishSchedule`:

1. `schedules.publish` permission + branch access.
2. Rejects an already-archived schedule (§4.3).
3. Rejects publishing a schedule with zero shifts (`ValidationError`, "at least one shift is required before publishing" — SCH-007 §4 "at least one shift exists").
4. Delegates to `publishScheduleWithVersion()` (API-011 §3.3, unmodified from Milestone 3) — a single atomic transaction that updates `schedules.status` to `published` **and** inserts the next `schedule_versions` row (`version = previous max + 1`, or `1` if none exist) together. Reusing this transaction, rather than duplicating its logic in the service, is what guarantees the two writes commit or roll back as one unit; verified directly (§6) by forcing the version-insert to fail and confirming the schedule's status reverted to `draft`, not left `published` with no matching version.
5. Republishing (calling `publishSchedule` again on an already-published schedule) is allowed and simply records the next version number — this is how SCH-007 §7 "Republishing" is implemented: **never destructively overwrites** a previous published version; every publish is an additional `schedule_versions` row, and prior versions remain queryable via `listScheduleVersions`.
6. "Only one published schedule per branch and period" (SCH-007 §2.3) is already guaranteed by `uq_schedules_branch_active_dates` (§4.1), which is strictly stronger than the requirement (it forbids two non-deleted schedules for the same branch+range at all, published or not) — no additional application-level check was needed or added.

## 4.5 Shift Assignments

- `assignEmployee(shiftId, employeeId)` requires `assignments.create`, branch access on the shift's branch, and validates the employee via `EmployeeRepository.getByIdOrThrow(context.organizationId, employeeId)` — since that lookup is strictly scoped to the caller's own organization, an `employeeId` belonging to a different organization throws `NotFoundError` rather than ever being assignable. This is the cross-tenant assignment rejection, verified directly (§6), not an incidental side effect.
- Duplicate assignment (the same employee assigned twice to the same shift) is explicitly rejected (`ValidationError`) by checking existing assignments for the shift before inserting.
- `updateAssignmentStatus` validates the target status against the real `AssignmentStatus` enum (`assigned | confirmed | declined | completed | cancelled`, matching the live `assignment_status_enum`) via `assertOneOf`, and stamps the matching timestamp column (`confirmed_at`/`declined_at`/`cancelled_at`) when applicable.

# 5. Permissions

Seeded via `supabase/migrations/028_seed_domain_permission_catalog.sql` and `029_add_schedules_archive_permission.sql`, verified live (25 total rows in `permissions`, 12 scheduling-domain codes): `schedules.create/read/update/archive/publish`, `shifts.create/read/update/archive`, `assignments.create/update/delete`. All codes follow the pre-existing `chk_permissions_code_format` constraint (`^[a-z0-9]+(\.[a-z0-9]+)+$` — lowercase, dot-separated, no underscores anywhere). `shift_assignments.*` was rejected by this constraint during seeding (underscore inside a segment) and corrected to `assignments.*` (module = scheduling domain, entity = "assignments", not the literal table name) before re-applying.

# 6. Verification Performed

20/20 scheduling-service tests passed, run against real compiled `SchedulingService` code and an in-memory fake `DatabaseClient` that interprets the actual SQL the repositories generate:

- Schedule creation (success, defaults to `draft`), duplicate branch+period rejection, retrieval, update.
- Invalid state transitions: editing an archived schedule, adding a shift to an archived schedule, publishing an archived schedule — all rejected.
- Shift creation (success, duration computed), `shiftDate` outside schedule period rejected, shift listing via the branch+date-range inference (§4.2), editing a cancelled shift rejected.
- Assignment: valid same-organization employee succeeds; duplicate assignment to the same shift rejected; employee belonging to a different organization rejected (cross-tenant); invalid status value rejected; valid status transition stamps the correct timestamp.
- Branch isolation: a branch-scoped role cannot read a schedule outside its granted branches.
- Publishing: schedule with no shifts rejected; successful publish sets `published` and records version 1; republish records version 2; **transaction rollback** — recording the version was made to fail mid-transaction, and the schedule's status was confirmed to have reverted to `draft` (not left `published`), with zero `schedule_versions` rows committed.

The archive-status defect (§4.3) was found and fixed as a direct result of this suite (the "invalid state transition" tests initially failed with `NotFoundError` instead of the expected `ValidationError`, revealing that an archived row could never be fetched again).

# 7. Live Schema Verification (2026-08-09, project `etodmfsmvhewihboxcrp`, read-only)

| Fact assumed by the code | Verified live |
|---|---|
| `schedules_status_check` allows only `draft`/`published`/`archived` | Confirmed — CHECK definition matches exactly |
| `shifts` has no `schedule_id` column | Confirmed — full column list has no such column |
| `uq_schedules_branch_active_dates` unique partial index on `(branch_id, start_date, end_date) WHERE deleted_at IS NULL` | Confirmed — index definition matches exactly |
| `shift_status_enum` includes `'archived'` | Confirmed — full enum: `draft, published, scheduled, active, completed, cancelled, archived` |
| `assignment_status_enum` matches `AssignmentStatus` (`assigned, confirmed, declined, completed, cancelled`) | Confirmed — exact match, same order |
| `shift_assignments` has no `branch_id` column | Confirmed |
| Scheduling permission catalog (12 codes) and total `permissions` row count (25) | Confirmed |
| `organization_member_branch_access` / `roles.grants_org_wide_branch_access` shape (Milestone 3 assumptions, re-checked here since Milestone 5 depends on them) | Confirmed |

No live data-modifying test was required for the scheduling domain beyond what Milestone 3 already verified transactionally (BEGIN/ROLLBACK) for the underlying tables; all Milestone 5 business-logic verification was performed against the in-memory fake client (§6), which is sufficient because it exercises the real, compiled service/repository code — only the SQL execution itself is substituted, not the logic being tested.

# 8. Related Specifications

- SCH-001 Schedule Definition, SCH-002 Schedule Lifecycle (§3 reconciliation above), SCH-003 Schedule States, SCH-005 Schedule Creation, SCH-006 Schedule Editing, SCH-007 Schedule Publishing, SCH-008 Schedule Versioning, SCH-012 Schedule Validation.
- API-011 Domain Repository & Authorization Resolution Architecture (repository layer, `publishScheduleWithVersion()`).
- API-013 Application Service Layer & API Boundary Architecture (`ApplicationContext`, RPC operations exposing this service).
