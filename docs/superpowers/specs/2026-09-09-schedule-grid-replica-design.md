# Schedule Grid Replica — Design Spec

**Status:** Approved for planning
**Created:** 2026-09-09
**Supersedes:** Phase 2/3 deferrals in `2026-09-06-schedule-grid-rebuild-design.md` §1, §7.1

## 1. Background

`2026-09-06-schedule-grid-rebuild-design.md` shipped Phase 1 of the grid rebuild (PR #8): a weekly grid, click-to-assign modal, conflict badges, an inert AI panel, and a stats bar. It explicitly deferred drag-and-drop, the shift-drafts tray, and split shifts to "future phases," citing `SCH-010`/`SCH-012`'s own "not MVP" framing for those features.

User feedback after using the live Phase 1 build: the deferrals produced a page that doesn't match the design handoff (`Local file check/design_handoff_shiftos/ShiftOS Dashboards.dc.html`, `Manager/Schedules` / `Supervisor/Schedules` configs) closely enough, and explicitly asked to build the deferred pieces now, using the handoff as the literal source of truth for markup, styling, and interaction — not the written specs' MVP trims. This spec covers that work. It does not touch AI-panel real logic or file-import parsing (see §7 — those stay out of scope by the user's own choice, not a re-deferral).

The handoff itself is not runnable code — it's a `.dc.html` design-prototype format (custom `sc-if`/`sc-for`/`{{ }}` template syntax bound to a mock-data JS harness, `support.js`) with no real data binding, auth, or permissions. This spec's job is to make the real React page match the handoff's actual markup, layout, and interaction model, wired to real backend data — not to embed the prototype file itself.

## 2. Scope

**In scope:**
1. Split shifts: multiple shift assignments per employee per day, replacing Phase 1's one-block-per-day rule.
2. Drag-and-drop, both directions: tray → cell (assign a draft), cell → cell (reassign), cell → tray (unassign back to draft).
3. The shift-drafts tray itself (frontend-only state, not persisted).
4. Per-shift-card "⋮" menu: Edit shift, Duplicate, Move to drafts, Mark day off (hidden once already off), Delete.
5. Week navigator (‹ range ›) paging between existing schedules for the same branch, by date.
6. Stats bar's 6th tile, Total Hours.
7. "Copy last week" made real (duplicates the adjacent-in-time schedule's shifts into a new draft schedule).

**Out of scope (unchanged from Phase 1, or newly declined by the user — see §7):**
- Real AI Schedule Assistant logic (the 4 quick actions + free-text query stay inert toasts).
- The separate toolbar "AI Assist" button — renders, inert toast.
- "Import Schedule" and "Use a template" on the empty state — render, inert toast.
- Any change to permissions beyond what already gates schedule editing (`PER-003-SCHEDULING.md`, unchanged from Phase 1 spec §5).
- Mobile drag-and-drop (the handoff itself shows a "View only on mobile" lock for the schedule kind — already true today, unchanged).

## 3. Data Model & Backend Changes

No new tables. All changes are in `SchedulingService` (`packages/services/src/scheduling/schedulingService.ts`) and its RPC operations (`packages/api/src/operations/scheduling.ts`).

### 3.1 Split shifts — new "add" path alongside the existing "replace" path

Today, `assignShiftToEmployeeOnDate` unconditionally calls the private `replaceActiveAssignmentOnDate` before inserting the new shift+assignment — Phase 1's single-block-per-day rule. This spec adds a sibling method that skips the replace step:

- `addShiftToEmployeeOnDate(scheduleId, employeeId, date, input)` — same permission checks, same validation, same transactional shift+assignment insert as `assignShiftToEmployeeOnDate`, but does **not** call `replaceActiveAssignmentOnDate` first. Factor the shared "validate schedule/date/employee, resolve template, compute duration, insert shift+assignment in a transaction" logic into a private helper both methods call, so the two public methods differ only in whether they replace first.
- `assignShiftToEmployeeOnDate` is unchanged in behavior (still replaces) — it remains what "click an empty cell → Assign Shift" calls. `addShiftToEmployeeOnDate` is what "add another time block" in the modal, and dropping a second tray card onto an already-filled cell, both call.

RPC: `add_shift_to_employee_on_date`, alongside the existing `assign_shift_to_employee_on_date`.

**No changes needed to:**
- `updateAssignedShiftOnDate` / `removeAssignedShiftOnDate` — both already operate on a specific `assignmentId`, not on "the one assignment for this employee/date," so they already work correctly against a cell holding multiple assignments.
- `getScheduleConflicts` — the double-booking check already does pairwise time-overlap comparison across every assignment on a given employee/date (`shiftsOverlap`, added in the Phase 1 fix wave), with an explicit comment noting "a split shift ... is legal." It already produces correct results for multiple non-overlapping assignments per day. Verify with a new test case (two split-shift blocks, no conflict) rather than changing the logic.

### 3.2 Week navigation — adjacent schedule lookup

New method: `findAdjacentSchedule(branchId, currentScheduleId, direction: 'prev' | 'next')` — requires `schedules.read`. Returns the schedule for the same branch whose `start_date` is the closest one before (`prev`) or after (`next`) the current schedule's `start_date`, or `null` if none exists. Used by the grid's ‹ › buttons to navigate; a `null` result renders today's "Nothing scheduled" empty state with the existing "Create schedule" action (not auto-created — per the approved design decision, paging into an empty week never silently creates a draft).

RPC: `find_adjacent_schedule`.

### 3.3 "Copy last week" — real duplication

New method: `duplicateScheduleShifts(sourceScheduleId, targetScheduleId)` — requires `schedules.create` (creating the target is a precondition, done first via the existing `createSchedule`) and `shifts.create`/`assignments.create` (copying its shifts into the target). For every active assignment in the source schedule's date range, creates an equivalent shift+assignment in the target schedule shifted by the same day-of-week offset (e.g. source Monday → target Monday), preserving employee, time, break, and template reference; does not copy notes (a fresh week shouldn't inherit last week's handover notes). Wrapped in one transaction — a partial failure must not leave a half-copied week.

RPC: `duplicate_schedule_shifts`. The frontend's "Copy last week" flow: create the new schedule via the existing create-schedule form (or a lighter modal, matching the handoff's own "New schedule" modal fields — Week starting / Copy from / Template set), then call this RPC with the source and new schedule ids when a source was picked.

### 3.4 Stats bar — Total Hours

Computed client-side (no new RPC), same as the existing per-employee hours summary already computed for `ScheduleSummaryBar`: sum of `duration` across every active assignment in the schedule, minus break minutes, formatted the same way (`durText`-equivalent, matching the handoff's "142h 30m" style). Added as the stats bar's 6th tile between Conflicts and Coverage, matching the handoff's tile order (On this schedule → Scheduled → Unscheduled → Conflicts → Total Hours → Coverage).

## 4. Frontend Architecture

All changes live in `apps/web/src/pages/scheduling/grid/` (existing directory from Phase 1) plus `ScheduleListPage.tsx`/`ScheduleBuilderPage.tsx` for week navigation.

### 4.1 `ScheduleGrid.tsx` — drag-and-drop + week nav

- Adds week-navigator UI (‹ range › ) above the grid, calling `find_adjacent_schedule` and navigating to the result's id, or showing the existing empty state.
- Adds the shift-drafts tray as new local state: `{ id, blocks: [{start,end,breakMinutes}], note }[]`, never sent to the backend until a draft is dropped onto a real cell (at which point it becomes a real `add_shift_to_employee_on_date` call and is removed from tray state).
- Cell drop targets: `onDragOver`/`onDragLeave`/`onDrop` per cell, matching the handoff's highlight-on-hover styling (`background:#FDF0E9; box-shadow:inset 0 0 0 2px #F04E17`). Dropping a tray card onto an empty cell calls `assign_shift_to_employee_on_date`; onto an already-filled cell calls `add_shift_to_employee_on_date` (see §5's table for the full mapping). Dropping a card from another cell calls `remove_assigned_shift_on_date` on the source assignment and the equivalent assign/add on the destination — accepted as two RPC calls rather than one atomic "move" RPC, matching how the handoff's own mock treats it as remove+add.
- Tray drop target: dropping a grid card back onto the tray calls `remove_assigned_shift_on_date` and adds it to local tray state as a draft (values pre-filled from the removed assignment).

### 4.2 `ShiftCell.tsx` — multi-card cells + "⋮" menu

- Renders `cards: Assignment[]` instead of at most one; each card gets its own "⋮" menu (new small dropdown component, or reuse `@shiftos/ui`'s existing menu primitive if one exists — implementation-plan decision) with exactly: **Edit shift** (opens `AssignShiftModal` pre-filled), **Duplicate** (calls `add_shift_to_employee_on_date` with the same card's values, into the same cell), **Move to drafts** (removes the assignment, adds it to tray state), **Mark day off** (hidden if the card is already an OFF placeholder — see below), **Delete** (calls `remove_assigned_shift_on_date`, styled danger/red per the handoff).
- "Mark day off": Phase 1 already treats an empty cell as implicitly OFF (§2.3 of the prior spec — no stored flag). The handoff's "Mark day off" menu action turns a *filled* cell into an explicit OFF state, which does need a stored signal now that a cell isn't binary empty/filled (a cell could have one card removed via "mark day off" while conceptually distinct from never having had one). Simplest correct option matching Phase 1's existing "no new state" principle: "Mark day off" just calls `remove_assigned_shift_on_date` on every card in that cell — functionally identical to clearing it back to the implicit-OFF empty state. No new column, no new concept.

### 4.3 `AssignShiftModal.tsx` — "add another time block"

Adds an "Add another time block (split / double shift)" control (present in the handoff, absent in Phase 1 per its own §7.1). Clicking it adds a second start/end/break row to the form; submitting with 2+ blocks calls `assign_shift_to_employee_on_date` for the first block (or `add_shift_to_employee_on_date` if editing an already-filled cell) and `add_shift_to_employee_on_date` for each additional block, in sequence.

### 4.4 New: shift-drafts tray UI

New component `ShiftDraftsTray.tsx` — the bottom row shown alongside "+ Add Employee" (handoff line ~586-624): "Shift drafts" label, draft cards (same visual card component as grid cells, `draggable`), and a "+ New shift" button opening a lightweight version of `AssignShiftModal` that writes to tray state instead of calling any RPC.

### 4.5 `ScheduleListPage.tsx` / `ScheduleBuilderPage.tsx`

No structural change beyond what's already shipped (PR #12 candidate territory, unrelated) — the week navigator lives inside the grid view itself (§4.1), not the list page.

## 5. Interaction Model Summary

| Action | Mechanism | RPC(s) |
|---|---|---|
| Assign draft to empty cell | Drag tray card → cell, or click empty cell → modal | `assign_shift_to_employee_on_date` |
| Add split shift to filled cell | Drag tray card → filled cell, or "⋮ → Duplicate", or modal's "add another time block" | `add_shift_to_employee_on_date` |
| Move assigned shift between cells | Drag card → different cell | `remove_assigned_shift_on_date` + assign/add on destination |
| Return assigned shift to drafts | Drag card → tray, or "⋮ → Move to drafts" | `remove_assigned_shift_on_date` |
| Edit a card's time/notes | Click card, or "⋮ → Edit shift" | `update_assigned_shift_on_date` |
| Delete a card | "⋮ → Delete" | `remove_assigned_shift_on_date` |
| Clear a cell to OFF | "⋮ → Mark day off" | `remove_assigned_shift_on_date` per card in the cell |
| Page to adjacent week | ‹ / › buttons | `find_adjacent_schedule` |
| Duplicate last week | "Copy last week" (empty-state / new-schedule flow) | `create_schedule` + `duplicate_schedule_shifts` |

## 6. Error Handling & Edge Cases

- **Dragging a card onto an archived schedule's grid**: not reachable — archived schedules already render read-only (Phase 1, unchanged); no `canEdit` cells means no `draggable` cards and no drop targets.
- **Dropping a tray card while its origin cell was concurrently modified by someone else**: the add/assign RPC call re-validates the schedule/date/employee itself (existing behavior); a stale drag just results in a normal validation error surfaced as a toast, no special handling needed.
- **`find_adjacent_schedule` with zero other schedules for the branch**: returns `null`; the ‹ › buttons disable rather than navigating to nothing.
- **`duplicate_schedule_shifts` where the source has zero shifts**: succeeds as a no-op (0 shifts copied) rather than erroring — an empty "week to copy" isn't a failure case.
- **Multiple cards after "Mark day off"**: since it removes every card in the cell rather than adding an OFF marker, there is no persisted OFF state distinct from "empty" — consistent with Phase 1's existing principle (§2.3 of the prior spec) that OFF is never a stored flag.

## 7. Explicit Non-Goals (by the user's own choice, this pass)

Confirmed directly with the user, not a scope trim made unilaterally:
- AI Schedule Assistant's actions and free-text box stay inert.
- "AI Assist" toolbar button stays inert.
- "Import Schedule" and "Use a template" stay inert.

## 8. Testing

- **Service tests**: `addShiftToEmployeeOnDate` (adds without replacing; a second add on the same date leaves the first assignment active); `getScheduleConflicts` with two non-overlapping split-shift blocks on one date (no conflict) and two overlapping blocks (conflict, unchanged from Phase 1's existing coverage); `findAdjacentSchedule` (prev/next, and the no-adjacent-schedule `null` case); `duplicateScheduleShifts` (correct day-of-week offset, notes not copied, empty-source no-op).
- **Component tests**: dragging a tray card onto a cell calls the right RPC and clears it from tray state; the "⋮" menu renders exactly the 5 items (4 once already OFF) in the right order; "Mark day off" clears every card in a multi-card cell; week navigator disables at the ends of the branch's schedule history.
- **Permission tests**: unchanged from Phase 1 (§5 of the prior spec) — Manager remains read-only for roster/shift mutations, Supervisor performs all editing actions including the new drag/duplicate/tray operations (all reuse existing `shifts.create`/`assignments.create`/`assignments.delete` permission checks, no new permission codes).
