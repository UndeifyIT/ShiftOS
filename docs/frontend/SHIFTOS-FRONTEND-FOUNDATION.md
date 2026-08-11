# ShiftOS Frontend Product & UX Foundation (FD-1 through FD-5)

**Document ID:** FD-000

**Document Title:** Frontend Product, UX & Information Architecture Foundation

**Version:** 1.0.0

**Status:** Approved (foundation document — supersedes no existing spec, reconciles several)

**Classification:** Frontend

**Owner:** ShiftOS Product Team

**Created:** 2026-08-09

---

# A. Executive Summary

This document is the canonical frontend product/UX foundation for ShiftOS, combining five phases: product/UI audit (FD-1), role & permission mapping (FD-2), information architecture (FD-3), screen inventory (FD-4), and workflow specifications (FD-5). It is grounded entirely in the actual repository — the live Supabase schema, the applied migrations, the `packages/*` backend built in Milestones 1–5, and ~150 existing product/UX specification documents under `docs/`. No UI code, components, or new APIs were created. No database, RLS, or backend architecture was touched.

**The single most important finding**: ShiftOS's backend has three distinct maturity tiers, and the frontend blueprint must respect them exactly:

1. **Tier 1 — Fully implemented** (schema + repository + domain service + RPC operation + enforced permission): Authentication, Organization, Branch, Employee, Scheduling (Schedule → Version → Shift → Assignment). These are the only domains a UI can be wired to a real, permission-checked backend today.
2. **Tier 2 — Schema + repository only, no service/API/permission layer yet**: Attendance, Attendance Corrections, Leave Requests, Tasks, Task Assignments, Announcements, Notifications, Audit Logs, Security Events. Extensive, detailed product specs exist for most of these (attendance, tasks, announcements, notifications) but **zero permission codes are seeded for any of them** — only 25 permissions exist live, all in the organization/branch/employee/scheduling domains. A screen for these domains can be *designed* now but cannot be *implemented end-to-end* until a further backend milestone builds their services, RPC operations, and permission catalog.
3. **Tier 3 — Documented product requirement, no database table at all**: Departments, Subscription/Billing, Reports/Analytics. These appear extensively in permission matrices and navigation docs but have no corresponding table among the 28 live tables. They are future/aspirational, not gaps in an otherwise-complete backend.

Second most important finding, directly resolving the "user with organization access but no employee record" question the task asked to investigate explicitly: this is a **deliberate, approved architectural decision** (GOV-003 DEC-016, DEC-032), not an open question. Authorization identity (`organization_memberships`) and workforce identity (`employees`) are intentionally separate. An organization owner/administrator never needs an employee record. The frontend must reflect this directly: any "self-service" navigation (My Schedule, My Attendance, My Tasks, Profile-as-employee) is conditional on the authenticated identity actually having an `employees` row, not on role name.

Third: `apps/web` and `apps/mobile` are genuinely blank (React 18 + Vite; Expo + React Native respectively — single placeholder file each, no router, no state library, no UI kit, no auth wiring). Frontend implementation starts from zero, but does **not** start from zero on product/UX decisions — 12 `docs/frontend/UI-*` documents (Design System, Navigation, Layout, State Management, Forms, Data Tables, Calendar, Empty States, Error States, Responsive Design, Accessibility, PWA Behaviour) are already Approved and this document builds on them rather than replacing them, reconciling two places where they conflict with more detailed domain specs (§K).

Readiness for FD-6 (Design System): **conditional go** — see §O.

---

# B. Full Findings (Repository Discovery, Part 1)

## B.1 What exists and was inspected

- **Live database**: 28 tables (verified via `docs/database/DB-005-TABLES.md`, cross-checked against `packages/repositories` and live schema queries performed in Milestones 3–5). Full list in §B.3.
- **Backend code**: `packages/database`, `packages/repositories` (28 repositories, one per table), `packages/authorization` (`resolveAuthorizationContext`), `packages/services` (`ApplicationContext`, `OrganizationService`, `BranchService`, `EmployeeService`, `SchedulingService`), `packages/api` (RPC registry + thin HTTP adapter), `packages/auth`, `packages/errors`, `packages/types`, `packages/utils`, `packages/validation`, `packages/config`, `packages/constants`.
- **Live permission catalog**: 25 rows — `org.roles.manage`, `org.members.manage`, `org.branches.manage`; `organizations.read/update`; `branches.read/create/update/archive`; `employees.read/create/update/archive`; `schedules.read/create/update/publish/archive`; `shifts.read/create/update/archive`; `assignments.create/update/delete`. **No other domain has a seeded permission code.**
- **~150 product/UX documents** under `docs/` across 27 folders: `product-foundation`, `governance`, `organization`, `user-identity`, `employee`, `shift`, `scheduling`, `attendance`, `task-management`, `communication`, `notifications`, `roles-permissions`, `security`, `database`, `backend`, `frontend` (UI-001–012), `screen-specifications` (empty), `mvp-build-plan` (README only, `MVP-001` file does not exist), `reporting-analytics` (empty), `state-machines` (README only, `SM-001` does not exist), `system-architecture`, `realtime`, `deployment-operations`, `testing`, `integrations`, `shifty` (the in-product AI assistant persona), `database-table-migration`.
- **`apps/web`**: React 18 + Vite. `src/main.tsx` renders a static placeholder. No router, no data layer, no auth integration, no component library.
- **`apps/mobile`**: Expo 57 + React Native 0.72. `App.tsx` renders a static placeholder. Same absence of infrastructure.

## B.2 Governance decisions directly load-bearing for this document

