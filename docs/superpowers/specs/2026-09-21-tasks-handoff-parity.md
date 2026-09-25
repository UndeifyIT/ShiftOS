# Tasks — Handoff Parity

**Created:** 2026-09-21
**Source:** `Local file check/design_handoff_shiftos/ShiftOS Dashboards.dc.html` — `PAGES["Manager/Tasks"]`, the shared toolbar (markup lines 363-376), the `kindTasks` board (lines 900-932), the `taskColumns` values (lines 4953-4962) and the `newTask` modal (line 3667).
**Rule:** the handoff wins (see `2026-09-12-schedule-handoff-parity.md`).

## What the page is now

`/tasks` was a filter bar over a flat table with seven dialogs. It is now the handoff's three-column board, at the prototype's rendered sizes: To do, In progress, Completed, each a list of cards with a check, a due/started/completed line, a priority pill and an owner.

| Handoff part | Real behaviour |
|---|---|
| Header "Tasks", "Main Branch · today", New task | The branch the manager is in. No branch picker — a manager works one branch, as the handoff shows |
| Toolbar: Search tasks, All / Unassigned / Overdue / Mine, "6 tasks" | Live search over title and owner. Unassigned = no owner yet; Overdue = due before now and not done; Mine = owned by the employee record matching the signed-in user. The count follows the filter |
| Column dots and counts (faint / warn / ok) | `draft` + `assigned` are To do, `in_progress` is In progress, `completed` + `verified` are Completed |
| Card check circle | Ticking runs the real RPC: `complete_task` for an owned task, `reopen_task` to undo it. A `draft` has no owner, and the schema only lets an assigned task be completed, so ticking one opens the assign dialog instead |
| "Due 10:00 AM · Front End" | The due time, then the owner's department. In progress cards read "Started HH:MM" from `assigned_at`; Completed cards read "Completed HH:MM" from `completed_at`. A task carried over from an earlier day says which day |
| Priority pill | `low` → Low, `normal` → Medium, `high` → High, in the handoff's own tones; the schema's fourth level shows as Critical |
| New task "Repeats" | Real, backed by migration 066 — see below |
| Owner, or "Unassigned" | Clicking it assigns the task (`assign_task`) |
| Empty column "Nothing here" | Shown per column, dashed, as drawn |
| Empty page: "No tasks today" + Create task / Copy yesterday | Copy yesterday really copies: every task dated yesterday is created again for today, title, description, time and priority intact |

Cards are ordered the way a manager works them: overdue first, then by priority, then by when they are due.

## What "today" means

The board is everything still open — including anything carried over from an earlier day or with no due date — plus whatever was completed today. A task due next week belongs on next week's board and is not shown. `list_tasks` has no date filter, so this is decided in `tasksBoardModel.ts` and unit-tested.

## Tasks have no department

`tasks` (012) has no department column, so a card's department is its **owner's**. An unassigned task shows just its due time, and the New task form's Department field narrows the list of people to assign to rather than being stored. That is the one place the board can show less than the prototype's fixture does, and it was preferred to inventing a column.

## Repeats (migration 066)

The handoff's form offers "Repeats", and the checks this board exists for — cold room, floor walk, restock round — are daily work. `tasks` had no way to say so, so **066 adds one column**: `recurrence task_recurrence_enum NOT NULL DEFAULT 'none'` over `('none','daily','weekdays','weekly')`. Additive only; every existing row keeps today's behaviour and no constraint or trigger moves.

**There is no scheduler in this system and 066 does not add one.** The chain advances on completion: `TaskService.completeTask` creates the next occurrence (`nextTaskOccurrence`, unit-tested — daily rolls the calendar, weekdays carries Friday and the weekend to Monday, weekly keeps its day). That has a property worth keeping: an unfinished daily check **stays on the board** instead of being silently replaced by tomorrow's copy. The owner carries over when they are still an active employee of the branch, because the trigger rejects anything else; otherwise the next one arrives unassigned.

Spawning the next occurrence deliberately does **not** require `tasks.create`: whoever set the task up authorized the repetition, and the person finishing the work is only closing the loop.

The handoff's placeholder is "Every shift"; tasks have no shift link in the schema (no `shift_id` on `tasks`), so the choices are Every day / Every weekday / Every week, plus "Does not repeat".

A repeating task says so on its card — "Due 09:00 AM · Front End · repeats daily". The handoff's card has nowhere else to put it, and recurrence you cannot see is worse than a third segment on a line already built out of them.

**This migration must be applied before this code is deployed**: `create_task` now always writes `recurrence`, so it would fail against a database that lacks the column.

## Deliberate deviations

- **Verify, cancel and archive left the page** with the old table, along with the task-history modal. The RPCs are untouched (`verify_task`, `cancel_task`, `archive_task`, `get_task_history`); the handoff's board has no menu to hang them on, so they need a home of their own if they are wanted back.
- The card's owner is a button; it looks exactly like the handoff's text and only underlines on hover.

## Verified against the prototype

Measured at 1440px, prototype vs app: board grid `378.328px 378.328px 378.344px`, columns 374 / 158 / 262 high at the same x, card 348.3 × 99 with 12px 13px padding, check circle 19 × 19 (17px plus a 1.5px ring — the handoff has no `box-sizing` reset, so the ring adds to the box), title 12.5px/700, meta 11.5px `#857A72`, pill 63.4 × 21 and owner 77.1 × 13 at the same offsets, toolbar and chips identical to the pixel. The empty column renders 1px dashed `#E4DED9`, radius 13, padding 22px 12px, 12.5px/700 `#857A72`.

Flows walked in the preview (`?as=manager&path=/tasks`): filter, search, tick → Completed, reopen → In progress, assign a draft, create a task. No console errors.
