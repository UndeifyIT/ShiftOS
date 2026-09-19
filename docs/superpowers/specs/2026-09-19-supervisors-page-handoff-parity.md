# Supervisors (Manager) — Handoff Parity

**Created:** 2026-09-19
**Source:** `Local file check/design_handoff_shiftos/ShiftOS Dashboards.dc.html` — `PAGES["Manager/Supervisors"]` and `SUPERVISORS`, rendered by the shared toolbar (markup lines 363-376) and the generic table (lines 378-407, `TABLE_GRID`, `CELL`, `tonePill`, `avatar`), plus `MODALS.inviteSupervisor` and `MODALS.managePermissions` (lines 2697-2738).
**Rule:** the handoff wins (see `2026-09-12-schedule-handoff-parity.md`).

## What the page is now

`/supervisors` was a "coming soon" placeholder; it is now the handoff's table, for the Manager's own branch.

| Handoff part | Real behaviour |
|---|---|
| Header "Supervisors", "3 supervisors · 2 invitations outstanding", Invite supervisor | The counts are the branch's real supervisors and the invitations still outstanding; the button opens the handoff's invite dialog |
| Toolbar: Search supervisors, All / Active / Invited / Expired, "5 supervisors" | Live search over name, email, department and role; the chips filter by status; the right-hand count follows the filter |
| Table: Supervisor, Department, Permissions, Team size, Status | One row per supervisor (avatar, name, email), then the outstanding invitations |
| Supervisor | Anyone whose ShiftOS role is branch-scoped **and** holds at least one role capability — a branch role with none is a plain staff login, and org-wide roles are the Admins page |
| Department | From their own employee record; "—" for an invitation, which has no employee record yet |
| Permissions | How many of the six role capabilities their role holds ("5 permissions"); an invitation reads "Pending setup", or "Invitation expired" once its 7 days are up |
| Team size | The people who report to them (`reports_to_employee_id`), else their department's other staff |
| Status pill Active / Invited / Expired | An active member, a pending invitation, or one past its expiry |
| Foot "Invitations expire after 7 days. Resending issues a fresh link." + Manage permissions | Manage permissions opens the handoff's dialog over the role's real capabilities (`get_role_capabilities` / `update_role_permissions`), with the two a supervisor can never have shown as "Never for supervisors" |
| Empty view ("No supervisors yet", Invite supervisor / Learn about roles) | Shown when the branch has no supervisors or invitations; "Learn about roles" opens Members & Roles |

The invite dialog (`invite_member`) takes the work email and which role to grant, and grants the manager's own branch — the handoff's "Full name" and "Department" fields are gone because an invitation has collected neither since migration 055 (the invitee sets their name at CompleteProfilePage, and the department comes from their employee record).

## Deliberate deviations

- The handoff's invited rows show a department and team size; a real invitation has neither until it is accepted, so both read "—".
- Every supervisor holding the same role shows the same permission count, because permissions live on the role, not the person.
- The handoff has no per-row menu, so neither does this page: resending or revoking an invitation is still `/invitations`.
- Roles whose capabilities can't be read are treated as supervisor roles rather than dropping their people from the page.

## Verification

Preview `pnpm --filter @shiftos/web preview:schedule`, `/?as=manager&path=/supervisors` (3 supervisors, 2 invitations). Measured against the running prototype at 1440px: the search field (782.8 × 40), the four filter chips, the count, the table section (1163 × 369), every column header position, the row avatar and name block, the status pill column, the foot text and the Manage permissions button (145.5 × 32) all match; rows differ only in which person sorts first. Scripted run-through: each filter and the search, the invite dialog (invalid email blocked, role list, invitation sent), Manage permissions (six capability rows, save) and Escape closing a dialog, with no page errors. Unit tests: `packages/tests/unit/supervisors.test.ts`.

## Next

`PAGES["Manager/Admins"]` is the same generic table over the org-wide roles — `SupervisorsPage` and `supervisorsModel` are shaped so that page can reuse them.
