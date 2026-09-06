# Schedule Grid Rebuild — Design Spec

**Status:** Approved for planning
**Created:** 2026-09-06
**Scope:** Phase 1 of 3 (see §1)

## 1. Background & Phasing

The current Schedules page (`ScheduleBuilderPage.tsx`) is a flat `DataTable` of shifts with an add/edit modal. The design handoff (`Local file check/design_handoff_shiftos/ShiftOS Dashboards.dc.html`, "Manager/Schedules" and "Supervisor/Schedules" configs) specifies a completely different UI: a weekly grid of employee rows × 7 day columns, with click-to-assign cells, an AI Schedule Assistant panel, a Schedule Conflicts panel, drag-and-drop, and an hours summary bar. The handoff is marked high-fidelity/final-intent in its own README.

The written specs `docs/scheduling/SCH-010-SCHEDULE-CALENDAR-VIEWS.md` §12 and `SCH-012-SCHEDULE-VALIDATION.md` §15 both list **drag-and-drop** and **AI staffing recommendations** as future enhancements, not MVP — consistent with splitting this into phases rather than building the handoff literally in one shot.

**This spec covers Phase 1 only:**
1. **Phase 1 (this spec):** weekly grid, employee roster, click-to-assign shift modal (templates + custom time + day off + notes), conflict badges + Schedule Conflicts panel, hours summary bar. AI Schedule Assistant panel renders visually (pixel match to the handoff) but every action is inert (toast placeholder) — no real logic behind it yet.
2. **Phase 2 (future):** drag-and-drop of shift cards between cells, the shift-drafts tray.
3. **Phase 3 (future):** real logic behind the AI Schedule Assistant's four actions and its free-text query box.

Phase 2 and 3 are out of scope for the implementation plan that follows this spec.

## 2. Data Model Changes

### 2.1 New table: `schedule_rosters`

Nothing in the current schema tracks "which employees are on this week's schedule" independent of having a shift. The design requires showing an employee's row with 7 empty cells before any shift exists for them (empty state copy: *"Nobody on this schedule yet ... every person gets seven empty days you can fill"*), so roster membership must be modeled explicitly.

```sql
CREATE TABLE public.schedule_rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  schedule_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL,
  added_by uuid NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX uq_schedule_rosters_schedule_employee
  ON public.schedule_rosters (schedule_id, employee_id) WHERE deleted_at IS NULL;
```

