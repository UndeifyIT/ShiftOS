# Attendance — Handoff Parity

**Created:** 2026-09-19
**Source:** `Local file check/design_handoff_shiftos/ShiftOS Dashboards.dc.html` — `PAGES["Supervisor/Attendance"]` and the `kindAttendance` markup (lines 936-1094), with `ATT_SEED`, `ATT_STATUSES`, `attStats`, `attTabs`, `attRows`, `attQuickActions`, `attRules`, `attLegend`.
**Rule:** the handoff wins (see `2026-09-12-schedule-handoff-parity.md`).

The handoff only designs Attendance under Supervisor; the Manager sidebar keeps the item by the user's own instruction, so the same screen serves both, scoped to the branch the person is in.

## What the page is now

`/attendance` was a week-by-week list with record modals. It is now the handoff's day screen for today's shifts, at the prototype's rendered sizes.

| Handoff part | Real behaviour |
|---|---|
| Header "Attendance", "Mark attendance for Morning Shift · May 16, 2025", Export | The branch's shifts for today — one label when they all run the same hours, otherwise "N shifts". Export downloads today's rows as CSV |
| Attendance Overview: Present / Late / Absent / Total Scheduled | Counted from today's assignments and their attendance records |
| The blue state box and "Last updated" | "Attendance not started" until somebody is marked, then "in progress"; the line beneath counts unsaved changes, or how many of the team are marked |
| Tabs All Employees / Present / Late / Absent / Not Marked, with counts | Filter the table |
| Search employees…, Filter ▾ | Live search over name and department; Filter is a real department picker (the handoff's is a toast) |
| Table: checkbox, Employee, Status, Check-in Time, Notes, ⋮ | One row per person assigned today. Status is a dropdown; Check-in shows the clock-in and "On time" / "12m late"; Notes is editable; ⋮ offers Mark present / late / absent, View history and Clear entry |
| "1–8 of 20 employees" and the pager | Eight rows a page |
| Cancel · "You can update attendance anytime…" · N unsaved changes · Save Attendance | Nothing is written until Save, exactly as the design says. Cancel discards the lot |
| Quick Actions | Mark All Present (the selection, else everyone not marked), Add Employee, Self check-in (explains employees clock in from their own app), Attendance Settings |
| Attendance Rules | The rules as they really are: lateness is measured from each shift's start, there is no grace period, and nothing is auto-absent |
| Legend | The four statuses |
| Empty view ("No attendance records today") | Shown when no shift is published for today |

## How a status is decided, and what marking writes

`late_minutes` is zeroed by the database on every write (011/018 leave it to an attendance engine that was never built), so **lateness is derived**: a clock-in after the shift's own start time is Late, and the minutes come from that difference. The Employee Profile's history now uses the same rule, so the two screens agree.

Marking someone needed a new operation. `clock_in`/`clock_out` are deliberately self-service (they resolve the caller's own employee row) and `mark_attendance_absent` only covers absences, so a supervisor could not mark a team member present at all. `AttendanceService.markAttendance` (RPC `mark_attendance`) fills that gap:

- requires `attendance.update`, and `attendance.correct` as well when it overwrites a record that was already marked — that is what the permission is for;
- creates the record for the assignment if there isn't one (branch access checked by the existing helper);
- writes an `attendance_corrections` row whenever it changes an already-marked record, the same audit trail `record_attendance_correction` leaves;
- leaves `late_minutes`/`worked_minutes` to the database.

**Present records the shift's start time** (or whatever they already clocked), because marking someone present vouches that they were there from the start; otherwise the derived lateness would flip the choice straight back to Late. **Late** records now. **Clear entry** puts the record back to `scheduled`.

No migration: `attendance_records` already had every column this needs.

## Deliberate deviations

- The old week navigation and the correction-history modal are gone with the old page. Corrections are still written on every change and stay in the audit trail; an employee's own history lives on their profile.
- The handoff's "Import from Device" (QR / PIN) has no counterpart here, so that tile explains that employees clock in from their own ShiftOS app instead.
- The handoff's rules card shows editable sample values (08:15, 15 minutes, 02:00 PM). Ours states the real, currently fixed rules rather than pretending they can be set.
- Selecting rows makes Mark All Present act on the selection; the handoff's checkboxes only tint the row.
- "View calendar" in the row menu opens that person's profile history — the handoff's separate calendar page doesn't exist yet.

## Verification

Preview `pnpm --filter @shiftos/web preview:schedule`, `/?as=manager&path=/attendance` (the handoff's morning: 20 assigned, 17 clocked in). Measured against the running prototype at 1440px: the overview section (885 × 162.6, including the way its four stats wrap 3 + 1), the stat columns, the table header row (21px, checkbox margins included), every column position, the save bar (885 × 70) and all three right-column cards (262 × 303 / 205 / 205) match position for position; the table itself differs only by row count. Scripted run-through: marking through the dropdown and the row menu, the dirty counter, Cancel, Mark All Present, Save (Present stays Present, Late unchanged), the tabs, search, the department filter and the pager — no page errors. Unit tests: `packages/tests/unit/attendanceToday.test.ts`.
