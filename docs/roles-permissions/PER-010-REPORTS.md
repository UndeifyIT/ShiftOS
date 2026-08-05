# ShiftOS Report Permission Matrix

**Document ID:** PER-002-07

**Document Title:** Report Permission Matrix

**Version:** 1.0.0

**Status:** Approved

**Classification:** Permission Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-12

**Last Updated:** 2026-07-12

---

# 1. Purpose

This document defines all permissions related to reporting within ShiftOS.

Reports provide operational insights into workforce performance, scheduling, attendance, tasks and branch operations.

The reporting model follows the ShiftOS operational philosophy:

- Managers have full reporting visibility across the organization.
- Supervisors have reporting visibility for operational decision-making.
- Staff do not have access to organizational reports.
- The future Admin role has read-only reporting access for business administration.

---

# 2. Permission Values

| Value | Meaning |
|-------|---------|
| Allow | User may perform the action directly. |
| Deny | User cannot perform the action. |
| Request | User may submit the action for approval. |
| Future | Reserved for future functionality. |

---

# 3. Report Permission Matrix

| Permission                       | Manager | Supervisor | Staff | Admin *(Future)* |
|----------------------------------|---------|------------|-------|------------------|
| View Reporting Dashboard         | Allow   | Allow      | Deny  | Allow            |
| View Workforce Reports           | Allow   | Allow      | Deny  | Allow            |
| View Attendance Reports          | Allow   | Allow      | Deny  | Allow            |
| View Scheduling Reports          | Allow   | Allow      | Deny  | Allow            |
| View Task Reports                | Allow   | Allow      | Deny  | Allow            |
| View Announcement Reports        | Allow   | Allow      | Deny  | Allow            |
| View Branch Reports              | Allow   | Allow      | Deny  | Allow            |
| View Department Reports          | Allow   | Allow      | Deny  | Allow            |
| View Operational KPIs            | Allow   | Allow      | Deny  | Allow            |
| View Historical Reports          | Allow   | Allow      | Deny  | Allow            |
| Search Reports                   | Allow   | Allow      | Deny  | Allow            |
| Filter Reports                   | Allow   | Allow      | Deny  | Allow            |
| Generate Report                  | Allow   | Allow      | Deny  | Allow            |
| Export PDF Report                | Allow   | Allow      | Deny  | Allow            |
| Export Excel Report              | Allow   | Allow      | Deny  | Allow            |
| Export CSV Report                | Allow   | Allow      | Deny  | Allow            |
| Schedule Report Export *(Future)*| Future  | Future     | Deny  | Future           |
| Share Report *(Future)*          | Future  | Future     | Deny  | Future           |

---

# 4. Permission Rules

## Reporting Access

Managers and Supervisors may access operational reports relevant to their organization.

Reports are generated from operational data and cannot modify underlying records.

---

## Report Generation

Managers and Supervisors may generate reports on demand.

Reports may include:

- Workforce
- Scheduling
- Attendance
- Tasks
- Departments
- Branches
- Operational KPIs

---

## Report Export

Managers and Supervisors may export reports in supported formats.

Supported MVP formats include:

- PDF
- Excel (.xlsx)
- CSV

---

## Staff Access

Staff members do not have access to organizational reporting.

---

## Future Admin Responsibilities

The future Admin role may:

- View reports
- Generate reports
- Export reports

Admins cannot modify operational data through reporting.

---

# 5. Design Principles

## Read-Only Reporting

Reports provide visibility without modifying operational data.

---

## Operational Decision Support

Reports exist to support operational and business decisions.

---

## Least Privilege

Reporting permissions are limited to users responsible for operational oversight.

---

## Auditability

Report generation and exports should be recorded in the audit log.

---

# 6. Related Specifications

- PER-001 Role Definitions
- PER-002 Permission Matrix Index
- REP-001 Reporting Overview
- REP-002 Operational Reports
- REP-003 Report Exports

---

# 7. Summary

The Report Permission Matrix defines access to operational reporting within ShiftOS.

Managers and Supervisors may generate, view and export reports to support operational decision-making.

Staff do not have access to organizational reporting.

The future Admin role provides read-only reporting access for business administration.