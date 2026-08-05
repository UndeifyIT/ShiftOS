# ShiftOS Naming Conventions

**Document ID:** GOV-010

**Title:** Naming Conventions

**Version:** 1.0.0

**Status:** Approved

**Classification:** Governance

**Owner:** ShiftOS Product Team

---

# Purpose

This document defines the official naming conventions used throughout the ShiftOS project.

Consistent naming improves:

- Readability
- Maintainability
- Discoverability
- AI-assisted code generation
- Team collaboration
- Documentation quality
- Long-term scalability

All contributors, whether human or AI, must follow these conventions unless an approved exception exists.

---

# General Principles

Every name should be:

- Descriptive
- Consistent
- Predictable
- Unambiguous
- Easy to search
- Easy to pronounce
- Free from unnecessary abbreviations

Names should describe **what something is**, not **how it is implemented**.

Prefer clarity over brevity.

---

# Documentation Naming

All documentation files use:

```
UPPERCASE-WORDS.md
```

Examples:

```
VISION.md
SHIFT-DEFINITION.md
ATTENDANCE-RULES.md
EMPLOYEE-LIFECYCLE.md
```

Ordered documents should include a numeric prefix.

Examples:

```
01-VISION.md
02-MISSION.md
03-PROBLEM-STATEMENT.md
```

Avoid:

```
vision.md
Vision.md
myDoc.md
temp.md
new.md
```

---

# Folder Naming

Folders use:

```
kebab-case
```

Examples:

```
product-foundation
employee-domain
security
backend
frontend
screen-specifications
```

Avoid spaces.

Avoid underscores.

---

# Database Naming

All database objects use:

```
snake_case
```

Examples:

```
employees
organizations
branches
attendance_records
shift_templates
notification_preferences
```

Never use PascalCase.

Never use camelCase.

---

# Table Naming

Tables should use plural nouns.

Examples:

```
employees
organizations
branches
tasks
announcements
notifications
attendance_records
audit_logs
```

Avoid:

```
employee
tbl_employee
employeeTable
```

---

# Column Naming

Columns use:

```
snake_case
```

Examples:

```
employee_id
organization_id
branch_id
created_at
updated_at
deleted_at
clock_in_time
clock_out_time
employment_status
```

---

# Primary Keys

Every table uses:

```
id
```

Never:

```
employee_id
branch_pk
organization_pk
```

Example:

```
employees
---------
id
first_name
last_name
```

---

# Foreign Keys

Foreign keys follow:

```
entity_id
```

Examples:

```
organization_id
branch_id
employee_id
shift_id
task_id
announcement_id
```

---

# Join Tables

Join tables combine both entities alphabetically.

Examples:

```
employee_tasks
employee_skills
role_permissions
```

Avoid:

```
tasks_employees
employeeTask
mapping_table
```

---

# Timestamp Columns

Every business table should include:

```
created_at
updated_at
```

Where appropriate:

```
deleted_at
published_at
completed_at
cancelled_at
verified_at
```

Store all timestamps in UTC.

---

# Boolean Columns

Booleans should begin with:

```
is_
has_
can_
should_
```

Examples:

```
is_active
is_verified
has_acknowledged
can_edit
should_notify
```

Avoid:

```
active
verified
notify
```

---

# Enum Naming

Enum types use:

```
snake_case
```

Examples:

```
attendance_status
shift_status
employment_status
notification_priority
```

Enum values use lowercase.

Examples:

```
pending
published
completed
cancelled
```

---

# Constraint Naming

Use descriptive prefixes.

Primary Key

```
pk_employees
```

Foreign Key

```
fk_shifts_employee
```

Unique

```
uq_employee_email
```

Check

```
chk_shift_times
```

---

# Index Naming

Indexes begin with:

```
idx_
```

Examples:

```
idx_employee_email
idx_shift_date
idx_attendance_employee
```

---

# API Naming

Endpoints use:

```
kebab-case
```

Examples:

```
/employees
/attendance
/shift-templates
/payroll-export
```

Avoid:

```
/getEmployees
/CreateEmployee
```

---

# RPC Function Naming

RPC functions begin with an action.

Examples:

```
create_shift
publish_shift
clock_in
clock_out
assign_employee
cancel_shift
```

Avoid vague names.

```
process()
run()
execute()
```

---

# Event Naming

Events use the format:

```
entity.action
```

Examples:

```
shift.created
shift.published
shift.cancelled
attendance.clocked_in
attendance.clocked_out
employee.invited
task.completed
```

---

# React Components

React Components use:

```
PascalCase
```

Examples:

```
EmployeeCard
ShiftCalendar
AttendanceTable
TaskList
NotificationPanel
```

Component filenames match component names.

---

# Hooks

Hooks begin with:

```
use
```

Examples:

```
useAuth
useAttendance
useCurrentUser
usePermissions
useRealtime
```

---

# Context Providers

Contexts end with:

```
Context
```

Providers end with:

```
Provider
```

Examples:

```
AuthContext
ThemeContext
NotificationContext

AuthProvider
ThemeProvider
```

---

# Utility Functions

Utilities should describe their purpose.

Examples:

```
formatDate()
calculateShiftHours()
validateAttendance()
generateEmployeeCode()
```

Avoid generic names.

```
helper()
utils()
process()
```

---

# Environment Variables

Environment variables use:

```
UPPER_SNAKE_CASE
```

Examples:

```
SUPABASE_URL
SUPABASE_ANON_KEY
APP_ENV
API_BASE_URL
```

---

# CSS Class Naming

Where custom CSS is required, use:

```
kebab-case
```

Examples:

```
employee-card
shift-calendar
attendance-table
```

---

# Icons

Icons should follow:

```
EntityActionIcon
```

Examples:

```
AddEmployeeIcon
DeleteShiftIcon
ClockInIcon
NotificationIcon
```

---

# Image Assets

Images use:

```
kebab-case
```

Examples:

```
empty-state.png
dashboard-banner.webp
employee-avatar-placeholder.svg
```

---

# Git Branch Naming

Branches use:

```
type/description
```

Examples:

```
feature/employee-management
feature/attendance
fix/clock-in-validation
docs/security
refactor/shift-service
```

---

# Commit Messages

Commits follow the Conventional Commits specification.

Examples:

```
feat: add employee invitations

fix: correct attendance validation

docs: update product vision

refactor: simplify shift workflow

test: add attendance integration tests

chore: update dependencies
```

---

# Test Naming

Test files should match the feature.

Examples:

```
employee.test.ts
attendance.test.ts
shift-service.test.ts
permissions.test.ts
```

Test names should describe observable behaviour.

Example:

```
should prevent an employee from clocking in twice
```

---

# Specification IDs

Every specification follows a consistent identifier.

Examples:

```
SHIFT-001
ATT-003
SEC-006
DB-009
API-004
UI-011
```

Identifiers are permanent and should never be reused.

If a specification is removed, its identifier remains retired.

---

# Reserved Terminology

Always use the official terminology defined in:

- GOV-005 — Terminology Standards
- GOV-004 — Glossary

Do not invent alternative names for existing concepts.

---

# AI Development Standards

All AI-generated code, documentation and specifications must comply with this document.

If generated content violates these conventions, it must be corrected before being accepted into the codebase.

Consistency is considered a quality requirement, not an optional improvement.

---

# Governance

These naming conventions are mandatory across the entire ShiftOS project.

Any proposed deviation must:

1. Be documented.
2. Be justified.
3. Be approved.
4. Be recorded in the Decision Log.
5. Update this document if adopted.

Naming consistency is a long-term investment in maintainability and should never be sacrificed for short-term convenience.