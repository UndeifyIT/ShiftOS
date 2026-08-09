---

## DEC-007 — ShiftOS Will Be a Workforce Operations Platform

**Date:** 2026-07-12

**Status:** Approved

**Category:** Product Strategy

### Decision

ShiftOS will be positioned as a workforce operations platform rather than a traditional HR management system.

The platform will focus on helping businesses manage daily workforce operations including:

- Scheduling.
- Attendance.
- Tasks.
- Communication.
- Operational visibility.

### Rationale

Traditional HR systems primarily focus on employee records, payroll and administration.

Shift-based businesses experience different operational problems:

- Managing employee schedules.
- Coordinating daily work.
- Tracking attendance.
- Communicating changes.
- Maintaining operational control.

ShiftOS creates stronger differentiation by solving these daily operational problems.

### Alternatives Considered

- Building a traditional HR management system.
- Building only a scheduling application.
- Building a payroll-focused platform.

### Impact

Product development priorities will focus on workforce operations before expanding into broader HR capabilities.

### Related Specifications

- PF-001
- PF-003
- PF-004
- PF-010
- MVP-001

---

## DEC-008 — Initial Target Market Will Be Shift-Based SMEs

**Date:** 2026-07-12

**Status:** Approved

**Category:** Product Strategy / Business

### Decision

ShiftOS will initially target small and medium-sized businesses that rely heavily on shift workers.

Priority industries include:

- Restaurants.
- Retail.
- Hospitality.
- Warehouses.
- Pharmacies.

### Rationale

These businesses experience significant workforce coordination problems but often lack suitable workforce management software.

### Alternatives Considered

- Targeting large enterprises first.
- Targeting all businesses with employees.
- Building a general HR product.

### Impact

MVP features, onboarding and pricing will prioritize growing shift-based businesses.

### Related Specifications

- PF-007
- PF-008
- PF-009
- MVP-001

---

## DEC-009 — ShiftOS Will Support Three Primary User Roles

**Date:** 2026-07-12

**Status:** Approved

**Category:** Product / UX

### Decision

The MVP will support three primary user roles:

- Manager.
- Supervisor.
- Employee.

### Rationale

Different workforce users have different responsibilities and require different experiences.

Managers need oversight.

Supervisors need operational tools.

Employees need simple access to schedules, tasks and communication.

### Alternatives Considered

- One generic user experience.
- Highly customizable roles from MVP.

### Impact

Permissions, navigation and UI experiences will be designed around these three primary roles.

### Related Specifications

- PER-001
- PER-005
- PF-009
- NAV-001

---

## DEC-010 — ShiftOS Will Prioritize Simplicity Over Feature Quantity

**Date:** 2026-07-12

**Status:** Approved

**Category:** Product / UX

### Decision

ShiftOS will prioritize simple, efficient workflows over maximizing the number of features.

### Rationale

The primary users operate in busy environments where speed and clarity are more valuable than complex functionality.

### Alternatives Considered

- Competing through feature volume.
- Building enterprise-level complexity immediately.

### Impact

Every feature must demonstrate clear user value and minimize unnecessary complexity.

### Related Specifications

- PF-005
- PF-006
- UI-001

---

## DEC-011 — ShiftOS Will Position Between Manual Tools and Enterprise Platforms

**Date:** 2026-07-12

**Status:** Approved

**Category:** Product Strategy

### Decision

ShiftOS will position itself between:

- Manual workforce processes.
- Complex enterprise workforce platforms.

### Rationale

Manual tools lack automation and visibility.

Enterprise solutions are often too expensive and complex for growing businesses.

ShiftOS aims to provide enterprise-quality operational capability with simpler adoption.

### Alternatives Considered

- Competing only with low-cost tools.
- Competing directly with enterprise workforce suites.

### Impact

Product decisions should optimize for accessibility, simplicity and operational value.

### Related Specifications

- PF-010
- PF-004

---

## DEC-012 — ShiftOS Will Not Become a Full HR Replacement During MVP

**Date:** 2026-07-12

**Status:** Approved

**Category:** Product Strategy

### Decision

ShiftOS will not attempt to replace all HR functions during MVP.

### Rationale

The core opportunity is workforce operations.

Expanding into every HR capability would increase complexity and weaken product focus.

### Alternatives Considered

- Building a complete HR suite.
- Including payroll, recruitment and performance management immediately.

### Impact

Future HR capabilities may be added through integrations or later roadmap phases.

### Related Specifications

- PF-007
- PF-010
- MVP-005

