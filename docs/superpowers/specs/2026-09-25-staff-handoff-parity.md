# Staff dashboard — Handoff Parity

**Created:** 2026-09-25
**Source:** `Local file check/design_handoff_shiftos/ShiftOS Dashboards.dc.html`, role Staff — `NAVS.Staff`, `BADGES.Staff`, `HOME.Staff`, `PAGES["Staff/…"]`, and the shared OVERVIEW, SCHEDULE (`schedIsStaff`), REQUESTS, ANNOUNCEMENTS and settingsV2 markup.

## Pages

| Handoff | Route | Built from |
|---|---|---|
| My Shift | `/` | `pages/staff/MyShiftPage.tsx`, `myShiftModel.ts` |
| My Schedule | `/my-schedule` | `pages/staff/MySchedulePage.tsx` (shared grid cells, summary bar in Staff mode) |
| My Requests | `/requests` | `RequestsPage.tsx` for non-approvers + `StaffRequestDialog.tsx` |
| Announcements | `/announcements` | `AnnouncementsPage.tsx` Staff layout |
| Profile | `/profile` | `SettingsPage.tsx` Staff mode (Profile tab only, read-only) |

Sidebar: `STAFF_NAV_ITEMS` in the handoff's order, badges for my open requests and the notices I still owe an acknowledgement. Mobile: all five sections in the tab bar, no "More" (handoff `primaryCount` 5).

## Backend changes

- **Migration 072** — the standard Employee role gets `branches.read` and `departments.read`. Both are scoped to the caller's own branch by the services. Needed for the branch name, branch time zone and department names the handoff shows Staff.
- Swap listings join `decision_by_name`, so "Approved 12 May by Sarah Johnson" works for readers who can't list members.
- **Migration 073** — Staff don't clock themselves in or out; their supervisor marks attendance (as in the handoff, which has no Staff clock-in). The Employee role loses `attendance.clockin`, and `list_my_attendance` now needs `attendance.read` so Staff still see their hours.
- `list_shifts_for_employee_in_schedule` / `list_my_shift_assignments_in_schedule` return nothing from an unpublished schedule to anyone without `schedules.update` — "You only see published shifts".

## Deliberate deviations

- **My Schedule empty state** uses the Staff copy (`PAGES["Staff/My Schedule"].empty`, "Nothing published yet"). The prototype reuses the Supervisor's Create / Import / Copy last week buttons for Staff, which Staff can't use. "Request a shift" is dropped: there is no such request in ShiftOS.
- **Swaps move one shift**, so the "Takes over" side shows the same shift and the new-request dialog has no "Their shift" field (as on the Manager page).
- **Row meta shows the department**, not a job title, as elsewhere. Employees have no job-title field; the profile's job title is the login's.
- **Status wording for the people in a swap** is "Awaiting approval"; "Awaiting your approval" is kept for the approver. A Staff leave row's action is "View", not the prototype's "Review".
- **Toasts** say what actually happens — "Acknowledged · your supervisor can see it", not "your supervisor notified".
- **Profile** has no Save button (nothing on it is editable) and no "Your role and access" chips (hidden for Staff in the handoff too). Password stays under Security in the account menu.
- Numbers come from real data: "Shifts this week" counts this week's published shifts, so the preview shows 6 where the prototype's hard-coded card says 4.

## Verification

`pnpm --filter @shiftos/web preview:schedule`, then `?as=staff&path=/`, `/my-schedule`, `/requests`, `/announcements`, `/profile` — John Doe on the handoff's morning (`preview/schedule/staffBackend.ts`). Each page was compared against the running prototype (`node tools/handoff-preview/server.mjs`, `?role=Staff&page=…`) at 1440px and 390px, and the dialogs (request time off, request swap, acknowledge) were clicked through. Unit tests: `staffMyShift.test.ts`, plus Staff cases in `requests.test.ts` and `announcements.test.ts`.
