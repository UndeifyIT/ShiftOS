# ShiftOS Onboarding Screens

**Document ID:** ONB-001

**Document Title:** Organization Onboarding Screen Specifications

**Version:** 1.0.0

**Status:** Approved

**Classification:** Screen Specification

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the onboarding experience for new ShiftOS organizations.

The onboarding flow helps businesses configure their workspace and begin managing workforce operations.

---

# 2. Onboarding Philosophy

Onboarding should:

- Reduce setup friction.
- Explain key concepts.
- Guide users toward first success.
- Avoid overwhelming new customers.

---

# 3. Primary User

Initial onboarding is designed for:

- Organization owners.
- Managers.
- Administrators.

These users create and configure the ShiftOS workspace.

---

# 4. Onboarding Goal

The goal is to reach:

```
Organization Ready

+

Employees Added

+

First Schedule Created
```

---

# 5. Onboarding Flow

Primary flow:

```
Welcome

↓

Create Organization

↓

Create First Branch

↓

Configure Business Details

↓

Add Employees

↓

Create First Schedule

↓

Complete Setup
```

---

# 6. Welcome Screen

## Purpose

Introduce ShiftOS and explain the setup process.

---

## Components

Display:

- ShiftOS branding.
- Short value proposition.
- Setup progress.

Example:

```
Set up your workforce workspace in a few steps.
```

---

## Action

Primary:

```
Get Started
```

---

# 7. Organization Setup Screen

## Purpose

Create the tenant workspace.

---

## Fields

Required:

- Organization name.
- Industry type.

Optional:

- Business details.

---

## Validation

Rules:

- Organization name required.
- Duplicate organization handling.

---

# 8. Branch Setup Screen

## Purpose

Create operational locations.

---

## Fields

Required:

- Branch name.

Optional:

- Address.
- Contact information.

---

## Reason

ShiftOS is branch-focused.

Employees, schedules and attendance belong to operational locations.

---

# 9. Business Configuration

## Purpose

Customize initial settings.

Possible settings:

- Operating hours.
- Time zone.
- Workforce preferences.

---

# 10. Employee Setup

## Purpose

Help users add their first employees.

Options:

```
Add Employees Manually

OR

Import Employees
```

---

## Requirements

Support:

- Required employee information.
- Optional details.
- Duplicate detection.

---

# 11. First Schedule Setup

## Purpose

Guide users to create their first workforce schedule.

---

## Flow

```
Select Date

↓

Assign Employee

↓

Set Shift Time

↓

Save Schedule
```

---

# 12. Progress Tracking

Onboarding should show:

Example:

```
Step 3 of 5

✓ Organization

✓ Branch

→ Employees

○ Schedule
```

---

# 13. Skipping Steps

Some steps may be optional.

Example:

Users may:

- Add employees later.
- Import data later.

However, the system should encourage completion.

---

# 14. Empty States During Setup

Before completion:

Dashboard should show guidance.

Example:

```
Your workspace is ready.

Add employees to begin scheduling.
```

---

# 15. Error Handling

Examples:

Organization creation failed:

```
Unable to create workspace.
Try again.
```

Import failed:

```
Some employees could not be imported.
Review errors.
```

---

# 16. Permissions

During onboarding:

The creating user receives appropriate administrative permissions.

Future permissions are managed separately.

---

# 17. Mobile Considerations

Mobile onboarding should:

- Use simple steps.
- Avoid large forms.
- Preserve progress.
- Support interruptions.

---

# 18. MVP Requirements

Must include:

✅ Organization creation  
✅ Branch creation  
✅ Initial employee setup  
✅ Basic schedule creation  
✅ Setup progress  

---

# 19. Future Enhancements

Future versions may introduce:

- Industry templates.
- Guided setup assistants.
- AI configuration suggestions.
- Migration tools.

---

# 20. Related Specifications

- AUTH-001 Authentication Screens
- MAN-001 Manager Dashboard
- UI-008 Empty States
- UI-005 Forms
- ARCH-002 Multi-Tenant Architecture

---

# 21. Summary

ShiftOS onboarding transforms a new account into an operational workforce workspace.

By guiding organizations through setup while minimizing friction, onboarding helps customers reach value quickly and successfully adopt the platform.