---

## DEC-013 — Initial Pricing Will Use Subscription Tiers

**Date:** 2026-07-12

**Status:** Proposed

**Category:** Business / Pricing

### Decision

ShiftOS will initially explore organization-based subscription tiers.

Proposed pricing:

Starter:
₦15,000/month

Growth:
₦45,000/month

Business:
₦100,000/month

Enterprise:
Custom pricing

### Rationale

Businesses prefer predictable costs, while ShiftOS needs pricing that scales with customer value.

### Alternatives Considered

- Pure per employee pricing.
- Unlimited flat pricing.
- Feature-only pricing.

### Impact

Pricing will require validation with real customers before becoming permanent.

### Related Specifications

- PF-012

---

## DEC-014 — Shifty AI Will Assist Rather Than Replace Human Decisions

**Date:** 2026-07-12

**Status:** Approved

**Category:** AI / Product

### Decision

Shifty will provide:

- Guidance.
- Recommendations.
- Suggestions.
- Explanations.

Shifty will not automatically make irreversible operational decisions.

### Rationale

Workforce decisions require human responsibility and context.

### Alternatives Considered

- Fully autonomous workforce management.
- AI-controlled scheduling decisions.

### Impact

Future AI features must maintain human control.

### Related Specifications

- SFT-001
- SFT-009

---

## DEC-015 — Product Documentation Will Drive Development

**Date:** 2026-07-12

**Status:** Approved

**Category:** Governance

### Decision

Major features must be documented before implementation.

### Rationale

A specification-driven approach reduces rework, improves consistency and supports scalable development.

### Alternatives Considered

- Building directly from conversations.
- Designing while coding.

### Impact

The Master Specification remains the source of truth for product development.

### Related Specifications

- GOV-001
- GOV-002

---

## DEC-016 — User Identity Will Be Separate From Employee Records

**Date:** 2026-07-12

**Status:** Approved

**Category:** Architecture / Database

### Decision

ShiftOS will maintain a strict separation between user identity data and employee workforce data.

A user account represents access to the ShiftOS platform.

An employee record represents the person's relationship with an organization.

### Rationale

Combining identity and employee records creates long-term problems:

- Not every employee requires platform access.
- Not every platform user is an employee.
- Authentication data requires different security controls.
- Employee history must remain available after access removal.

Separating these domains improves:

- Security.
- Reporting.
- Scalability.
- Data integrity.

### Alternatives Considered

- Store users and employees in one table.
- Automatically create accounts for every employee.

### Impact

ShiftOS will maintain separate models for:

- Users.
- Profiles.
- Employees.
- Organization memberships.

### Related Specifications

- USR-001
- USR-002
- EMP-001
- ORG-002

---

## DEC-017 — Organization Access Will Be Invitation-Based

**Date:** 2026-07-12

**Status:** Approved

**Category:** Security / Product

### Decision

Users must receive an organization invitation before gaining access to an organization's ShiftOS environment.

Users cannot freely join organizations.

### Rationale

Supermarkets and multi-branch businesses require controlled access management.

Invitation-based access provides:

- Organization ownership of access decisions.
- Better tenant security.
- Clear onboarding workflows.
- Reduced unauthorized access risk.

### Alternatives Considered

- Public organization registration.
- Employee self-registration.
- Organization access codes.

### Impact

Organization membership creation must originate from approved invitation workflows.

### Related Specifications

- SEC-003
- ORG-002
- PER-001

---

## DEC-018 — Authentication, Authorization And Session Management Are Separate Domains

**Date:** 2026-07-12

**Status:** Approved

**Category:** Security / Architecture

### Decision

ShiftOS will treat authentication, authorization and session management as separate security domains.

Authentication determines identity.

Authorization determines permissions.

Sessions maintain authenticated access.

### Rationale

Separating these responsibilities improves:

- Security.
- Maintainability.
- Scalability.
- Permission management.

A valid login should not automatically determine business access.

### Alternatives Considered

- Single combined access system.
- Client-only permission checks.

### Impact

Security architecture must maintain separate systems for:

- Identity verification.
- Permission enforcement.
- Session lifecycle.

### Related Specifications

- SEC-001
- SEC-006
- PER-001
- PER-002

---

## DEC-019 — Email Verification Will Be Required For Full Account Access

**Date:** 2026-07-12

**Status:** Approved

**Category:** Security

### Decision

ShiftOS users must verify their email address before receiving full account access.

### Rationale

Email verification provides:

