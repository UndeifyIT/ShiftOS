# ShiftOS Terminology Standards

**Document ID:** GOV-005

**Title:** Terminology Standards

**Version:** 1.0.0

**Status:** Approved

**Owner:** ShiftOS Product Team

---

# Purpose

This document defines the official language used throughout ShiftOS.

Its purpose is to ensure consistency across:

- Product documentation
- UI text
- Database schema
- Backend services
- APIs
- Source code
- Test cases
- Support documentation
- Marketing material

Whenever multiple words could describe the same concept, this document specifies the preferred term.

The Glossary defines what a term means.

This document defines which term must be used.

---

# Terminology Principles

The language used throughout ShiftOS should be:

- Consistent
- Simple
- Business-friendly
- Internationally understandable
- Unambiguous
- Easy to translate
- Easy for AI tooling to interpret

---

# General Naming Rules

Always use nouns for business entities.

Examples:

✅ Employee

✅ Shift

✅ Task

❌ Staff Member

❌ Work Item

---

Use singular names when referring to entities.

Correct:

Employee

Branch

Organization

Shift

Task

Database tables may be plural depending on the database naming standard, but documentation always uses singular.

---

Avoid technical jargon when business language is sufficient.

Use:

Attendance

instead of

Presence Record

Use:

Task

instead of

Work Item

---

Prefer business language over implementation language.

Say:

Employee Profile

instead of

Employee Object

Say:

Branch

instead of

Location Node

---

# Official Product Terms

| Preferred | Avoid |
|------------|-------|
| Organization | Company |
| Organization | Business |
| Branch | Store |
| Branch | Outlet |
| Employee | Worker |
| Employee | Staff |
| Manager | Admin |
| Supervisor | Team Lead |
| Shift | Work Session |
| Attendance | Presence |
| Clock In | Check In |
| Clock Out | Check Out |
| Task | Work Item |
| Announcement | Broadcast |
| Notification | Alert |
| Dashboard | Home Screen |
| Schedule | Roster |
| Invitation | Invite |
| Settings | Configuration |
| Profile | Account Details |

---

# UI Terminology Standards

The interface should always use the same labels.

Examples:

Employees

Shifts

Attendance

Tasks

Announcements

Reports

Settings

Never create multiple names for the same feature.

---

# Database Terminology

Database entities should follow official business terminology.

Examples:

employees

branches

organizations

attendance

tasks

Never create tables named:

staff

stores

companies

workers

---

# API Terminology

Endpoints, RPCs and payloads should use official terminology.

Example:

create_employee()

Not:

create_worker()

---

Never use "Admin" as a user role.

# Documentation Terminology

Every specification must use the official vocabulary.

Do not alternate between:

Company / Organization

Worker / Employee

Store / Branch

Roster / Schedule

Doing so creates ambiguity.

---

# Future Terminology Changes

If a new business concept is introduced:

1. Add it to the Glossary.
2. Add the preferred term here.
3. Update affected specifications.
4. Update UI labels.
5. Update database naming if required.

Terminology changes should be rare because they affect the entire platform.

---

# Source of Truth

This document is the authoritative source for naming across ShiftOS.

If another document uses different terminology, this document takes precedence unless formally updated.