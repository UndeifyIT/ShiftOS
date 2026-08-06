# ShiftOS Manager Employee Management

**Document ID:** MAN-002

**Document Title:** Manager Employee Management Screen Specification

**Version:** 1.0.0

**Status:** Approved

**Classification:** Screen Specification

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the employee management experience available to managers.

The feature allows managers to oversee workforce records across their authorized organization scope.

---

# 2. Primary User

Designed for:

- Organization managers.
- Business owners.
- Regional managers.

---

# 3. Management Goal

Managers should be able to understand:

- Who belongs to the organization.
- Where employees are assigned.
- Workforce distribution.
- Employee status.

---

# 4. Screen Philosophy

Employee management should prioritize:

- Workforce visibility.
- Organization structure.
- Controlled administration.

It should avoid becoming a daily scheduling tool.

---

# 5. Screen Structure

Primary layout:

```
Page Header

↓

Workforce Summary

↓

Employee Directory

↓

Filters/Search

↓

Employee Details
```

---

# 6. Header Section

Displays:

- Employee Management title.
- Organization context.

Primary actions:

```
Add Employee
```

Secondary actions:

```
Import Employees
```

---

# 7. Workforce Summary

Provides quick overview:

Examples:

- Total employees.
- Active employees.
- Employees by branch.
- Employment status breakdown.

---

# 8. Employee Directory

Displays organization workforce.

Information:

- Employee name.
- Employee ID.
- Branch.
- Employment status.
- Role/status information.

---

# 9. Search

Users can search by:

- Employee name.
- Employee ID.
- Branch.

---

# 10. Filters

Available filters:

Examples:

- Branch.
- Employment status.
- Active/inactive.
- Department (future).

---

# 11. Employee Profile Access

Selecting an employee opens:

Employee profile view.

Possible information:

- Personal details.
- Employment information.
- Work history.
- Attendance summary.
- Assigned branch.

---

# 12. Adding Employees

Managers may add employees through:

## Manual Entry

Single employee creation.

---

## Import

Bulk employee creation.

Requirements:

- Validation.
- Duplicate detection.
- Error reporting.

---

# 13. Employee Editing

Managers may update permitted information.

Examples:

- Contact information.
- Employment details.
- Branch assignment.

Sensitive changes require appropriate permissions.

---

# 14. Employee Status Management

Supported states:

Examples:

- Active.
- Inactive.
- Suspended (future).

Status changes should maintain history.

---

# 15. Deactivation

Employees should generally not be deleted.

Reason:

Historical records depend on employee references.

Preferred action:

```
Deactivate Employee
```

---

# 16. Empty States

No employees:

```
Your organization has no employees yet.

Add your first employee.
```

---

# 17. Error States

Examples:

Failed employee creation:

```
Unable to add employee.
Review the information and try again.
```

---

# 18. Permissions

Managers can only manage:

- Authorized organizations.
- Authorized branches.

Employee access must respect role permissions.

---

# 19. Responsive Behaviour

Desktop:

- Full employee directory.
- Advanced filtering.

Mobile:

- Search-first experience.
- Employee cards.

---

# 20. MVP Requirements

Must include:

✅ Employee directory  
✅ Search  
✅ Filtering  
✅ Employee creation  
✅ Employee profile access  
✅ Status management  

---

# 21. Future Enhancements

Future versions:

- Workforce analytics.
- Employee lifecycle automation.
- Bulk actions.
- Employee self-service management.

---

# 22. Related Specifications

- SUP-002 Employee Management
- MAN-001 Manager Dashboard
- UI-006 Data Tables
- DB-005 Tables
- SEC-003 Authorization

---

# 23. Summary

Manager Employee Management provides organization-level workforce oversight.

It focuses on workforce structure and administration, while branch-level operational employee management remains the responsibility of supervisors.