- More reliable communication.
- Safer account recovery.
- Reduced fake accounts.
- Better trust in user identity.

### Alternatives Considered

- Allow access without verification.
- Verify only administrators.

### Impact

User onboarding must include email verification handling.

### Related Specifications

- SEC-004
- USR-001

---

## DEC-020 — Password Recovery Will Be Self-Service

**Date:** 2026-07-12

**Status:** Approved

**Category:** Security / Operations

### Decision

Users will recover account access through secure password reset flows.

Managers and administrators cannot view or create passwords for other users.

### Rationale

Shared password recovery creates:

- Security risks.
- Poor accountability.
- Weak audit trails.

Self-service recovery provides safer account ownership.

### Alternatives Considered

- Manager-controlled password resets.
- Temporary shared passwords.
- Support-created passwords.

### Impact

ShiftOS must provide secure password reset workflows.

### Related Specifications

- SEC-002
- SEC-005

---

## DEC-021 — Account Status Will Be Separate From Employment Status

**Date:** 2026-07-12

**Status:** Approved

**Category:** Product / Database

### Decision

ShiftOS will separate platform account status from employee employment status.

### Rationale

Real businesses require situations where:

- An employee remains in company records.
- Their platform access is removed.

Examples:

- Employee leaves the business.
- Security suspension.
- Temporary access removal.

### Alternatives Considered

- Use employment status to control login access.
- Delete users after employment ends.

### Impact

Account lifecycle and employee lifecycle must be managed independently.

### Related Specifications

- USR-003
- EMP-001

---

## DEC-022 — User Preferences Cannot Override Organization Rules

**Date:** 2026-07-12

**Status:** Approved

**Category:** Product / UX

### Decision

User preferences may customize personal experience but cannot override organization operational requirements.

### Rationale

ShiftOS supports operational businesses where consistency is required.

Examples:

- Optional notifications may be customized.
- Mandatory operational alerts cannot be disabled.

### Alternatives Considered

- Allow complete user control over all settings.
- Store operational settings as personal preferences.

### Impact

The system must separate:

- User preferences.
- Organization policies.

### Related Specifications

- USR-004
- ORG-006

---

## DEC-023 — Access Removal Must Affect Active Sessions

**Date:** 2026-07-12

**Status:** Approved

**Category:** Security / Architecture

### Decision

Changes to account status or permissions must affect active user sessions.

### Rationale

Without session enforcement:

- Removed users may continue accessing data.
- Permission changes may not take effect immediately.
- Security controls become unreliable.

### Alternatives Considered

- Wait for session expiration.
- Only validate permissions during login.

### Impact

Session management must support:

- Revocation.
- Account suspension.
- Permission updates.

### Related Specifications

- SEC-006
- USR-003
- PER-002

---

---

## DEC-024 — ShiftOS Will Use Role-Based Authorization With Explicit Permission Matrices

**Date:** 2026-07-12

**Status:** Approved

**Category:** Security / Architecture

### Decision

ShiftOS will use a role-based authorization model supported by explicit permission matrices.

The MVP roles are:

- Manager.
- Supervisor.
- Staff.

A future Admin role will exist for organization administration and reporting responsibilities.

Permissions will be defined by domain-specific permission matrices rather than hardcoded role assumptions.

### Rationale

A permission matrix approach provides:

- Clear responsibility boundaries.
- Easier future role expansion.
- Better security control.
- Improved auditability.
- Consistent authorization behavior.

Hardcoding permissions directly into features would create maintenance problems as the platform grows.

### Alternatives Considered

- Simple role checks only.
- Custom permissions for every user.
- Fully flexible enterprise RBAC from MVP.

### Impact

All protected features must reference approved permission specifications.

Authorization logic must be separated from business logic.

### Related Specifications

- PER-001
- PER-002
- PER-003
- PER-006

---

## DEC-025 — ShiftOS Will Use Organization-Level Multi-Tenancy

**Date:** 2026-07-12

**Status:** Approved

**Category:** Architecture / Database / Security

### Decision

ShiftOS will operate as a multi-tenant SaaS platform where each customer business is represented as an isolated organization.

All customer data must belong to an organization boundary.

### Rationale

Organization-based tenancy enables:

- Secure customer separation.
- Scalable SaaS architecture.
- Clear data ownership.
- Reliable billing ownership.
- Future enterprise expansion.

### Alternatives Considered

- Separate database per customer.
- Shared database without tenant isolation.
- Single-business architecture.

### Impact

