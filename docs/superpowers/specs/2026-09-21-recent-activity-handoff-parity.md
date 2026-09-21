# Recent Activity — Handoff Parity

**Created:** 2026-09-21
**Source:** `Local file check/design_handoff_shiftos/ShiftOS Dashboards.dc.html` — `PAGES["Manager/Recent Activity"]` (line 3344), the `kindActivity` markup (lines 1499-1590), `ACTIVITY` / `ACTIVITY_STATS` (3473-3492) and the `activityRows` values (5355-5400).
**Rule:** the handoff wins (see `2026-09-12-schedule-handoff-parity.md`).

## What the page is now

`/recent-activity` was a "coming soon" placeholder. It is now the handoff's screen: four stat tiles over an Activity Timeline, with Filters and Quick Actions in a 244px rail.

| Handoff part | Real behaviour |
|---|---|
| Header "Recent Activity", "All real-time activities and updates from today's shift · May 16, 2025" | The date is today's; the sentence follows the date range when it isn't Today |
| Four tiles: Total Activities / System Events / Employee Actions / Task Updates with a percentage | Counted over what is currently in view, so they follow the filters |
| Activity Timeline rows: time, icon on a connector, title + red accent, description, person and role, ⋮ | One row per thing that happened (below). ⋮ shows the full line as a toast |
| "Search activities…" | Live over title, detail and person |
| "Newest first ⌄" | Toggles to Oldest first |
| Filters rail: Type / Person / Date range, Clear Filters | Real selects. Type is the three activity types; Person is everyone in the feed; Date range is Today / Yesterday / Last 7 days (the handoff's are toasts) |
| Quick Actions: Start shift / Export activity / View reports | Attendance, a CSV of exactly the rows in view, and Reports |
| "Showing 1 to 8 of 24 activities" + pager | Eight rows a page, over the filtered feed |
| Empty: "No activity yet today" | Shown when the branch has no events at all |

## Where the rows come from

The handoff's fixture is commented `activity_log` — a table this system does not have. `audit_logs` is append-only plumbing keyed by **login**, not by person, and only some services write to it, so it cannot produce the design's rows (a name, a role and a sentence about what happened).

So the feed is **composed from what actually happened** in the branch, which is precisely the set of rows the design shows:

| Row | Source | Type |
|---|---|---|
| "John Doe checked in" | `clock_in_at` on the attendance record | Employee Actions |
| "Mary Johnson marked **late**" | the same clock-in, when it is after the shift's own start | Employee Actions |
| "… checked out" | `clock_out_at` | Employee Actions |
| "… marked **absent**" | `attendance_status = 'absent'`, timed at the shift's start | Employee Actions |
| "Task completed" / "Task assigned" / "Task created" | `completed_at` / `assigned_at` / `created_at` on the branch's tasks | Task Updates |
| "Announcement posted" | `published_at`, attributed through the poster's membership | System Events |
| "Shift started" | a published, staffed shift whose start time has passed | System Events |
| "… requested leave" | a leave request, with its type and dates | Employee Actions |
| "Schedule published" | a published schedule, at the moment it changed | System Events |

The last two are what the overview's own Recent Activity card already shows, so the page it links to is a superset of the card rather than a different story.

A branch that runs the same hours in five departments started **one** shift, not five: identical date/hours/title collapse into a single "Shift started" row, which is what the design draws. Without that, a twenty-shift morning buries everything else.

Lateness is **derived from the shift's start**, as everywhere else in this app — `late_minutes` is zeroed by the database (011/018). The branch-range attendance read does not join the shift, so the shift is reached through the assignment, exactly as the Attendance screen does it.

The handoff's eighth fixture row, "System check completed · All systems operational", has no counterpart in reality and is not invented.

## A note on the prototype

The `kindActivity` block in the handoff has a stray `</sc-if>` inside it (between Quick Actions and the closing grid), which breaks the binder: rendered, that page shows `{{ a.time }}` placeholders and an unstyled Quick Actions button outside the rail. The page here is therefore built to the **source markup's** sizes rather than to that broken render: the 244px rail with both sections in it, `repeat(auto-fit,minmax(170px,1fr))` stat tiles at 14px gap, the `76px 36px minmax(0,1fr) 168px 30px` row track at 10px gap and 13px/18px padding, the 30px icon on a 1.5px × 28px `#F2EEEA` connector, 38px search and sort controls, and 32px pager buttons.

The one addition: below 1100px the rail drops under the timeline instead of squeezing, since the handoff's grid is fixed at two columns and would overflow a phone.

## Verified in the browser

At 1440px against the source markup: the `minmax(0,1fr) 244px` grid at 16px gap, `repeat(auto-fit,minmax(170px,1fr))` tiles at 14px, the timeline head at 15px/18px with a 220 × 38 search and a 38px sort button, rows on the `76px 36px minmax(0,1fr) 168px 30px` track at 10px gap and 13px/18px padding, the 30 × 30 icon over a 1.5 × 28 `#F2EEEA` connector, a 26 × 26 ⋮ at radius 8, 32 × 32 pager buttons, the 244px rail at 16px padding with 210 × 40 controls, and quick-action buttons at 10px/12px padding and radius 11.

Walked: sort, search, all three filters, Clear Filters, paging, the ⋮ toast, both empty cases ("Nothing matches these filters." and the page's own empty state), the CSV export, and both navigating quick actions. Today / Yesterday / Last 7 days each return their own set. No console errors.

**Deviations found and kept:** "Start shift" opens Attendance (the prototype opens a clock-in modal that does not exist here), and "View reports" leads to Reports, which is still a placeholder screen.
