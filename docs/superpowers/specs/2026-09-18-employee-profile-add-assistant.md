# Employee Profile, Add Employee and the floating Ask ShiftOS — Handoff Parity

**Created:** 2026-09-18
**Source:** `Local file check/design_handoff_shiftos/ShiftOS Dashboards.dc.html` — "EMPLOYEE DETAIL" (markup lines 1714-1900, `EMP_FORM`, `HISTORY_STATS`, `HISTORY_DAYS`, `HISTORY_ROWS`), "ADD EMPLOYEE" (lines 2295-2379, `ADD_EMP_SECTIONS`, `ADD_EMP_SUMMARY`) and the floating assistant (lines 2799-2831, `showFloatingAssistant`).
**Rule:** the handoff wins (see `2026-09-12-schedule-handoff-parity.md`).

## Employee Profile — `/employees/:employeeId`

Replaces the old card/tabs detail page. The header carries only the date pill, because the handoff gives this page an empty title and subtitle.

| Handoff part | Real behaviour |
|---|---|
| Hero: 88px avatar with a ◉ change-photo button, name, status pill, "EMP-001 · Role · Department" | The employee's photo (initials without one); the button uploads a new photo (PNG/JPG/WEBP, 2MB) and saves it. Role is their ShiftOS role, or **Staff** without a login |
| Tabs 1 Employee Details / 2 Employee History | Local tabs |
| Employee Details: Full Name, Email Address, Phone Number (+234 prefix), Employment Type, Department, Date of Joining, Role | The edit form — Save Changes writes `update_employee`, Cancel returns to the directory. Role is read-only (roles are changed in Members & Roles) |
| Employee History: range and Filter buttons, four stat cards, Attendance Overview strip, Recent Activity table, Show More | The person's real attendance (`list_attendance_for_employee`, with each record's shift joined in): This month / Last month / Last 30 days, filtered by All / On time / Late / Absent, 5 rows at a time |
| Employment Status card | The status pill is a menu — choosing Active / On Leave / Inactive / Terminated saves it, and the sentence under it follows |
| Work Information: Reports To, Date Added | The employee this person reports to (with their role), and when the record was created |
| Contact Information, Quick Actions → Reset Password | Their phone and email; Reset Password emails a Supabase reset link to their login address (and says so when they have no login) |

`/employees/:employeeId/edit` now redirects here, since this page is the edit form.

## Add Employee — `/employees/new`

Replaces the old create form. New people always join the Manager's own branch.

| Handoff part | Real behaviour |
|---|---|
| Personal Information: Full Name, Employee ID (Optional), Email Address, Phone Number, Date of Birth, Gender | `create_employee`; a blank Employee ID is server-generated (migration 057) |
| Work Information: Department, Date of Joining, Role, Reports To (Optional), Employment Type (Optional) | Departments and colleagues from the branch; Reports To lists active people, managers and supervisors first |
| Account Information: Login Email + "Send login credentials to this email" | Ticked, the new employee is invited with the chosen role (`invite_member`); the login email follows the email above until it's edited |
| Cancel / Save as Draft / Add Employee | Save as Draft keeps the form in this browser (restored next visit); Add Employee creates, uploads the photo, invites, then returns to the directory with "Employee added" |
| Profile Photo (Optional) | Held locally and uploaded once the employee exists (storage paths are keyed by employee id, migration 030) |
| Employee Summary and the Tip box | Fills in as the form is completed |

Required fields are the handoff's asterisked ones; Role and Login Email are only required when a login is actually being sent.

## Floating Ask ShiftOS

Mounted in the app shell: a 52px Shifty button bottom-right on every Manager page except the overview (which has the full Ask ShiftOS card), folding away on navigation. The panel answers from the same branch data and intents as that card; its answer box opens the page the answer is about. The handoff's own prototype never fills that box away from home — showing the real answer is the intended behaviour.

## Deliberate deviations

- The prototype's stat cards compare "this month" with the whole previous month ("vs Apr 1 – Apr 30"). The app keeps that wording but compares the same days of the previous month (`vs Apr 1 – Apr 16`) so a part-month percentage isn't misleading; a full month still compares with a full month.
- Invalid fields show a short red message under them — the handoff has no validation state.
- "View Full Calendar" and "View All Activity" open Attendance; the handoff's separate calendar and activity pages don't exist yet.
- Archiving an employee moved out of the profile: the status menu (Inactive / Terminated) covers it, and the handoff's profile has no archive action.

## Database

`supabase/migrations/065_add_employee_profile_fields.sql` adds nullable `gender`, `employment_type` and `reports_to_employee_id` (composite FK to an employee in the same organization, never self) to `employees` — the fields the handoff's forms collect.

The Employees directory's Employment Type filter is now real (it said "isn't recorded for employees yet"), which supersedes that deviation in `2026-09-14-employees-directory-handoff-parity.md`.

## Verification

Preview `pnpm --filter @shiftos/web preview:schedule`, `/?as=manager&path=/employees/p2` and `?path=/employees/new`. Measured against the running prototype at 1440px: back link, hero (885 × 130), tabs, the Details form (fields, 44px controls, Cancel/Save), the History tab (stat cards, Attendance Overview 843 × 146, Recent Activity 843 × 371, Show More), all four right-column cards, every Add Employee section (885 × 261 / 226), the footer bar and the summary column match position for position; the floating panel matches after allowing for the prototype's content-box 300px width. Scripted run-through: empty submit errors, the live summary, Save as Draft, Add Employee → directory toast and row, the Employment Type filter, invalid save blocked, Save Changes, the status menu, history filter and range, `/edit` redirect and the bubble. Unit tests: `packages/tests/unit/employeeProfile.test.ts`.