All organization-owned records must maintain organization ownership.

Database design, authorization and reporting must support tenant isolation.

### Related Specifications

- ORG-002
- PER-008
- SEC-005

---

## DEC-026 — ShiftOS Will Enforce Branch-Level Operational Isolation

**Date:** 2026-07-12

**Status:** Approved

**Category:** Architecture / Operations / Security

### Decision

ShiftOS will support branch-level isolation within organizations.

Operational users will only access branch data required for their responsibilities.

### Rationale

Supermarket businesses commonly operate multiple branches with separate teams and operations.

Branch isolation prevents:

- Unauthorized workforce access.
- Incorrect operational changes.
- Data confusion between locations.

### Alternatives Considered

- Allow all users to view all branches.
- Separate organizations for each branch.

### Impact

Branch ownership must exist across operational records including:

- Employees.
- Schedules.
- Attendance.
- Tasks.
- Reports.

### Related Specifications

- ORG-004
- PER-007
- SEC-005

---

## DEC-027 — ShiftOS Will Separate Operational Ownership From Administrative Ownership

**Date:** 2026-07-12

**Status:** Approved

**Category:** Product / Architecture

### Decision

ShiftOS will separate daily operational responsibilities from organization administration responsibilities.

Managers and Supervisors manage workforce operations.

Future Admin users manage organization-level administration.

### Rationale

Daily operations and business administration require different responsibilities.

Combining them creates:

- Excessive permissions.
- Security risks.
- Confusing workflows.

### Alternatives Considered

- Give one user full system control.
- Make Managers responsible for every administrative action permanently.

### Impact

Permissions and workflows must distinguish between:

- Operational management.
- Organization administration.
- Platform administration.

### Related Specifications

- PER-001
- PER-002
- ORG-003
- BILL-001

---

## DEC-028 — ShiftOS Will Use Approval-Based Actions For Sensitive Operations

**Date:** 2026-07-12

**Status:** Approved

**Category:** Security / Operations

### Decision

Sensitive actions may require approval before execution.

Users without direct permission may submit requests instead of performing the action immediately.

### Rationale

Approval workflows provide:

- Better accountability.
- Controlled delegation.
- Reduced accidental changes.
- Clear audit history.

### Alternatives Considered

- Allow all managers to perform every action.
- Block sensitive actions completely.

### Impact

The platform must support:

- Approval requests.
- Approval decisions.
- Audit records.

### Related Specifications

- PER-003
- PER-004

---

## DEC-029 — ShiftOS Will Support Temporary Operational Takeover

**Date:** 2026-07-12

**Status:** Approved

**Category:** Operations / Authorization

### Decision

Managers may temporarily perform Supervisor operational responsibilities when required for business continuity.

Temporary takeover does not permanently change user roles.

### Rationale

Supermarkets require uninterrupted operations even when a Supervisor is unavailable.

A temporary takeover allows:

- Shift continuity.
- Attendance management.
- Task coordination.
- Operational control.

### Alternatives Considered

- Permanently promote Managers to Supervisor.
- Require administrator intervention.
- Stop operations until Supervisor availability.

### Impact

Temporary operational authority must be:

- Limited in scope.
- Time-bound.
- Fully audited.

### Related Specifications

- PER-005
- ATT-001
- SCH-001
- TSK-001

---

## DEC-030 — ShiftOS Will Maintain Immutable Security Audit History

**Date:** 2026-07-12

**Status:** Approved

**Category:** Security / Compliance

### Decision

Security-sensitive and operationally significant actions must maintain historical audit records.

Audit history must not be overwritten.

### Rationale

Auditability supports:

- Security investigations.
- Operational accountability.
- Compliance readiness.
- Customer trust.

### Alternatives Considered

- Store only current state.
- Allow modification of historical records.

### Impact

Important actions must generate audit events.

Examples:

- Permission changes.
- User invitations.
- Employee status changes.
- Attendance adjustments.
- Billing changes.

### Related Specifications

- SEC-005
- PER-004
- PER-006

---

## DEC-031 — Database Remediation: Tenant-Safe Authorization, Branch Access, and Audit Immutability

**Date:** 2026-08-09

**Status:** Approved

**Category:** Security / Architecture / Database

### Decision

Migrations 018-024 corrected six confirmed production blockers found by the ShiftOS
Enterprise Database Readiness Audit, without rewriting any historical migration
(001-017 remain immutable):

- **018** restored validation/calculation logic silently dropped by migration 017
  (tasks/attendance_records optimistic-locking version increments, attendance
  worked_minutes calculation, leave_requests post-decision immutability).