| Decision | Content | Frontend implication |
|---|---|---|
| DEC-016 | User identity (`users`) is strictly separate from employee/workforce data (`employees`) | A user account and an employee profile are different screens/entities; never assume one implies the other |
| DEC-032 | Branch access is resolved from `organization_memberships` (+ `organization_member_branch_access` / `roles.grants_org_wide_branch_access`), never from `employees.branch_id` | Confirms §A's "no employee record" answer; nav/IA must gate on membership+role, not employee presence, for anything administrative |
| DEC-017 | Organization access is invitation-only; no public registration into an existing org | Requires an Invitation workflow (§F, WF-002) and an "Accept Invitation" screen; no "join organization" self-service UI |
| DEC-018 | Authentication, authorization, and session management are separate domains | Login screen concerns ≠ permission-gated UI concerns ≠ session/device-management screen; do not conflate |
| DEC-021 | Account status (platform access) is separate from employment status (workforce relationship) | An employee can be `terminated` in `employees.employment_status` while their `users`/`organization_memberships` row is untouched, or vice versa — two independent status displays, not one |
| DEC-024 | Role-based authorization via explicit permission matrices, no hardcoded role checks | Frontend permission gating must be capability-based (`hasPermission('schedules.publish')`), never `if (role === 'Manager')` |
| DEC-028 / PER "Access Rules" Rule 13 | Some actions are **Request** (submit for approval), not **Allow**/**Deny** | UI must render a third state for these actions — "Request" — not just enabled/disabled (§L risk) |
| DEC-029 | Manager may temporarily assume Supervisor operational responsibilities (branch-scoped, time-boxed, fully audited) | A "temporary takeover" affordance is a real, documented capability, not scope creep — but has no dedicated permission code live yet (Tier 2) |
| DEC-030 | Audit history is immutable | Audit/security screens are read-only by construction; no edit/delete affordance should ever be designed for them |

## B.3 The 28 tables, tiered by frontend-readiness

| # | Table | Tier | Service/API exists? | Permissions seeded? |
|---|---|---|---|---|
| 1 | organizations | 1 | Yes (`OrganizationService`) | Yes |
| 2 | branches | 1 | Yes (`BranchService`) | Yes |
| 3 | users | 1 (infra) | Auth only, no CRUD service (by design — see PF/DEC-016) | N/A |
| 4 | organization_memberships | 1 (infra) | Resolved by `ApplicationContext`; no admin-facing service yet | `org.members.manage` exists, no service consumes it yet |
| 5 | roles | 1 (infra) | Same as above | `org.roles.manage` exists, no service consumes it yet |
| 6 | permissions | 1 (infra) | Read via authorization resolution only | N/A |
| 7 | role_permissions | 1 (infra) | Same as roles | `org.roles.manage` |
| 7a | organization_member_branch_access | 1 (infra) | Resolved by `ApplicationContext.branchAccess` | `org.branches.manage` exists, no service consumes it yet |
| 8 | employees | 1 | Yes (`EmployeeService`) | Yes |
| 9 | employee_history | 1 (derived) | Written automatically by `EmployeeService`; no standalone write API (correct — it's an audit trail) | Read via `employees.read` |
| 10 | shift_templates | 2 | Repository only | None |
| 11 | schedules | 1 | Yes (`SchedulingService`) | Yes |
| 12 | schedule_versions | 1 (derived) | Written by `publishScheduleWithVersion()`; read-only append log | Read via `schedules.read` |
| 13 | shifts | 1 | Yes (`SchedulingService`) | Yes |
| 14 | shift_assignments | 1 | Yes (`SchedulingService`) | Yes |
| 15 | attendance_records | 2 | Repository only | None |
| 16 | attendance_corrections | 2 | Repository only | None |
| 17 | leave_requests | 2 | Repository only | None |
| 18 | tasks | 2 | Repository only | None |
| 19 | task_assignments | 2 | Repository only | None |
| 20 | task_history | 2 (derived) | Repository only | None |
| 21 | announcements | 2 | Repository only | None |
| 22 | announcement_acknowledgements | 2 | Repository only | None |
| 23 | notifications | 2 | Repository only | None |
| 24 | notification_preferences | 2 | Repository only | None |
| 25 | notification_delivery_attempts | 2 (derived) | Repository only; append-only delivery log | None |
| 26 | audit_logs | 2 (derived) | Repository only; append-only, immutable (DEC-030) | None |
| 27 | security_events | 2 (derived) | Repository only; append-only, immutable (DEC-030) | None |

No table for **Departments** or **Subscription/Billing** exists (Tier 3 — documented in ORG-005, ORG-003, PER "Departments"/"Billing" matrices, but not in DB-005's 28 tables and not in the live schema).

## B.4 Documentation integrity issue found (not fixed, flagged per instructions)

Multiple files under `docs/roles-permissions/` and `docs/user-identity/` have an internal **Document ID / Document Title header that does not match the filename**, and in at least one case (`USR-004-INVITATIONS.md`) the header and body content is for an entirely different topic (Password Policy) than the filename promises. Observed mismatches: `PER-001-ROLE-DEFINITIONS.md` → internally "PER-002 Permission Matrix Index"; `PER-003-SCHEDULING.md` → "PER-002-02"; `PER-004-ATTENDANCE.md` → "PER-002-03"; `PER-007-ORGAIZATION.md` → "PER-002-01"; `PER-008-BRANCHES.md` → "PER-002-02" (a duplicate of PER-003-SCHEDULING's internal ID); `PER-010-REPORTS.md` → "PER-002-07"; `PER-011-SECURITY.md` → "PER-002-08"; `PER-014-PERMISSION-EVALUATION.md` → "PER-003"; `PER-017-ACCESS-RULES.md` → "PER-006"; `PER-018-BRANCH-ISOLATION.md` → "PER-007"; `PER-019-ORGANIZAION-ISOLATION.md` → "PER-008"; `USR-002-AUTHENTICATION.md` → "SEC-001"; `USR-004-INVITATIONS.md` → "SEC-002" (wrong topic). This document cites every source by **filename** (stable, navigable) rather than internal Document ID, and treats the *content* as authoritative regardless of the header. This should be cleaned up by the documentation owner independent of frontend work — it is out of scope to fix here.

---

# C. Role/Permission Matrix (FD-2)

## C.1 Roles — confirmed

The live `roles` table has no fixed enum of role names — a role is organization-defined data (`name`, `grants_org_wide_branch_access`, and a set of `role_permissions`). The product documentation (PER "Role Definitions", "Access Rules", and every domain permission matrix) consistently designs around **three MVP role archetypes**:

| Role | Branch scope | Description |
|---|---|---|
| **Manager** | Org-wide (`grants_org_wide_branch_access = true`) | Highest operational authority; oversees all branches; administers organization/branch structure |
| **Supervisor** | Branch-scoped (explicit `organization_member_branch_access` grants) | Owns day-to-day operations for their branch(es): scheduling, attendance, tasks, announcements |
| **Staff** | Branch-scoped, self only | Consumes schedules/announcements, requests corrections/leave, does not manage anything |

Plus a bootstrap-only **Owner** role: `create_organization_with_owner()` (the only supported way to create a new tenant, DEC-031) seeds a role literally named "Owner" with `grants_org_wide_branch_access = true` and every active permission. In practice this is a Manager-tier role by capability; the frontend should treat "org-wide role with full permission set" as the signal, not the literal string "Owner" or "Manager" (roles are organization-editable data, not a hardcoded enum — DEC-024).

A **future Admin** role is documented throughout every PER-* matrix (consistently: read-only operational visibility + billing/subscription/security administration) but does not exist in the live system and has zero permission codes reserved for it. Treat as P3/future.

One naming inconsistency to note: GOV-003 DEC-009 titles the third role "Employee," while every PER-*/domain matrix consistently uses "Staff." This document uses **Staff**, matching the higher volume and more detailed source.

## C.2 The "no employee record" case — resolved, not open

Per DEC-016/DEC-032 (§B.2): an `organization_memberships` row (authorization identity) does not require an `employees` row (workforce identity). Concretely:

- A Manager/Owner administering the organization typically has **no** employee record — they are not "workforce," they are an operator of the business.
- A Supervisor or Staff member is typically **both** an `organization_memberships` row (for login/permissions) **and** an `employees` row (for scheduling/attendance/workforce reporting) — but the two are linked by convention/invitation flow, not by a database foreign key from `employees` to `users`.
- It is architecturally valid (if operationally unusual) for a Supervisor-role membership to exist without an employee record, or for an employee record to exist with no linked membership (a worker who has never been given app access).

