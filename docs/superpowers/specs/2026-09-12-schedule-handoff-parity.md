# Schedules — Handoff Parity

**Created:** 2026-09-12
**Supersedes, where they conflict:** `2026-09-06-schedule-grid-rebuild-design.md`, `2026-09-09-schedule-grid-replica-design.md`, `SCH-003` §12, `PER-003` roster/assignment rows as applied to Manager.

## Rule

Where the design handoff (`Local file check/design_handoff_shiftos/ShiftOS Dashboards.dc.html`, "Manager/Schedules" / "Supervisor/Schedules") and the written specs disagree, the handoff wins — behaviour as well as visuals (user decision, 2026-09-12).

## What changed because of that

| Area | Before | Now (handoff) |
|---|---|---|
| Navigation | `/schedules` list → `/schedules/:id` page with tabs | `/schedules?week=YYYY-MM-DD` opens the Mon–Sun week directly; "Nothing published for …" empty state with Create New Schedule / Import Schedule / Copy last week; `/schedules/new` redirects to `/schedules` |
| Page chrome | Schedule name header, status badge, Publish button, Shifts/Version History tabs | "Schedules" header; Manager status bar (Published → "Unpublish to edit"; unpublished → "Republish Schedule"); toolbar with week navigator, Import Schedule, AI Assist, Publish split button. Version history moved into the publish "▾" menu (no place for it in the handoff) |
| Publishing | Published schedules stay editable; no unpublish | Manager sees a published week read-only until **Unpublish to edit** (`unpublish_schedule`: schedule and its published shifts back to draft). Publishing is blocked while conflicts exist |
| Days off | "No shift" meant OFF (no stored state) | Explicit OFF cards (`schedule_day_offs`, migration 062; `mark_day_off` / `clear_day_off` / `list_schedule_day_offs`). A day with no card shows the "+" placeholder. Assigning a shift clears that day's OFF |
| Conflicts | Any single shift > 10h gross; overlap | Per employee per day: overlapping blocks, else > 10h **paid** time (breaks removed) — `scheduleConflictRules.ts`, shared by the service and the preview |
| Roster ✕ | Removed roster row only | Removes the person from the week with their shifts and days off |
| Copy week | Shifts only | Roster, shifts and days off |
| Hours | 40h overtime flag | Over 45h (red), under 10h "Light week", progress bars, meta, Export hours (CSV) |
| Shift form | Template picker, 24h inputs | Working shift / Day off toggle, 12h selects, split blocks, paid-time total, 10-hour warning, "Also apply to" days, note counter, save as template |
| AI panel | 4 inert actions | 5 actions: Fill empty shifts, Resolve conflicts and Create next week act on real data; Balance workloads and Avoid overtime report figures computed from the week; the question box goes to `ask_assistant` |

## Deliberate deviations (kept honest or blocked by data)

- The line under each person shows their **department**, not a job title — employees have no job-title field.
- Toasts/copy that would claim something the backend doesn't do are reworded: publishing sends no notifications ("staff can see this week", not "everyone notified"); Import Schedule says it isn't available yet.
- Page-level: no live clock pill in the header (app-wide header concern); sidebar width set to the handoff's 221px.

## Verification

`pnpm --filter @shiftos/web preview:schedule` renders the real page against an in-memory backend seeded with the handoff's own week. Measured against the running prototype at 1440×1000: identical section sizes in published, editing and summary-open states, identical grid row heights, modal and picker geometry; tolerant pixel diff ≈0.4%, remaining differences being sub-pixel anti-aliasing plus the deviations above.