Follow the exact conventions of `004_create_shift_templates.sql`: idempotent `DO $$ IF NOT EXISTS $$` blocks, composite FK to `employees (id, organization_id)` for tenancy, indexes on `organization_id`/`schedule_id`, RLS enabled with policies added following the same pattern as `017_apply_enterprise_rls_policies.sql` / `022_add_branch_scoped_rls_policies.sql` (branch access derived via the schedule's `branch_id`), `updated_at` is not needed (rows are only added/soft-deleted, never edited).

Removing someone from the roster (soft-delete) does **not** delete their existing shift assignments for the week — it only stops them from appearing as an empty-row placeholder if they have no shifts. (Edge case, see §6.)

### 2.2 `shift_templates` — already exists, needs permissions + RPCs

The table and `ShiftTemplateRepository` (`packages/repositories/src/scheduling/shiftTemplateRepository.ts`) already exist (migration 004) but have zero RPC operations and zero seeded permissions. New migration adds:

```sql
INSERT INTO public.permissions (code, module, name, description) VALUES
  ('shift_templates.read', 'scheduling', 'View shift templates', 'View reusable shift templates for a branch.'),
  ('shift_templates.create', 'scheduling', 'Create shift template', 'Create a reusable shift template.')
ON CONFLICT (code) DO NOTHING;
```

Grants: both roles get `shift_templates.read`; only Supervisor gets `shift_templates.create` (matches `PER-003-SCHEDULING.md` row "Create Shift Template: Manager Deny, Supervisor Allow"). Extend `ensure_standard_roles()` the same way `043_seed_reporting_permissions.sql` did for `reports.read`.

### 2.3 No new "day off" state

A cell is OFF when the roster employee has no active (`assigned`/`confirmed`) assignment on that date — not a stored flag. The modal's "Day off" button simply removes any existing assignment for that cell. This avoids a second source of truth to keep in sync with actual assignment data.

### 2.4 `shift_assignments.notes`

Already exists on the `ShiftAssignment` type/table. The modal's "Notes (optional)" field reads/writes this column directly — no migration needed.

## 3. Backend Changes

All new methods live in `SchedulingService` (`packages/services/src/scheduling/schedulingService.ts`), following its existing style (permission check → fetch → branch-access check → validate → mutate).

### 3.1 Roster

- `addEmployeeToSchedule(scheduleId, employeeId)` — requires `assignments.create` (reused, not a new permission — adding someone to the roster is a precursor to assigning them shifts, and `PER-003`'s closest matching row, "Assign Employee to Shift", already grants this to Supervisor only, Manager deny). Validates the employee belongs to the schedule's branch. Upserts (un-deletes if previously removed).
- `removeEmployeeFromSchedule(scheduleId, employeeId)` — requires `assignments.delete`. Soft-deletes the roster row only; does not touch existing assignments (§6).
- `listScheduleRoster(scheduleId)` — requires `schedules.read`. Returns roster rows joined to employee display data.

RPCs: `add_employee_to_schedule`, `remove_employee_from_schedule`, `list_schedule_roster`.

### 3.2 Shift templates

- `listShiftTemplates(branchId)` — requires `shift_templates.read`. Thin wrapper over `ShiftTemplateRepository.listActiveByBranch`.
- `createShiftTemplate(branchId, { name, startTime, endTime, crossesMidnight, notes })` — requires `shift_templates.create`.

RPCs: `list_shift_templates`, `create_shift_template`.

### 3.3 Cell assignment (replacing the two-step create-shift-then-assign flow for the grid)

- `assignShiftToEmployeeOnDate(scheduleId, employeeId, date, { templateId? , startTime, endTime, crossesMidnight?, breakMinutes? }, notes?)` — requires `shifts.create` and `assignments.create`. Wraps `createShift` + `assignEmployee` (+ notes patch) in one service call/transaction so the modal's single "Assign Shift" button can't leave a half-created shift with no assignment on a partial failure. If the employee already has an assignment that date, this replaces it (cancels the old shift, creates the new one) rather than stacking two shifts on the same cell — Phase 1 is one shift block per employee per day (§7.1).
- `updateAssignedShiftOnDate(assignmentId, { startTime?, endTime?, breakMinutes?, notes? })` — requires `shifts.update`. Patches the underlying shift and the assignment's notes together.
- `removeAssignedShiftOnDate(assignmentId)` — requires `assignments.delete`. Removes the assignment; if it was the shift's only active assignment, also cancels the shift (`cancelShift`) so it doesn't linger as orphaned data.

RPCs: `assign_shift_to_employee_on_date`, `update_assigned_shift_on_date`, `remove_assigned_shift_on_date`.

### 3.4 Conflict detection

- `getScheduleConflicts(scheduleId)` — requires `schedules.read`. Computed on read from shifts + assignments already available via `listShiftsForSchedule`/`listAssignmentsForShift`-style queries — nothing new is stored, matching SCH-012 §2.3 ("validation does not modify data"). Detects:
  - **Double-booking**: same employee with two overlapping active assignments on the same date.
  - **Long-shift warning**: a single shift block exceeding 10 hours (mirrors the mock copy "nobody breaks the 10-hour rule").
- Returns a flat list of `{ employeeId, date, kind: 'double_booking' | 'long_shift', detail }` for the UI to badge cells and populate the Conflicts panel.
- **Not** wired into `publishSchedule`'s validation — publish today only checks "at least one shift exists"; this spec does not change that blocking behavior. Conflicts are surfaced, not enforced, in Phase 1.

RPC: `get_schedule_conflicts`.

### 3.5 Hours summary

Computed client-side from data the grid already fetches (shifts + assignments for the schedule) — no new RPC. Per employee: sum of `duration` across their active assignments this week, minus breaks; flagged "over 40h" past a fixed 40-hour threshold (matches the mock's "2 people are over 40h" copy). This threshold is a hardcoded constant for Phase 1, not an org setting.

## 4. Frontend Architecture

New directory `apps/web/src/pages/scheduling/grid/`:

- `ScheduleGridPage.tsx` — the "Shifts" tab's new content in `ScheduleBuilderPage.tsx` (tab structure, publish flow, and `CreateScheduleForm` are unchanged).
- `ScheduleGrid.tsx` — renders roster rows × 7 day columns; owns fetching roster/shifts/assignments/conflicts.
- `ShiftCell.tsx` — one employee/day cell: shift block, OFF state, conflict badge (red `!`), click opens `AssignShiftModal`.
- `AssignShiftModal.tsx` — replaces the assignment half of the current `ShiftModal.tsx` for this flow: template picker (fetches `list_shift_templates`), custom start/end/break, notes, "Day off" toggle, "save as template" checkbox (calls `create_shift_template`). `ShiftModal.tsx` itself is untouched — it's still used for direct shift editing outside the grid if that path is kept, or retired if the grid fully supersedes it (implementation-plan decision, not a spec-level one).
- `AddEmployeeModal.tsx` — roster picker: search branch employees, multi-select, calls `add_employee_to_schedule` per selection.
- `ScheduleConflictsPanel.tsx` — right-rail card, lists conflicts from `get_schedule_conflicts`, click jumps to the cell.
- `AiAssistantPanel.tsx` — right-rail card, pixel match to the handoff (title, Beta badge, 4 `QuickAction`-style tiles, query input), every click shows a "Coming soon" toast. No RPC calls.
- `ScheduleSummaryBar.tsx` + `ScheduleSummaryPanel.tsx` — stats footer (`StatCard`-based) and the expandable per-employee hours breakdown.

Reuses existing `@shiftos/ui` primitives (`Panel`, `QuickAction`, `StatCard`, `Modal`, `Badge`, `Button`, `Input`, `Select`) — tokens already match the handoff exactly (`packages/ui/src/tokens.ts` was sourced from this same handoff), so no new design-token work is needed. The grid itself (`ScheduleGrid`/`ShiftCell`) is the one genuinely new visual component; nothing in the existing kit fits a calendar grid.

## 5. Permissions Summary

| Action | Permission | Manager | Supervisor |
|---|---|:-:|:-:|
| View grid | `schedules.read` | Allow | Allow |
| Add/remove roster employee | `assignments.create` / `assignments.delete` | Deny | Allow |
| Assign/edit/remove a cell's shift | `shifts.create`/`update` + `assignments.create`/`delete` | Deny | Allow |
| View shift templates | `shift_templates.read` | Allow | Allow |
| Create shift template | `shift_templates.create` | Deny | Allow |
| View conflicts | `schedules.read` | Allow | Allow |

This matches `PER-003-SCHEDULING.md` exactly: Manager gets read/oversight, Supervisor performs day-to-day editing. (Manager's "Edit Published Schedule" override right, PER-003 row 66, is out of scope here — no phase-1 UI distinguishes editing a published vs. draft schedule beyond what already exists.)

## 6. Error Handling & Edge Cases

- **Removing a roster employee with existing shifts this week**: their assignments are left untouched (not cancelled) — they simply stop showing as an empty placeholder row if they later have zero shifts. If they still have active assignments, their row keeps showing (populated by shifts, not roster) until those are also removed. This mirrors "removing from roster" as a roster-list operation, not a mass-unassign operation, avoiding surprise data loss.
- **Re-assigning an already-filled cell**: `assignShiftToEmployeeOnDate` cancels the previous shift for that cell before creating the new one (Phase 1 is single-block-per-day; see §7.1).
- **Publish with conflicts present**: allowed (matches current `publishSchedule` behavior) — conflicts are advisory only in Phase 1.
- **Archived schedule**: grid renders read-only (reuses the existing `schedule.status === 'archived'` checks already present in `updateSchedule`/`createShift`).
- **Employee removed/deactivated org-wide** while still on a roster: existing `EmployeeRepository.getByIdOrThrow` / `is_active` checks already used elsewhere apply unchanged; no new handling needed.

## 7. Explicit Simplifications (flagged, not blocking)

### 7.1 One shift block per employee per day

The handoff's Assign Shift modal has an "Add another time block (split / double shift)" control implying multiple time blocks per cell per day. The screenshot the user approved against does not show this control. Phase 1 supports exactly one shift block per employee per day. Split shifts are a candidate for a later phase.

### 7.2 "Coverage %" stat

The footer's Coverage stat in the mock has no real backing concept — there is no "required staffing level per shift" model in this schema (that would be a materially larger feature: staffing requirements per template/day). Phase 1 defines Coverage = (roster employees with ≥1 assigned shift this week) ÷ (total roster employees). This will not numerically match the mock's illustrative "100%" — the mock's stats bar is representative/placeholder data, not a literal spec.

## 8. Testing

- **Service tests** (`packages/services`, following existing `schedulingService` test conventions): roster add/remove/list, template list/create, `assignShiftToEmployeeOnDate` (including the re-assign/cancel-old-shift path), `removeAssignedShiftOnDate` (including the cancel-orphaned-shift path), `getScheduleConflicts` (double-booking and long-shift detection, including true negatives).
- **Component tests** (`apps/web`): grid renders roster rows with correct empty/filled/OFF cells; clicking a cell opens the modal pre-filled correctly for edit vs. create; conflict badge appears/disappears correctly; AI panel buttons show the placeholder toast and make no network calls.
- **Permission tests**: Manager cannot add/remove roster or assign shifts (403/permission-denied), can view everything read-only.
