# Import Employees and Import Schedule

**Created:** 2026-09-14
**Source:** `Local file check/design_handoff_shiftos/ShiftOS Dashboards.dc.html` — "Manager/Import Employees" (markup lines 1902-2293, data `IMPORT_*` / `VALIDATE_*` / `SUCCESS_*`), and the Schedules `schedImport` action.
**Rule:** the handoff wins (see `2026-09-12-schedule-handoff-parity.md`).

## Import Employees — `/employees/import`

Reached from the Employees page ("Import Employees"), the Manager overview's empty state, and the wizard's own "Import More".

| Handoff step | What it does now |
|---|---|
| 1 · Upload File | Drag-and-drop or Choose File (.xlsx or .csv, 5 MB). Download Template gives a CSV with every column and an example row using a real department and role. Recent Imports is the branch's last 5 imports (`list_employee_imports`), with View / View Errors opening the import's counts and per-row failures. |
| 2 · Validate Data | Every row checked in the browser: Full Name (two words), Email (format), Phone Number, Department (must exist in the branch), Role (must be a role people can be invited as), Date of Joining (MM/DD/YYYY, ISO or an Excel date), optional Employee ID (unique) and Date of Birth. Emails already in the directory or repeated in the file are Duplicates (warnings, left out). Search, All/Errors/Warnings, Download Issues (CSV), and an expand chevron showing phone, date of birth and Employee ID. "Next: Import" needs every error fixed (re-upload); "Skip & Import Valid Rows" continues with the valid ones. |
| 3 · Confirm and Import | Employees to be imported, invites to be sent (rows with a role, when the viewer can invite), department breakdown, sample, "Save as Template" (downloads the rows about to be imported), "Import N Employees". |
| Success | Imported / invites sent / failed / rows skipped, any failed rows with the reason, the four next-step cards, and "Resend Invites" for invites that couldn't be sent. |

Backend: `import_employees` (EmployeeImportService) creates each row through EmployeeService — the same checks as adding one person — plus a department-belongs-to-branch check, keeps going past a failing row, invites each new person with their role when asked and permitted, and records the import (migration **064** `employee_imports`). `list_employee_imports` returns the last 5 for the branch with the importer's name. Permission: `employees.create` (invites also need `org.members.manage`).

## Import Schedule — Schedules toolbar and empty state

One row per shift: Employee (name, Employee ID or Email), Date, Start Time, End Time; optional Break (minutes), Department, Notes; `OFF` as the times marks a day off. Rows are checked against the branch's people (ambiguous names ask for the Employee ID), the dates of this schedule in the viewed week, real times (12- or 24-hour, Excel fractions), department names and duplicates. The dialog shows how many rows will land and every skipped row with its reason, then writes the good rows with the grid's own RPCs (`add_employee_to_schedule` when needed, `add_shift_to_employee_on_date`, `mark_day_off`) and reports what landed. From the empty state, Import Schedule drafts the week and opens the dialog on it.

## Files

Spreadsheets are read without a new dependency (`apps/web/src/lib/spreadsheet.ts`): RFC 4180 CSV, and .xlsx unzipped with the browser's `DecompressionStream` and read from the sheet XML.

## Deliberate deviations

- Legacy binary `.xls` isn't readable without a spreadsheet library, so the copy reads "Supports: .xlsx, .csv" and an `.xls` upload explains how to save it as .xlsx or .csv.
- The handoff's optional columns (Employment Type, Reports To) don't exist on employees; the optional columns are Employee ID and Date of Birth.
- "Contact Support →" and "Learn more about security →" are in place but say their pages are coming soon — the support and security pages haven't been built yet (to do).
- The success card counts "Rows Skipped at Validation" rather than "Issues Fixed During Import": nothing is fixed during import, rows with problems are skipped. "Resend Invites" only shows when an invite failed.

## Verification

Preview: `pnpm --filter @shiftos/web preview:schedule`, then `/?as=manager&path=/employees/import` (Import Employees against the handoff's own branch and recent imports) and `/?as=manager&status=draft&week=2025-05-12` (Import Schedule). Measured against the running prototype at 1440 px, every step's sections match size for size (step 1: stepper 67, upload section 333, Recent Imports 279, action bar 76, How it works 316, Required Columns 239; step 2: 536; step 3: 598; summary card 206; tips 262.8, Need help 129.8). A genuine .xlsx and the handoff-shaped 46-row sample (3 issues) were uploaded end to end. Unit tests: `employeeImport.test.ts`, `scheduleImport.test.ts`; integration: `employeeImport.integration.test.ts` (not run here — the live DB rejects the local TLS chain).