**Frontend rule**: gate personal/workforce screens (My Schedule, My Attendance, My Tasks placeholder, "who am I working as") on *"does this authenticated identity resolve to an `employees` row,"* not on role name. If no employee record exists, those nav items should not appear at all — not appear-and-error. This is a real, common case (every organization's first Manager/Owner) and must be a first-class empty/absent state, not an edge case.

## C.3 Permission matrix — by domain, only where a matrix is documented

Values: **Allow** (immediate), **Deny**, **Request** (submits for approval, PER "Access Rules" Rule 13), **Future** (behaves as Deny until built). Tier column reflects §B.3.

### Organization (source: `PER-007-ORGAIZATION.md`) — Tier 1

| Capability | Manager | Supervisor | Staff |
|---|:---:|:---:|:---:|
| View organization profile | Allow | Allow | Deny |
| Edit organization details | Allow | Deny | Deny |
| View/edit business settings | Allow / Allow | Allow / Deny | Deny |
| View organization audit logs | Allow | Deny | Deny |

### Branches (source: `PER-008-BRANCHES.md`) — Tier 1

| Capability | Manager | Supervisor | Staff |
|---|:---:|:---:|:---:|
| View branch list/details | Allow | Allow | Deny |
| Create/edit/archive branch | Allow | Deny | Deny |
| Assign/reassign supervisor to branch | Allow | Deny | Deny |
| View branch audit logs | Allow | Deny | Deny |

### Workforce / Employees (source: `EMP-001-EMPLOYEE-PROFILE.md`) — Tier 1

| Capability | Manager | Supervisor | Staff |
|---|:---:|:---:|:---:|
| View employee directory/profile | Allow | Allow | Deny |
| Create employee record | Deny | Allow | Deny |
| Edit employee information | Allow | Allow | Deny |
| Archive employee record | Allow | Request | Deny |
| View employee history | Allow | Allow | Deny |

### Scheduling (source: `PER-003-SCHEDULING.md`) — Tier 1

| Capability | Manager | Supervisor | Staff |
|---|:---:|:---:|:---:|
| View schedule calendar / personal schedule / shift details | Allow | Allow | Allow |
| View schedule history / dashboard / analytics / unassigned shifts | Allow | Allow | Deny |
| Create/edit/delete draft schedule | Deny | Allow | Deny |
| Publish schedule | Allow | Allow | Deny |
| Edit/override published schedule | Allow | Deny | Deny |
| Assign/remove/reassign employee to shift | Deny | Allow | Deny |
| Cancel shift | Allow | Allow | Deny |
| Resolve conflict / approve-reject shift swap | Deny | Allow | Deny |
| Export schedule | Allow | Allow | Deny |

*(Note: the live implementation, built in Milestone 5, currently has one permission per action-family rather than this document's finer 29-row granularity — e.g. `schedules.update` covers what PER-003 splits into "Edit Draft Schedule"/"Edit Published Schedule"/"Override Published Schedule." The frontend should design against the **documented** granularity as the target and treat today's coarser enforcement as a known interim state, not redesign the UI around only what's enforced today.)*

### Attendance (source: `PER-004-ATTENDANCE.md`, `ATT-001` through `ATT-009`) — Tier 2, not yet enforceable

| Capability | Manager | Supervisor | Staff |
|---|:---:|:---:|:---:|
| View attendance dashboard/records/analytics | Allow | Allow | Deny |
| View own personal attendance/history | Allow | Allow | Allow |
| Record arrival/departure/late/absence | Deny | Allow | Deny |
| Correct attendance record / submit adjustment | Deny | Allow | Deny |
| Approve/reject attendance adjustment | Allow | Deny | Deny |
| Start/end operational shift (attendance session) | Deny | Allow | Deny |
| Take over operational shift (Manager standing in) | Allow | Deny | Deny |
| Submit attendance correction (own record only) | Deny | Deny | Allow |

**Critical product decision**: employees do **not** clock themselves in or out (`ATT-001` §3.2, §7: "Employees do not perform these actions themselves"). Attendance is exclusively supervisor-recorded. Any UI resembling a self-service clock-in button for Staff would directly contradict this approved spec.

### Tasks (source: `PER-005-TASKS.md`, `TASK-001`) — Tier 2, not yet enforceable

| Capability | Manager | Supervisor | Staff |
|---|:---:|:---:|:---:|
| View task dashboard/analytics/all tasks | Allow | Allow | Deny |
| Create/edit draft/duplicate task | Deny | Allow | Deny |
| Publish task | Allow | Allow | Deny |
| Edit published task | Allow | Deny | Deny |
| Mark in progress/completed, attach evidence | Deny | Allow | Deny |
| Verify task completion | Allow | Allow | Deny |
| Export task report | Allow | Allow | Deny |

**Critical product decision, even stronger than attendance**: `TASK-001` §3.3/§10: "Employees do not interact with the task management system during their shifts" at all — no digital assignment, no completion marking, no evidence upload. Work is coordinated verbally by the Supervisor, who records everything. **Staff has no task-related capability in this matrix at all.**

### Announcements (source: `PER-006-ANNOUNCEMENTS.md`, `COM-001`) — Tier 2, not yet enforceable

| Capability | Manager | Supervisor | Staff |
|---|:---:|:---:|:---:|
| View announcement feed/details/history | Allow | Allow | Allow |
| Create/edit draft/publish/schedule announcement | Deny / Allow (org policy) | Allow | Deny |
| Edit published announcement | Allow | Deny | Deny |
| Archive/pin announcement | Allow | Allow | Deny |
| Target organization-wide | Allow | Deny | Deny |
| Target branch/department | Allow / Deny | Allow / Allow | Deny |

### Reports (source: `PER-010-REPORTS.md`) — Tier 3, no backend at all

| Capability | Manager | Supervisor | Staff |
|---|:---:|:---:|:---:|
| View/generate/export any report | Allow | Allow | Deny |

No `reports`/`analytics` table exists; `docs/reporting-analytics/RA-001` is an empty placeholder. Design as future.

### Security (source: `PER-011-SECURITY.md`) — Tier 2 for org-wide views, Tier 1 for self-service

| Capability | Manager | Supervisor | Staff |
|---|:---:|:---:|:---:|
| View security dashboard/events/audit logs | Allow | Deny | Deny |
| View own login history / manage own sessions / reset own password | Allow | Allow | Allow |
| Force user sign-out / lock account / require password reset | Allow | Deny | Deny |

Self-service session/password screens are buildable today (they ride on `packages/auth`, already implemented per Milestone 2). Organization-wide security dashboards need a service layer over `audit_logs`/`security_events` that doesn't exist yet.

### Departments, Billing — Tier 3, documented, no table

`PER-009-DEPARTMENTS.md` and `PER-002-01-ORGANIZATION.md`'s billing rows describe a full permission set (create/edit/archive department; view/upgrade/downgrade/cancel subscription; billing history; invoices). Neither `departments` nor a `subscriptions`/`billing` table exists among the 28 live tables. **No screen should be built for these in MVP** — they are approved product vision, not implementation gaps.

## C.4 Platform × Permission summary matrix (per the requested WEB / MOBILE / ORG / BRANCH / EMPLOYEE format)

| Capability area | Web | Mobile | Scope | Tier |
|---|:---:|:---:|---|:---:|
| Organization admin (profile, settings, audit) | ✅ | — | Organization | 1 |
| Branch admin (create/edit/archive, supervisor assignment) | ✅ | — | Organization | 1 |
| Employee directory & profile management | ✅ | 🔸 view-only | Branch | 1 |
| Member/role administration | ✅ | — | Organization | 1 (permissions exist, no service yet — see §H) |
| Schedule creation/editing/publishing | ✅ | 🔸 view + light edit | Branch | 1 |
| My Schedule (personal view) | ✅ | ✅ | Employee | 1 |
| Attendance recording (supervisor-entered) | 🔸 | ✅ primary | Branch | 2 |
| Attendance correction request (own record) | 🔸 | ✅ primary | Employee | 2 |
| Leave request & approval | 🔸 | ✅ primary | Employee/Branch | 2 |
| Task coordination (supervisor) | 🔸 | ✅ primary | Branch | 2 |
| Announcements (compose) | ✅ primary | 🔸 | Branch/Organization | 2 |
| Announcements (read) | ✅ | ✅ | Branch/Organization | 2 |
| Notifications | ✅ | ✅ primary | Employee | 2 |
| Reports/Analytics | ✅ | — | Organization/Branch | 3 |
| Departments | — | — | Organization | 3 (not built) |
| Billing | ✅ (future) | — | Organization | 3 (not built) |
| Security/audit review | ✅ | — | Organization | 2 |

✅ = primary/full experience, 🔸 = secondary/reduced experience, — = not planned for that platform.

---

# D. Information Architecture (FD-3)

Builds directly on `docs/frontend/UI-002-NAVIGATION.md` (Approved), reconciled against the confirmed role/tier model above. Two corrections to UI-002 are made explicitly (not silently):

1. UI-002's Employee mobile navigation lists "My Tasks." Per `TASK-001`/`PER-005` (§C.3), Staff have **no** task capability at all. **Correction: remove "My Tasks" from Staff navigation entirely** — it is not "empty," it should not exist as a nav destination for this role.
2. UI-002's "Management Navigation" lists "Organizations" (plural) and "Workforce Analytics." The live/MVP model is single-organization-per-membership-context with an `accessibleOrganizationIds` list only for users who belong to *multiple* organizations (an edge case, not a primary nav pattern — see §E). "Workforce Analytics" is Tier 3 (no backend). **Correction: "Organizations" becomes a switcher affordance only for the multi-org edge case, not a primary nav item; "Workforce Analytics" is deferred to P3 alongside Reports.**

## D.1 Primary navigation — Web (Manager/Owner, org-wide)

```
Dashboard
Employees
Branches
Scheduling
Attendance*
Tasks*
Announcements*
Reports*  (P3 placeholder / hidden until built)
Administration (Members & Roles, Organization Settings)
```
`*` = Tier 2, present in nav once its service layer ships (§H); until then, absent rather than shown-disabled (an empty/disabled nav item with no working screen behind it is worse than no item — UI-008/UI-009 both argue against fake affordances).

## D.2 Primary navigation — Web (Supervisor, branch-scoped)

```
Dashboard (branch)
Schedule
Employees (branch)
Attendance*
Tasks*
Announcements*
```

## D.3 Primary navigation — Mobile (Supervisor)

```
Home (Today)
Schedule
Attendance*
Tasks*
Announcements
```
Bottom navigation, 4–5 items max, per UI-002 §9/§15.

## D.4 Primary navigation — Mobile (Staff)

```
Home
My Schedule
Announcements
Profile
```
No Attendance tab (supervisor-recorded, not self-service — Staff reach corrections via a secondary action inside My Schedule/Home, not a persistent tab). No Tasks tab (§D, correction 1).

## D.5 Secondary / contextual navigation

- **Employee detail** → Profile, Employment History, Branch Assignment History (secondary tabs within WEB-006, not top-level nav).
- **Schedule detail** → Shifts, Versions, Publish action (contextual to WEB-012).
- **Settings** (all roles) → Profile, Notification Preferences, Security/Sessions. Organization Settings is separate and Manager-only (not nested under personal Settings — DEC-021/DEC-022 both argue for keeping personal preferences and organization policy visibly separate).

## D.6 What is deliberately NOT in navigation

- **Global search**: not justified yet. UI-002 §14 lists it as a *future* item explicitly; no domain has enough records-per-tenant volume documented to justify it for MVP, and building it now would precede the data model it would search.
- **Departments, Billing, Reports as live nav items**: Tier 3, no backend (§B.3, §C.3).
- **A generic "Admin" top-level section mixing organization admin with security admin with billing**: PER "Access Rules" Rule 12 explicitly separates operational, administrative, and security responsibilities — collapsing them into one nav bucket would misrepresent the permission model rather than simplify it.

---

# E. Multi-Tenant & Multi-Branch UX (Part 5)

- **Organization switcher**: justified, but only as a low-frequency affordance. `ApplicationContext.accessibleOrganizationIds` already exists (Milestone 4) precisely for "which orgs does this identity belong to" — but `PER-008-ORGANIZAION-ISOLATION.md` (filename `PER-019`) Rule 2 states "During the MVP, users belong to one organization only" as the *expected* case. Recommendation: build the switcher as a compact profile-menu control, not a persistent header element, since it will be invisible/unused for the overwhelming majority of MVP users.
- **Branch switcher**: justified and higher-frequency than the org switcher, for exactly two populations: (a) Manager/Owner roles with org-wide access viewing branch-scoped screens (Employees, Schedule, Attendance) need a way to pick "which branch am I looking at" or an explicit "All Branches" aggregate view; (b) a Supervisor/Staff member with more than one `organization_member_branch_access` grant. A Supervisor/Staff with exactly one branch grant should see **no** switcher at all — their branch context is implicit and permanent, and showing a switcher with one disabled option is a UI-008-style fake affordance.
- **"All branches" view**: justified for Manager/Owner only (their `branchAccess.isOrgWide` is `true`); not offered to branch-scoped roles, since `resolveBranchScope()` (Milestone 4) would reject an "all branches" request from them anyway — offering it in the UI would be a permission the backend will always deny, which UI-002 §10 explicitly warns against ("navigation only improves user experience," it must not promise what authorization won't grant).
- **Branch-specific vs. organization-wide dashboards**: two distinct dashboard screens are justified (WEB-017 org-wide, WEB-018/MOBILE-001 branch-scoped) rather than one dashboard with conditional widgets, because the underlying data queries are genuinely different shapes (`listByBranches` across all branches vs. one branch), not just a display difference.
- **Security/UX boundary, restated per the task's explicit instruction**: every gating decision described in this document (`hasPermission`, `hasBranchAccess`, `resolveBranchScope`, "does this identity have an employee record") exists in `packages/services`/`packages/authorization` today and is enforced server-side (Milestones 3–4, verified by the authorization test suite in API-013 §7). The frontend must call the same checks to decide what to *render*, but **never** treat a hidden button as the reason an action is blocked — the RPC layer re-verifies every permission independently of what the UI showed (API-013 §4). This is stated once here as the governing principle for every screen and workflow below, not repeated per-screen.

---

# F. Complete Workflow Inventory (FD-5)

Full specification for the highest-value workflows; a summary table follows for the remainder. "Backend status" uses the tier system from §B.3.

## WF-001 — Authentication (Sign In)

- **Primary user**: all roles. **Backend status**: Tier 1 (implemented, `packages/auth`, Milestone 2).
- **Starting point**: unauthenticated visit to any protected route.
- **Preconditions**: none.
- **Steps**: enter email/password → Supabase Auth verifies → session created → `createApplicationContext` resolves membership/role/permissions for the default (or last-used) organization → land on role-appropriate Dashboard/Home.
- **Decision points**: unverified email → blocked with a verification-required state (DEC-019); no active organization membership → blocked with a "no access" state, not a generic error (this is a real possible outcome per PER-008 Rule 1).
- **Validation**: credentials only (email/password format, non-empty).
- **Permissions**: none required to attempt sign-in; authorization begins immediately after.
- **Backend operations**: Supabase Auth sign-in, then `resolveAuthorizationContext`.
- **Success state**: redirected to Dashboard/Home for the resolved role.
- **Failure state**: invalid credentials (generic message, no "email exists but wrong password" leak — standard practice, not found explicitly in SEC-001 but consistent with its "avoid exposing details" principle elsewhere), rate-limited after repeated failures (SEC-001 §16).
- **Recovery path**: "Forgot password" link (WF, see summary table).
- **Audit**: successful/failed login (SEC-001 §22).
- **Related screens**: SHARED-001.

## WF-002 — Organization Invitation & Onboarding

- **Primary user**: Manager/Owner (sends), invitee (accepts). **Backend status**: Tier 1 at the auth/membership level (`packages/auth` supports `admin.inviteUserByEmail`, per prior milestone summaries), but there is **no dedicated invitation-management service/UI-facing operation yet** in `packages/services`/`packages/api` — flagged as a gap in §H, not assumed built.
- **Starting point**: Manager selects "Invite" from a member administration screen.
- **Preconditions**: caller has `org.members.manage`.
- **Steps**: enter invitee email + intended role → system sends invitation → invitee receives email → invitee sets password / confirms identity → `organization_memberships` row created with the specified role.
- **Decision points**: invitee already has a ShiftOS account (link existing user to new org membership) vs. brand-new user (full signup).
- **Validation**: email format; role must exist in the organization's `roles`.
- **Permissions**: `org.members.manage` to send; none to accept (identity-based).
- **Success state**: new/updated `organization_memberships` row, invitee can sign in and land in the new organization context.
- **Failure/empty state**: invitation expired/already used.
- **Audit**: user invitation (PER "Access Rules" Rule 10 explicitly lists this).
- **Notifications**: invitee email (outside in-app notification system).
- **Related screens**: WEB-010, SHARED-005.

## WF-003 — Employee Onboarding (Create Employee Record)

- **Primary user**: Supervisor (create), Manager (edit/oversight). **Backend status**: Tier 1 (`EmployeeService.createEmployee`, live).
- **Starting point**: "Add Employee" from Employee Directory (WEB-005) or empty state.
- **Preconditions**: `employees.create`; `requireBranchAccess(branchId)` on the target branch.
- **Steps**: enter employee number, name, hire date, branch (defaulted to caller's branch if single-branch) → uniqueness check on employee number within org → record created, status defaults appropriately.
- **Decision points**: duplicate employee number → rejected with a clear inline error, not a generic failure (this is exactly what `EmployeeService.createEmployee` already enforces server-side).
- **Validation**: required fields (employee number, first/last name, hire date — valid date); branch must be one the caller can access.
- **Permissions**: `employees.create` + branch access.
- **Backend operations**: single insert, no transaction needed.
- **Success**: new employee appears in directory; `employee_history` untouched (creation isn't a "change").
- **Failure**: duplicate number (ValidationError), branch access denied (AuthorizationError) — both already produce safe, distinct messages per API-013 §6.
- **Empty state**: "Your team has not been added yet" per UI-008 §4 example (this exact copy already exists in the approved empty-states doc).
- **Related screens**: WEB-005, WEB-007.

## WF-004 — Schedule Creation → Shift Building → Publishing

- **Primary user**: Supervisor (build/publish), Manager (oversight/override). **Backend status**: Tier 1, fully implemented and tested (API-012).
- **Starting point**: "Create Schedule" from Schedule List (WEB-011) for a branch + date range.
- **Preconditions**: `schedules.create`, branch access; no existing schedule for the same branch+date-range (enforced by `uq_schedules_branch_active_dates`).
- **Steps**: (1) create draft schedule (branch, name, start/end date) → (2) add shifts (title, date within range, start/end time, break) → (3) assign employees to shifts (cross-checked against the same organization, duplicate-assignment rejected) → (4) publish.
- **Decision points**: duplicate branch+period → clean rejection before hitting the DB constraint (`findExact` pre-check, API-012 §4.1); shift date outside schedule range → rejected; publishing with zero shifts → rejected ("at least one shift is required," matches SCH-007 §4 exactly); publishing an already-published schedule → allowed, records the next version (republish, not an error).
- **Validation**: date range validity, shift time validity, employee-organization match.
- **Permissions**: `schedules.create/update/publish`, `shifts.create/update`, `assignments.create`, all branch-scoped.
- **Backend operations**: `publishScheduleWithVersion()` — a single atomic transaction updating `schedules.status` and inserting a `schedule_versions` row together (verified via forced-failure rollback test, API-012 §6).
- **Success state**: schedule status `published`, version recorded, visible to assigned Staff via My Schedule.
- **Failure state**: any of the above validation errors, each with a distinct, non-generic message.
- **Cancellation path**: draft schedule can be abandoned (never published) or archived.
- **Recovery path**: republish after edits — this *is* the recovery path, not a separate flow (§B "never destructively overwrite published versions").
- **Audit**: not yet a dedicated audit_logs write from this service (existing `employee_history`-style pattern is not mirrored for scheduling; noted as a gap, §M).
- **Notifications**: Tier 2 (schedule-published notification exists as a documented concept in `NOTIF-001` §7 but no service wires it yet).
- **Related screens**: WEB-011, WEB-012, WEB-013, WEB-014, WEB-015, WEB-016, MOBILE-003.

## WF-005 — Employee Views Personal Schedule

- **Primary user**: Staff. **Backend status**: Tier 1 (`schedules.read` is Allow for all roles per PER-003).
- **Starting point**: My Schedule tab (mobile) / Dashboard widget (web, secondary).
- **Preconditions**: caller has an employee record and at least one published schedule covering their branch.
- **Steps**: view current/upcoming shifts for their branch and employee id.
- **Empty state**: no published schedule yet for the period — "No schedule published for this week" (not an error).
- **Related screens**: MOBILE-002, SHARED covered by employee-scoped dashboard widget on web.

## WF-006 — Attendance Recording (documented target state; Tier 2, not yet buildable end-to-end)

- **Primary user**: Supervisor. **Backend status**: Tier 2 — `attendance_records`/`attendance_corrections` repositories exist; no `AttendanceService`, no RPC operations, no permission codes.
- **Starting point**: "Start Operational Shift" at the beginning of a scheduled shift (ATT-001 §4).
- **Steps**: supervisor opens the expected-employees list (derived from shift assignments) → records arrival per employee as they physically appear → shift operates → supervisor records departures at shift end.
- **Decision points**: supervisor fails to start within a grace period → Manager may temporarily take over (DEC-029), branch-scoped and audited.
- **Explicit non-goal**: employees never self-clock (ATT-001 §3.2, §7) — do not design a Staff-facing clock-in button.
- **Recovery path**: attendance correction request (WF-007).
- **This document's recommendation**: fully speccable and design-able now (screens MOBILE-004/WEB-019 can be wireframed against ATT-001/002/003/004), but should not be promised as "connect to a working backend" until a Milestone 6 service layer exists (§H, §N).

## WF-007 — Attendance Correction (documented target state; Tier 2)

- **Primary user**: Staff (request, own record only), Supervisor (submit on behalf, request), Manager (approve/reject).
- **Steps**: correction requested with reason + proposed values → Manager (or Supervisor if organization policy allows) reviews → approved (record updated, original preserved) or rejected.
- **Audit**: every step (ATT-007 §11) — this is one of the clearest "must never destructively overwrite" cases in the entire product: original values are always retained alongside corrected ones.
- **Related screens**: MOBILE-005, WEB-020.

## WF-008 — Leave Request & Approval (Tier 2, and notably has **no dedicated product spec** — only a DB table and a repository)

- **Backend status**: `leave_requests` table + `LeaveRequestRepository` exist (Milestone 3); no `docs/leave` folder, no PER matrix entry, no ATT/TASK-style philosophy document. This is a genuine documentation gap distinct from the Tier 2 domains above (which at least have full product specs) — flagged in §K as an open question, not assumed.
- **Recommendation pending that decision**: design conservatively from the schema + the general approval-workflow pattern already established for attendance corrections (submit → review → approve/reject, immutable history), rather than inventing new UX patterns.

## WF-009 — Task Coordination (Tier 2)

- **Primary user**: Supervisor (create, assign verbally, record completion), Manager (verify, oversee).
- **Explicit non-goal**: no employee-facing task list, ever, in the current product model (TASK-001 §3.3) — this is the strongest and most specific "don't build a generic SaaS feature" instance found in the entire audit.
- **Related screens**: WEB-022, MOBILE-008 (both Supervisor/Manager-only).

## WF-010 — Announcement Publishing & Acknowledgement (Tier 2)

- **Primary user**: Supervisor/Manager (publish), all roles (read/acknowledge).
- **Steps**: compose (title, message, priority, audience: org-wide/branch/role) → publish (immediate or scheduled) → recipients see it on their feed → optional acknowledgement tracked per-recipient.
- **Related screens**: WEB-023, MOBILE-009.

## F.1 Remaining workflows (summary table)

| Workflow | Primary user | Backend status | Related screens |
|---|---|---|---|
| Password reset (self-service) | All | Tier 1 | SHARED-002/003 |
| Session management (view/revoke own sessions) | All | Tier 1 | SHARED-010 |
| Branch creation/edit/archive | Manager | Tier 1 | WEB-003/004 |
| Employee transfer (branch change) | Manager (execute), Supervisor (request) | Tier 1 (service supports branch-change with history); UI not yet built | WEB-006 |
| Employee status change (active/inactive/terminated/on_leave) | Manager, Supervisor (request) | Tier 1 | WEB-006 |
| Schedule version history review | Manager/Supervisor | Tier 1 | WEB-013 |
| Member/role administration | Manager | Permissions exist (`org.roles.manage` etc.), **no service/API built** — gap | WEB-009 |
| Notification preferences | All | Tier 2 | SHARED-009 |
| Audit/security log review | Manager | Tier 2 | WEB-025 |
| Reports/analytics (any) | Manager/Supervisor | Tier 3, no table | WEB-024 (future) |
| Department management | Manager | Tier 3, no table | Not designed |
| Billing/subscription management | Manager (future Admin) | Tier 3, no table | Not designed |

---

# G. Complete Screen Inventory (FD-4)

Stable IDs: `SHARED-xxx` (identical experience/purpose on both platforms, platform-appropriate layout), `WEB-xxx`, `MOBILE-xxx`. 46 screens total: 10 shared, 26 web, 10 mobile.

## G.1 Shared

| ID | Name | Primary role | Purpose | Permission | Backend domain | Tier |
|---|---|---|---|---|---|---|
| SHARED-001 | Sign In | All (unauthenticated) | Authenticate | None | Auth | 1 |
| SHARED-002 | Forgot Password | All | Request reset | None | Auth | 1 |
| SHARED-003 | Reset Password | All | Set new password | None (token-based) | Auth | 1 |
| SHARED-004 | Email Verification | All | Confirm email ownership | None | Auth | 1 |
| SHARED-005 | Accept Invitation / Account Setup | Invitee | Complete onboarding | None | Auth + org_memberships | 1 |
| SHARED-006 | Organization Switcher | Multi-org identities only | Change active organization context | None (identity-based) | ApplicationContext | 1 |
| SHARED-007 | My Profile | All | View/edit personal info, own employee profile if present | `employees.read` for own record | Users + Employees | 1 |
| SHARED-008 | Notification Inbox | All | View notifications | None (self-scoped) | Notifications | 2 |
| SHARED-009 | Notification Preferences | All | Configure delivery/opt-outs | None (self-scoped) | Notification Preferences | 2 |
| SHARED-010 | Active Sessions / Security | All | View/revoke own sessions, view own login history | None (self-scoped) | Auth/Security Events | 1 |

## G.2 Web

| ID | Name | Primary role | Scope | Purpose | Permission | Tier |
|---|---|---|---|---|---|---|
| WEB-001 | Organization Setup (first run) | New Owner | Org | Bootstrap a new tenant via `create_organization_with_owner` | None (unauthenticated-adjacent bootstrap) | 1 |
| WEB-002 | Organization Profile & Settings | Manager | Org | View/edit org details, business settings | `organizations.read/update` | 1 |
| WEB-003 | Branch List | Manager | Org | Browse/search/filter branches | `branches.read` | 1 |
| WEB-004 | Branch Detail / Create / Edit | Manager | Org | Create, edit, archive a branch | `branches.create/update/archive` | 1 |
| WEB-005 | Employee Directory | Manager, Supervisor | Branch (Supervisor) / Org (Manager) | Browse/search/filter employees | `employees.read` | 1 |
| WEB-006 | Employee Profile Detail | Manager, Supervisor | Branch/Org | View profile, employment/branch history | `employees.read` | 1 |
| WEB-007 | Employee Create/Edit Form | Manager, Supervisor | Branch | Create or edit an employee record | `employees.create/update` | 1 |
| WEB-008 | Employee Archive Confirmation | Manager (allow), Supervisor (request) | Branch | Archive an employee record | `employees.archive` | 1 |
| WEB-009 | Member & Role Administration | Manager | Org | Manage memberships, roles, role-permission grants | `org.members.manage`/`org.roles.manage` | 1 (permissions exist; **no service/API yet — gap**) |
| WEB-010 | Invitations | Manager | Org | Send/track invitations | `org.members.manage` | 1 (auth primitive exists; no invitation-mgmt service — gap) |
| WEB-011 | Schedule List | Manager, Supervisor | Branch | Browse schedules by branch/period | `schedules.read` | 1 |
| WEB-012 | Schedule Builder (Draft) | Supervisor | Branch | Create schedule, add/edit shifts | `schedules.create/update`, `shifts.create/update` | 1 |
| WEB-013 | Schedule Version History | Manager, Supervisor | Branch | Review publish history | `schedules.read` | 1 |
| WEB-014 | Publish Confirmation | Supervisor, Manager | Branch | Confirm and execute publish | `schedules.publish` | 1 |
| WEB-015 | Shift Detail / Edit | Supervisor | Branch | Edit a single shift | `shifts.update` | 1 |
| WEB-016 | Shift Assignment Panel | Supervisor | Branch | Assign/remove/reassign employees on a shift | `assignments.create/update/delete` | 1 |
| WEB-017 | Manager Dashboard | Manager | Org | Org-wide operational overview | Composite (read-only across domains) | 1 (schedule/employee widgets) + 2 (attendance/task widgets deferred) |
| WEB-018 | Supervisor Dashboard | Supervisor | Branch | Branch-scoped "today" overview | Composite | 1 + 2 |
| WEB-019 | Attendance Records | Manager, Supervisor | Branch/Org | Browse attendance | *(none seeded)* | 2 |
| WEB-020 | Attendance Correction Review | Manager | Org | Approve/reject corrections | *(none seeded)* | 2 |
| WEB-021 | Leave Request Review | Manager | Org | Approve/reject leave | *(none seeded)* | 2 |
| WEB-022 | Task Management Console | Manager, Supervisor | Branch/Org | Create/track/verify tasks | *(none seeded)* | 2 |
| WEB-023 | Announcement Composer & List | Manager, Supervisor | Branch/Org | Compose, publish, manage announcements | *(none seeded)* | 2 |
| WEB-024 | Reports & Analytics | Manager, Supervisor | Branch/Org | Operational reporting | *(none — no table)* | 3, future |
| WEB-025 | Audit & Security Log | Manager | Org | Review immutable audit/security history | *(none seeded)* | 2 |
| WEB-026 | Supervisor "My Branch" Hub | Supervisor | Branch | Consolidated branch operations entry point | Composite | 1 + 2 |

## G.3 Mobile

| ID | Name | Primary role | Scope | Purpose | Permission | Tier |
|---|---|---|---|---|---|---|
| MOBILE-001 | Home / Today | Supervisor, Staff | Branch/Self | Role-adaptive daily overview | Composite | 1 + 2 |
| MOBILE-002 | My Schedule | Staff | Self | View own upcoming/past shifts | `schedules.read` | 1 |
| MOBILE-003 | Branch Schedule (view/light edit) | Supervisor | Branch | On-the-go schedule visibility, minor edits | `schedules.read/update` | 1 |
| MOBILE-004 | Attendance Recording | Supervisor | Branch | Record arrivals/departures against expected employees | *(none seeded)* | 2 |
| MOBILE-005 | Attendance Correction Request | Staff | Self | Request a correction to own record | *(none seeded)* | 2 |
| MOBILE-006 | Leave Request | Staff | Self | Submit a leave request | *(none seeded)* | 2 |
| MOBILE-007 | Leave Approval | Manager, Supervisor | Branch/Org | Approve/reject leave on the go | *(none seeded)* | 2 |
| MOBILE-008 | Task Coordination | Supervisor | Branch | Create/track/verify tasks in the field | *(none seeded)* | 2 |
| MOBILE-009 | Announcements Feed | All | Self (filtered) | Read announcements, acknowledge | *(none seeded)* | 2 |
| MOBILE-010 | Operational Shift Start/End | Supervisor | Branch | "Start Operational Shift"/"End" affordance (ATT-001 §4) | *(none seeded)* | 2 |

---

# H. Screen Coverage / Backend-to-Frontend Dependency Matrix (Part 7)

| Database domain | Backend service | Authorization | Web screen(s) | Mobile screen(s) | Workflow(s) | UI status |
|---|---|---|---|---|---|---|
| organizations | `OrganizationService` | `organizations.read/update` | WEB-002 | — | WF (setup, not numbered — see WEB-001) | **Ready to build** |
| branches | `BranchService` | `branches.*` | WEB-003/004 | — | — | **Ready to build** |
| employees, employee_history | `EmployeeService` | `employees.*` | WEB-005/006/007/008 | (view-only, folded into MOBILE-003 context) | WF-003 | **Ready to build** |
| organization_memberships, roles, role_permissions, organization_member_branch_access | none | permissions exist, unconsumed | WEB-009 | — | — | **Blocked — needs a service** |
| shift_templates | none | none | *(not inventoried — folded into Schedule Builder as a future enhancement)* | — | — | Intentionally deferred, not missing |
| schedules, schedule_versions, shifts, shift_assignments | `SchedulingService` | full set | WEB-011–016 | MOBILE-002/003 | WF-004, WF-005 | **Ready to build** |
| attendance_records, attendance_corrections | none | none | WEB-019/020 | MOBILE-004/005 | WF-006, WF-007 | **Blocked — needs a service** |
| leave_requests | none | none | WEB-021 | MOBILE-006/007 | WF-008 | **Blocked — needs a service, and a product spec** |
| tasks, task_assignments, task_history | none | none | WEB-022 | MOBILE-008 | WF-009 | **Blocked — needs a service** |
| announcements, announcement_acknowledgements | none | none | WEB-023 | MOBILE-009 | WF-010 | **Blocked — needs a service** |
| notifications, notification_preferences, notification_delivery_attempts | none | none | SHARED-008/009 | SHARED-008/009 | — | **Blocked — needs a service** |
| audit_logs, security_events | none | none | WEB-025 | — | — | **Blocked — needs a service (read-only)** |
| (no table) departments | — | — | not designed | — | — | **Future — no schema** |
| (no table) subscriptions/billing | — | — | not designed | — | — | **Future — no schema** |
| (no table) reports/analytics | — | — | WEB-024 (placeholder only) | — | — | **Future — no schema** |

Domains with intentionally no dedicated screen: `employee_history` (surfaced as a tab within WEB-006, not standalone — it's a derived audit trail), `schedule_versions` (surfaced as a tab within WEB-013), `task_history` (would surface within a future task detail screen, not standalone), `notification_delivery_attempts` (internal delivery diagnostics, no product reason to expose to any of the three MVP roles), `audit_logs`/`security_events` (one consolidated read-only screen, WEB-025, not one per table — they serve the same "what happened and who did it" purpose).

---

# I. Web vs. Mobile Mapping (Part 10)

| Workflow/capability | Web | Mobile | Rationale |
|---|:---:|:---:|---|
| Organization/branch administration | ✅ | — | Low frequency, high information density, keyboard/mouse-appropriate forms |
| Employee directory & profile management | ✅ | 🔸 view | Bulk browsing/filtering/tables per UI-006, better on web; a Supervisor still benefits from a quick lookup on the floor |
| Schedule building (multi-shift, multi-employee) | ✅ | 🔸 light edit | UI-002 §8/§15: web prioritizes "large information views, multi-step management workflows" |
| Personal schedule viewing | ✅ secondary | ✅ primary | Staff's single most frequent need; mobile-first per UI-002 §6/§9 |
| Attendance recording | 🔸 | ✅ primary | Happens on the shop floor, not at a desk (ATT-001's entire premise) |
| Attendance correction request | 🔸 | ✅ primary | Staff-initiated, from wherever they are |
| Leave request submission | 🔸 | ✅ primary | Staff-initiated, low friction expected |
| Leave/attendance approval | 🔸 | ✅ | Manager/Supervisor need to act quickly regardless of location; both platforms genuinely needed |
| Task coordination | 🔸 | ✅ primary | Explicitly a shop-floor, verbal-coordination-plus-quick-logging workflow (TASK-001 §2) |
| Announcement composition | ✅ primary | 🔸 | Longer-form content, attachments — better suited to web; still possible on mobile for urgent notices |
| Announcement reading, acknowledgement | ✅ | ✅ | Both, equally primary — this is pure consumption |
| Notifications | ✅ | ✅ primary | Mobile push is the higher-value channel; web still needs an inbox |
| Reports/analytics (future) | ✅ | — | Data density and export workflows are desktop-appropriate |
| Member/role administration | ✅ | — | Infrequent, high-consequence, benefits from full-width review before committing |
| Security/audit review | ✅ | — | Same reasoning as reports |

This validates the hypothesis structure the task proposed (web = management/scheduling/admin/bulk/tables; mobile = employee schedule/attendance/tasks/notifications/quick supervisor actions) against the actual ShiftOS domain model, with one correction: **attendance and tasks are not "mobile because employee self-service" — they're mobile because they're Supervisor shop-floor tools.** Staff has almost no mobile-primary workflow beyond My Schedule and Announcements, which is a direct, faithful consequence of the supervisor-managed-attendance/task philosophy (§C.3), not an oversight.

---

# J. State Requirements (Part 11)

Applying UI-004 (state categories)/UI-008 (empty)/UI-009 (error) to the screens that actually need each state — not a generic checklist per screen.

| State | Where it matters most | Notes |
|---|---|---|
| Initial loading | Every data screen | Skeleton, not spinner-only, per general UI-004 server-state guidance |
| Empty (first-time) | WEB-005 (no employees), WEB-011 (no schedules), MOBILE-009 (no announcements) | Exact copy patterns already specified in UI-008 §4 |
| Empty (filtered/search) | WEB-005, WEB-011, WEB-019 | "No employees match these filters" pattern (UI-008 §7) |
| No permission | Any screen reachable by direct link but not authorized (e.g., Staff navigating to WEB-009 URL) | UI-008 §8 pattern; must render this, never a raw 403 or blank page |
| Not found | WEB-006/WEB-015 (deep link to an archived/deleted record) | Distinct from "no permission" — different message |
| Validation error | WEB-007 (employee form), WEB-012 (schedule/shift forms), MOBILE-006 (leave form) | Inline, field-adjacent, per UI-009 §5 |
| Conflict | WEB-012 (duplicate branch+period schedule — this is a *real, already-implemented* server rejection, not hypothetical), WEB-016 (duplicate shift assignment) | UI-009 §9 explicitly anticipates this category |
| Server/network error | All screens with a mutation | UI-009 §7/§8, generic safe message, retry where appropriate |
| Pending approval | WEB-008 (Supervisor-requested archive), WEB-020/MOBILE-007 (leave/attendance approval), any **Request**-valued permission (§C.3) | A distinct visual state from both "allowed" and "denied" — this is a real permission outcome, not an error |
| Stale/concurrent update | WEB-012 (two Supervisors editing the same draft schedule) | Not yet backed by optimistic-locking UX design; flagged as an open question (§K) — the backend has version increments (M1/M2 remediation restored `tasks`/`attendance_records` optimistic-locking columns per GOV-003 DEC-031) but no documented conflict-resolution UI pattern exists yet beyond `RT-005 Conflict Resolution` at a general architecture level |
| Archived/deleted entity | WEB-006 (archived employee), WEB-004 (archived branch) | Read-only presentation, not identical to active-record presentation |
| Offline | MOBILE-004 (attendance recording in a low-connectivity stockroom/back-of-house) | UI-012 explicitly scopes offline support to selective actions; attendance recording is exactly the kind of action UI-012 §6 says *should* require connectivity ("actions requiring validation should require connectivity... permission changes, critical updates") — **recommendation: do not build offline attendance recording for MVP**, despite it being the most obvious offline candidate, because UI-012's own principle argues against it for exactly this action type. This is called out because it will be a tempting scope addition later. |

States deliberately not applied everywhere: "partial data" (no screen in this inventory has a natural partial-load shape beyond standard pagination) and "offline" beyond MOBILE-004 (per UI-012 §16, MVP offline scope is "installable, fast, offline-aware app shell," not per-workflow offline writes).

---

# K. Confirmed / Assumed / Open (Part 13)

## Confirmed decisions (explicit in repository/docs/architecture)

- Three MVP roles: Manager, Supervisor, Staff; role-based, permission-matrix-driven authorization (DEC-024).
- Organization membership and employee record are separate concepts; an org-wide admin never needs an employee record (DEC-016, DEC-032).
- Organization access is invitation-only (DEC-017).
- Attendance is exclusively supervisor-recorded; employees never self-clock (ATT-001).
- Employees never interact with the task system in-app; tasks are Supervisor-only (TASK-001).
- Branch isolation: Manager = org-wide, Supervisor/Staff = explicit grants (PER-018/DEC-032, implemented and tested).
- Scheduling: 3-state `draft/published/archived` schema (not the 7-state SCH-002 vision — already documented as a known gap in API-012).
- Publishing preserves history via `schedule_versions`; never destructively overwritten.
- `apps/web` = React + Vite, `apps/mobile` = Expo/React Native — already chosen, not to be revisited by this document.
- 25 live permissions, all in organization/branch/employee/scheduling domains only.

## Assumptions (inferred, not explicitly decided)

- That the "future Admin" role and Departments/Billing should be excluded from MVP screen design (inferred from Tier 3/no-schema status + GOV-003 DEC-012 "will not become a full HR replacement during MVP" + DEC-027's operational/administrative/platform-administration separation — reasonable but not a direct statement "exclude these from the MVP screen inventory").
- That Manager Dashboard (WEB-017) and Supervisor Dashboard (WEB-018) should be two separate screens rather than one conditional screen — inferred from the genuinely different underlying queries (§E), not stated anywhere as a UI requirement.
- That an organization switcher should be a low-emphasis profile-menu control rather than persistent chrome (§E) — a design judgment applying PER-019 Rule 2's "single organization" MVP expectation, not a stated UI decision.
- That attendance recording should not support offline writes for MVP (§J) — derived from applying UI-012 §6's own stated principle to a specific screen; UI-012 does not name attendance recording directly.

## Open questions (must be resolved before UI implementation of the affected screens)

1. **Leave Requests has no product/permission specification** — only a table and repository. Who can request, who approves, what states, what audit requirements? Cannot design WEB-021/MOBILE-006/007 beyond a generic approval-pattern placeholder until this exists.
2. **Member/role administration (WEB-009) has permissions but no service** — is building `packages/services`'s missing role/membership management in scope for the *next* backend milestone, or does the frontend need a workaround (e.g., direct-to-database admin tooling) in the interim? This document assumes it should get a proper service, not a workaround, but that's a scheduling decision outside this document's authority.
3. **Concurrent-edit conflict handling for schedules** (§J "stale/concurrent update") has no documented UI resolution pattern beyond the general `RT-005 Conflict Resolution` architecture doc, which this document did not fully review (out of the FD-1–5 scope boundary — it's a realtime/sync architecture doc, not a product/permission/screen doc). Needs a design decision before WEB-012 can be built for multi-supervisor branches.
4. **Whether Reports/Analytics and Departments/Billing tables are actually planned** (roadmap item) or were speculative documentation that predates a schema-scoping decision — this document treats them as "not MVP," but cannot determine whether they're "next milestone" or "abandoned direction" from the repository alone.
5. **The systemic filename/Document-ID mismatch (§B.4)** should be triaged and fixed by the documentation owner; it did not block this document (content was read and trusted over headers) but will confuse future contributors and any tooling that indexes by Document ID.
6. **Whether the "Owner" bootstrap role and "Manager" are meant to be the same role going forward**, or whether ShiftOS intends an Owner/Manager distinction later (e.g., only one Owner per org, multiple Managers) — DEC-031/DEC-032 establish the mechanism but not the long-term product distinction.

## Future enhancements (explicitly out of MVP scope, per existing docs)

QR/NFC/biometric/geofenced attendance capture; shift bidding/open shifts/AI-assisted scheduling; recurring task templates; rich-media/multi-language announcements; global search/command palette; multi-factor authentication/SSO; regional/district organizational hierarchy; payroll integration; Shifty AI recommendations beyond guidance (DEC-014 — assistive only, never autonomous decisions).

---

# L. UI/UX Risks (Part 12)

| Severity | Risk | Detail |
|---|---|---|
| 🚫 BLOCKER | Building attendance/task/announcement/notification screens with real backend wiring before their service+permission layer exists | Would either require inventing a temporary permission model (contradicts DEC-024) or shipping unenforced UI — both explicitly prohibited by this task's own instructions and by PER-003 Principle 2 ("Server Authority") |
| ⚠️ HIGH | UI-002's Employee mobile nav includes "My Tasks," contradicting TASK-001's explicit no-employee-task-interaction rule | Already corrected in §D; must be communicated back to whoever owns UI-002 so the source doc gets fixed, not just this derivative one |
| ⚠️ HIGH | Leave Requests has a table but no product spec | Any screen built against assumptions here risks being rebuilt once the real spec lands (§K open question 1) |
| ⚠️ HIGH | Concurrent schedule editing (two Supervisors, one branch) has no resolved UX pattern | Real operational risk per Part 9's "what happens when two managers edit the same information" — data model supports versioning but not live-conflict UX |
| 🟡 MEDIUM | Permission granularity mismatch: documented matrices (e.g., 29 scheduling actions) are coarser in the live permission catalog (a handful of `schedules.*`/`shifts.*` codes) | UI should design for the documented granularity as the target shape, but must not render affordances (e.g., a distinct "Override Published Schedule" button) that map to a permission code that doesn't exist yet — verify against `packages/services` before building each such control |
| 🟡 MEDIUM | Branch/organization switcher over-design risk | Building a prominent, always-visible switcher for what will be a single-branch, single-org majority of MVP customers (ORG-001 §12 "single branch support... should not experience unnecessary complexity") adds visual noise for the common case to serve an edge case |
| 🟡 MEDIUM | Dashboard card sprawl | Both dashboards (WEB-017/018) are tempting aggregation points for every domain; UI-003 §11 explicitly warns "cards should not replace every interface element... avoid excessive card usage" — deserves an explicit content audit at design time, not organic growth |
| 🟡 MEDIUM | Tables on mobile | Employee directory, schedule lists, and attendance records are naturally tabular; UI-006 (not deeply reviewed in this pass) and UI-002 §9 both imply mobile needs a fundamentally different (card/list, not grid) presentation — flag for the design system phase, not resolved here |
| 💡 FUTURE | Global search absence may become a real gap once record volumes grow past a few hundred employees/schedules per org | Correctly deferred per UI-002 §14, revisit post-MVP |

---

# M. Backend Dependencies Requiring Follow-Up (cross-reference of §H "Blocked" rows)

For a future backend milestone (outside this document's scope to schedule or authorize): a `packages/services`/`packages/api` layer for Attendance, Leave, Tasks, Announcements, Notifications, and Audit/Security review, each requiring its own seeded permission codes (following the exact `chk_permissions_code_format` convention already established — `attendance.record`, `attendance.correct`, `attendance.approve`, `leave.request`, `leave.approve`, `tasks.create`, `tasks.complete`, `announcements.publish`, etc.) and its own domain service mirroring the `SchedulingService` pattern (permission check → branch check → business rule → repository call → safe result). A membership/role-administration service to actually consume the three already-seeded `org.*.manage` permissions. This document does not propose the exact shape of that milestone — only that the frontend blueprint above cannot be fully realized without it.

---

# N. MVP Prioritization (Part 14)

## P0 — required for first usable product (all Tier 1, backend-ready today)

**Screens**: SHARED-001–007, SHARED-010, WEB-001–018, WEB-026, MOBILE-001–003.
**Workflows**: WF-001 through WF-005, plus password reset/session management.

This alone delivers a coherent, real, backend-connected experience: an organization can be created, staffed, organized into branches, and scheduled, and every employee can see their own schedule — without needing any Tier 2 domain.

## P1 — important shortly after MVP (Tier 2, needs a backend milestone first)

**Screens**: WEB-019–023, WEB-025, MOBILE-004–010, SHARED-008/009.
**Workflows**: WF-006 through WF-010.

This is the operational heart of "workforce operations platform" (DEC-007) — attendance, tasks, announcements — but is explicitly gated on backend work not yet done. Recommend using the P0 period to finalize the Leave Requests spec (§K) and resolve the concurrent-editing question (§K) so P1 doesn't repeat P0's "spec while building" pattern.

## P2 — later

Member/role administration UI (WEB-009/010) once its service exists; richer dashboard analytics within existing Tier 1 domains (e.g., schedule coverage visualizations) that don't require new tables.

## P3 — future/optional

Reports/Analytics (WEB-024), Departments, Billing/Subscription, future Admin role, global search, offline attendance, AI-assisted features beyond Shifty's documented assistive scope.

---

# O. Final Readiness Assessment for FD-6 (Design System)

**Conditional go.** The role model, permission model, information architecture, and screen/workflow inventory above are grounded in the real backend and are stable enough to design against for the P0 scope (§N) — a design system and actual screen designs can proceed for SHARED-001–010, WEB-001–018/026, and MOBILE-001–003 immediately.

Do **not** begin final visual/interaction design for the P1 screens (attendance, tasks, announcements, notifications) until: (a) the Leave Requests product spec exists (§K #1), (b) a decision is made on member/role-admin service scope (§K #2), and (c) the concurrent-schedule-editing pattern is resolved (§K #3) — designing those screens now risks rework once their backend contracts are defined, the same risk this entire audit was commissioned to avoid.

The existing `docs/frontend/UI-001` through `UI-012` design-system-adjacent documents remain the correct foundation for FD-6; this document's one correction to them (§D, removing "My Tasks" from Employee navigation) should be reflected back into `UI-002-NAVIGATION.md` by whoever owns that document, since FD-6 will presumably build on UI-002 directly.

---

# P. Self-Audit (Part 18)

- [x] Every actual role considered (Manager, Supervisor, Staff, future Admin, bootstrap Owner)
- [x] Every actual permission mapped (§C.3, all 25 live codes plus documented-not-yet-live matrices, tiered explicitly)
- [x] Organization scope considered (§E, §C.4)
- [x] Branch scope considered (§E, §C.3 branch isolation rows)
- [x] Employee scope considered (§C.2, personal-data gating throughout)
- [x] No-employee-record case addressed explicitly, not silently (§C.2)
- [x] Every major domain evaluated for UI relevance, including domains with intentionally no screen (§H)
- [x] Every required screen has a stable ID (§G, 46 total)
- [x] Every major workflow has a full specification or is captured in the summary table (§F)
- [x] Web/mobile responsibilities separated with rationale, not just hypothesis restated (§I)
- [x] Backend dependencies identified per screen (§H, §M)
- [x] Permission requirements identified per screen (§G)
- [x] Error/empty/loading/conflict/offline states identified where they actually apply, not generically (§J)
- [x] MVP priorities assigned, tied to backend readiness not arbitrary judgment (§N)
- [x] Confirmed decisions separated from assumptions (§K)
- [x] Open questions explicitly identified, not resolved by invention (§K)
- [x] No undocumented feature silently treated as confirmed (Tier 2/3 domains repeatedly flagged rather than designed as if real)
- [x] No database/backend changes made
- [x] No UI implementation performed (no components, no pages, no code)
- [x] Existing ShiftOS decisions not silently contradicted — two conflicts found (UI-002 vs. TASK-001/PER-005; UI-002 "Organizations"/"Workforce Analytics" vs. Tier 3 status) and corrected explicitly, not silently (§D)

---

# Q. Related Specifications

`docs/frontend/UI-001` through `UI-012`; `docs/roles-permissions/PER-001` through `PER-019`; `docs/governance/GOV-003-DECISION-LOG.md`; `docs/organization/ORG-001/002/004`; `docs/employee/EMP-001/002/003`; `docs/attendance/ATT-001` through `ATT-009`; `docs/task-management/TASK-001` through `TASK-006`; `docs/communication/COM-001` through `COM-005`; `docs/notifications/NOTIF-001` through `NOTIF-007`; `docs/shift/SHIFT-001`; `docs/scheduling/SCH-001` through `SCH-012`; `docs/database/DB-005-TABLES.md`; `docs/backend/API-011/012/013`; `docs/security/SEC-005-TENANT-ISOLATION.md`.

---

# R. Lovable Integration Decision (2026-08-10)

A Lovable-generated prototype (`shift-app-hero/`, cloned from `github.com/Favstar1/shift-app-hero`) was integrated as the visual/UX source of truth for `apps/web`, per a Milestone 1 integration pass. Recorded here per this doc's own precedent of separating confirmed decisions from assumptions (§K).

**Architecture decision — Option A+C hybrid, not a merge.** `shift-app-hero` is a TanStack Start app (its own file-based router, own Vite server, shadcn/Radix components, Tailwind v4 OKLCH tokens) — structurally incompatible to merge with `apps/web`'s React Router + `packages/ui` stack. Every screen was re-implemented as a real `apps/web/src/pages/**` route built from `packages/ui` primitives, using the prototype only as a visual/IA reference. `packages/ui/src/tokens.ts` gained `brand.soft`/`brand.deep`/`success.soft`/`warning.soft` reconciled from the prototype's OKLCH values (same warm-orange family already in use — no second palette), plus five new primitives (`Panel`, `StatCard`, `Pill`, `Pagination`, `QuickAction`) modeled on the prototype's dashboard widgets. No shadcn/Radix dependency was introduced into `apps/web`.

**Org-bootstrap RPC finding.** `create_organization_with_owner()` (migration 023) depends on `auth.uid()`, which only resolves through Supabase's PostgREST layer, not through this backend's raw `pg` pool (`packages/database`'s `DatabaseClient` connects directly via `DATABASE_URL`, confirmed by `RolePermissionRepository`'s own doc comment). `packages/api`'s `RpcRegistry.execute()` also unconditionally requires an already-resolved organization membership, which cannot exist yet at bootstrap time. The already-implemented, correct pattern (found in `OrganizationSetupPage.tsx`, predating this pass) is to call `supabase.rpc('create_organization_with_owner', ...)` directly from the browser's anon-key client — the same class of exception already documented in `lib/supabase.ts` for self-profile management. This Milestone 1 pass extends that same onboarding flow (Branch → Supervisor → Departments → Finish) rather than routing organization creation through `packages/api`.

**Self-service Sign Up finding.** `packages/auth`'s `SupabaseAuthProvider` is server-side only (used for service-role invite emails) and was never meant to carry self-service sign-up. `SignUpPage.tsx` (predating this pass) already calls `supabase.auth.signUp()` directly from the browser — correct, and left unchanged.

**Deferred to Milestone 2** (see the gap report delivered alongside this pass): the scheduling UI reskin, the invitation write-path (`MembershipService` is read-only by design today), and organization-wide settings beyond profile/photo.