- **019** made `organization_memberships.role_id` tenant-safe via a composite
  `(role_id, organization_id)` foreign key, closing a gap that allowed a membership
  to reference another organization's role.
- **020-021** established the branch-authorization model per DEC-032 below.
- **022** added branch-scoped RLS to every table with its own `branch_id` plus
  `shift_assignments`/`task_assignments` (derived via their parent shift/task).
- **023** closed a self-service privilege-escalation path: `roles`, `role_permissions`,
  and `organization_memberships` writes now require `org.roles.manage` /
  `org.members.manage`; a trigger separately blocks a member from changing their own
  `role_id` regardless of permission level; a `create_organization_with_owner()`
  bootstrap function provides the only path to seed a new tenant's first role and
  membership now that ordinary writes are permission-gated.
- **024** made `audit_logs`/`security_events` genuinely append-only: no UPDATE/DELETE
  RLS policy exists for either table (default-deny), backed by a trigger that blocks
  mutation unconditionally, independent of RLS bypass.

All seven migrations were applied to and verified against the live Supabase project,
including transactional (rollback-safe) tests simulating cross-organization access,
branch-scoped access, self-escalation attempts, and audit tampering attempts.

### Rationale

RLS enforced organization isolation correctly but had no role/permission gate on
who could modify roles, permissions, or memberships, and no branch concept at all --
contradicting PER-018 (Approved) and SEC-004's own requirement that database access
"respect organization, branch, and role boundaries."

### Alternatives Considered

- Rewriting migrations 011/012/017 in place -- rejected: already-applied migrations
  are treated as immutable history per DB-012's migration philosophy.
- Gating access at the application layer only -- rejected: Supabase exposes tables
  directly over PostgREST, so RLS is the only enforcement boundary that actually
  exists until the application layer (packages/backend, /authorization,
  /repositories) is implemented.

### Impact

- New table `organization_member_branch_access` and `roles.grants_org_wide_branch_access`
  column (see DEC-032).
- New permission codes `org.roles.manage`, `org.members.manage`, `org.branches.manage`
  (PER-002).
- New onboarding requirement: organizations must now be created via
  `create_organization_with_owner()`, not a direct client INSERT into `organizations`.
- Application-layer authorization (packages/authorization) should call the same
  `user_has_permission()` / `user_accessible_branches()` helpers the database uses,
  rather than re-implementing the rule set, per DEC-018's separation of authorization
  from authentication.

### Related Specifications

- SEC-004, SEC-005, SEC-006, PER-002, PER-018, DB-005, DB-012

---

## DEC-032 — Branch Access Is Granted To Organization Membership, Not Derived From Employee Records

**Date:** 2026-08-09

**Status:** Approved

**Category:** Architecture / Database / Security

### Decision

Branch-level authorization (PER-018) is resolved from `organization_memberships` --
the platform-access/authorization identity -- not from `employees` -- the workforce
identity. A member's accessible branches are the union of:

1. Every branch in the organization, if their role has
   `roles.grants_org_wide_branch_access = true` (organization-wide roles, e.g. Manager).
2. Explicit grants in `organization_member_branch_access`, a member-to-branch table
   supporting multiple simultaneous branch grants per member.

An organization owner/administrator therefore never needs an `employees` row merely
to hold administrative or branch-scoped access.

### Rationale

EMP-003 and PER-018 both describe employees as having exactly one *primary* branch
for workforce purposes (scheduling, attendance), which is a different concept from
*authorization* to access branch-scoped data as an acting user. Deriving
authorization from the employee record would force every administrator to also be
modeled as an employee, and would conflate "where do you work" with "what can you
see" -- the latter must hold even for organization-wide roles with no fixed branch
and for members who access multiple branches.

### Alternatives Considered

- Deriving branch RLS scope from `employees.branch_id` directly, requiring an
  `employees.user_id` link -- rejected: forces every authorized user to have an
  employee record, and does not support multi-branch access without further schema
  changes.
- A branch-membership table keyed to `employees` instead of
  `organization_memberships` -- rejected for the same reason.

### Impact

`organization_member_branch_access` and `public.user_accessible_branches()` (021)
are the canonical branch-authorization mechanism. `employees.branch_id` remains the
workforce *primary branch* used by scheduling/attendance defaults (EMP-003) and is
not used for RLS.

### Related Specifications

- PER-018, EMP-003, DEC-016, DEC-026