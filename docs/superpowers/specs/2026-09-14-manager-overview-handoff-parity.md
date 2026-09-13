# Manager Overview — Handoff Parity

**Created:** 2026-09-14
**Source:** `Local file check/design_handoff_shiftos/ShiftOS Dashboards.dc.html`, role Manager, page Overview (markup lines 25-360, data `HOME.Manager`, Ask ShiftOS lines 3146-3201).
**Rule:** the handoff wins over earlier dashboard specs (WEB-017) — layout, copy and behaviour (see `2026-09-12-schedule-handoff-parity.md`).

## What the page is now

`/` for an org-wide (Manager) role renders the handoff's "Branch overview" section for section, with every number from the branch's live data:

| Handoff section | Real data behind it |
|---|---|
| Header "Branch overview", `Branch · Weekday, Month day`, date/time pill | Branch name, live clock (30s tick) |
| Shifty · "Next week's schedule isn't published yet" | Shown while no published schedule covers next Mon–Sun; dismiss lasts the browser session |
| Ask ShiftOS (typed hints, 7 chips, answer card) | The handoff's keyword intents answered from branch data (`askShiftOS.ts`); unrecognised questions get the handoff fallback card |
| Employees / On shift now / Coverage gaps / Open requests | Active employees (supervisors = employees whose email belongs to a Supervisor member); clocked in and not out today of today's published assignments; published shifts this week with nobody on them; pending swap approvals + pending leave |
| Department coverage today | Today's published assignments grouped by the shift's department (else the person's), checked in vs scheduled |
| Needs your attention | Departments on shift with no supervisor, next week unpublished, pending invitations, swaps, leave; this week published as the done row |
| Quick actions | Schedules (next week), Invitations, Add employee, Attendance |
| Announcements / Recent Activity | Two latest published announcements; latest clock-ins, absences, completed tasks, posted announcements, published schedules and leave requests from the last 7 days |
| Loading / Empty views | The handoff's skeleton and "Add your team to get started" card (no employees) |

The sidebar is rebuilt to the handoff's aside (logo image, icon-less nav with the solid active pill and count badges, Branch scope card, account card, Log out). Nav labels follow the handoff where the page exists: Overview, Schedules.

## Deliberate deviations

- The app's floating top bar (organization name, assistant, notifications) still sits above the header — it is app-wide chrome the prototype doesn't have.
- The header's Manager/Supervisor/Staff and Populated/Loading/Empty tabs are prototype controls and are not rendered. Managers with more than one branch get a branch picker in their place (`?branch=`).
- Sidebar items are the app's real routes. The handoff's Supervisors, Admins, Recent Activity, Reports and Settings pages don't exist; badges show on Requests (waiting on your approval) and Invitations (pending).
- With no activity-log or reports page, "View all" (Recent Activity), "Export payroll hours" and the activity/hours answers open Attendance; the invitations answer opens Invitations ("Open Invitations" rather than "Open Supervisors").
- Coverage rows read "Upcoming" (neutral) until at least one of the department's shifts has started, so the morning doesn't open all red; rows sort by department name.
- Answer lines the backend can't back are reworded: no read-receipt reach figure, no 90-day log claim, no late-threshold or payroll-export lines.
- "Import employees" on the empty view says importing isn't available yet.

## Verification

`pnpm --filter @shiftos/web preview:schedule` then open `/?as=manager&path=/` — the real page against an in-memory backend seeded with the handoff's own morning (Fri May 16, 2025, 07:58; `preview/schedule/overviewBackend.ts`, `mockClock.ts`). Measured against the running prototype at 1440 px: every section, row, card, button and circle has the same size and position (header 152.1, Shifty 74, Ask 214 / answer card 288.9, stat cards 113, coverage panel 341, attention rows 53, quick actions 336, sidebar items 34/37, scope 48, account 50). Tolerant pixel diff: header, Shifty and Ask 0.00–0.01 %; remaining differences are the seeded names/order. `packages/tests/unit/managerOverview.test.ts` covers the stats, coverage scoring, attention list, activity and Ask answers.
