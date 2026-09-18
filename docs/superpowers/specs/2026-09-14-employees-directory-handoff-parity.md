# Employees Directory — Handoff Parity

**Created:** 2026-09-14
**Source:** `Local file check/design_handoff_shiftos/ShiftOS Dashboards.dc.html` — "EMPLOYEES DIRECTORY" (markup lines 1596-1712), `PAGES["Manager/Employees"]`, `EMP_DIRECTORY`, `EMP_STATS`, `EMP_FILTERS`, `DEPTS`.
**Rule:** the handoff wins (see `2026-09-12-schedule-handoff-parity.md`).

## What the page is now

`/employees` renders the handoff's directory for the Manager's own branch, at the prototype's rendered sizes:

| Handoff part | Real behaviour |
|---|---|
| Header "Employees", "View and manage everyone in {branch}.", Import / + Add Employee | Import opens the Import Employees wizard; + Add Employee opens the add form |
| Total Employees / Active / On Shift Today / On Leave | Everyone in the branch; employment status Active; people on a published shift today; On Leave — each with its share of the total |
| Tabs All / Active / On Leave / Inactive (with counts) | Filter the table; Inactive covers inactive and terminated. The tab and the Filters panel's Status stay in sync |
| Search employees… | Live search over name, Employee ID, email and phone |
| Filter ⌄ | Jumps to the Filters panel and focuses its first field |
| Table: checkbox, Employee, Role, Department, Status, Phone, Date Added, ⋮ | Select one or all on the page (the footer counts the selection); name opens the profile; Role is the person's ShiftOS role (Supervisor, Admin, Employee…) or **Staff** when they have no login; Department or **Unassigned**; Date Added is when the record was created; ⋮ offers View profile and Edit details |
| Showing X to Y of Z employees · 1 2 3 → | 8 per page; up to three page numbers around the current page, → disabled on the last page |
| Filters: Status, Department, Role, Employment Type, Search by Name or ID, Apply Filters, Clear all | Choices apply on Apply Filters (or Enter in the search box); Clear all resets the panel, tabs and toolbar search |
| Department Breakdown donut and legend, View Full Report | Each department's share of the branch, Unassigned last in grey; View Full Report opens Reports |
| Empty view ("No employees yet", Add employee / Import CSV) and loading skeleton | Shown when the branch has nobody yet / while loading |

## Deliberate deviations

- Employees have no job title, so Role shows their ShiftOS role, or Staff without a login.
- ~~Employment Type isn't stored on employees; the filter shows "All Types" with a note saying so.~~ Employees carry an employment type since migration 065, and the filter is real — see `2026-09-18-employee-profile-add-assistant.md`.
- The ⋮ menu (a toast in the handoff) has View profile and Edit details — both open the profile, whose first tab is the edit form.
- The footer adds "· N selected" while rows are selected — the handoff has no selection feedback.

## Verification

Preview `pnpm --filter @shiftos/web preview:schedule`, `/?as=manager&path=/employees` (the handoff's branch: 20 people, 17 active, 1 on leave, 2 inactive). Measured against the running prototype at 1440 px: header buttons, stat cards (215.3 × 127), the directory section (903 × 590), tabs, search and Filter button, table header (44) and rows (53), pills, ⋮, footer (58) and pager (32 × 32), the Filters panel (244 × 464) and Apply Filters all match; Department Breakdown differs only by its number of departments. Clicked through tabs, the Status filter, search, paging and the row menu. Unit tests: `packages/tests/unit/employeeDirectory.test.ts`.
