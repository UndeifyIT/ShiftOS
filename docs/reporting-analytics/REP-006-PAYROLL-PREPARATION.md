# ShiftOS Payroll Preparation Reporting

**Document ID:** REP-006

**Document Title:** Payroll Preparation Reporting

**Version:** 1.0.0

**Status:** Approved

**Classification:** Reporting & Analytics Specification

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines how ShiftOS prepares workforce operational data for payroll processing.

ShiftOS does not calculate payroll.

Its responsibility is to produce accurate, auditable workforce records that payroll systems can consume.

---

# 2. Objectives

Payroll preparation reporting should:

- Summarize worked shifts.
- Summarize attendance outcomes.
- Support payroll reconciliation.
- Reduce manual calculations.
- Preserve auditability.

---

# 3. Reporting Philosophy

Payroll preparation reports provide factual operational data.

They do not:

- Calculate salaries.
- Calculate taxes.
- Calculate statutory deductions.
- Calculate overtime pay.
- Process payroll payments.

These responsibilities belong to payroll systems.

---

# 4. Reporting Scope

Payroll preparation may be generated for:

- Organization.
- Branch.
- Employee.
- Payroll period.

---

# 5. Standard Payroll Periods

Supported reporting periods include:

- Weekly.
- Bi-weekly.
- Monthly.
- Custom date range.

Organizations define their payroll cycle.

---

# 6. Employee Payroll Summary

Each employee summary may include:

- Employee ID.
- Employee name.
- Branch.
- Payroll period.

---

# 7. Attendance Summary

Available values include:

- Scheduled shifts.
- Completed shifts.
- Missed shifts.
- Cancelled shifts.
- Attendance outcomes.

These values are derived from finalized operational records.

---

# 8. Worked Time Summary

Where attendance methods support time tracking, reports may include:

- Recorded start time.
- Recorded end time.
- Worked duration.

ShiftOS reports recorded values only.

Interpretation of payable hours is the responsibility of the payroll system.

---

# 9. Operational Exceptions

Payroll preparation reports should identify:

- Attendance corrections.
- Missing attendance records.
- Unverified attendance.
- Shift anomalies.
- Outstanding operational issues.

These records should be reviewed before payroll processing.

---

# 10. Data Integrity

Payroll preparation reports shall use only:

- Finalized attendance.
- Completed shifts.
- Approved attendance corrections.

Pending or draft operational records shall be excluded.

---

# 11. Auditability

Every payroll preparation report should include:

- Report generation timestamp.
- Payroll period.
- Requesting user.
- Applied filters.

Reports should be reproducible using the same operational data.

---

# 12. Export Readiness

Payroll preparation reports should support export into formats suitable for external payroll systems.

Export formats are defined in REP-008.

---

# 13. Security

Payroll preparation reports contain sensitive workforce information.

Access shall be restricted to authorized users.

Employees shall not access payroll preparation reports.

---

# 14. Future Integrations

Future integrations may support:

- Payroll providers.
- HRIS platforms.
- Accounting systems.
- ERP platforms.

Integrations should consume operational summaries rather than raw transactional data whenever appropriate.

---

# 15. Related Specifications

- REP-003 Attendance KPIs
- REP-008 Data Exports
- DB-010 Views
- DB-011 Materialized Views
- API-007 Background Jobs

---

# 16. Summary

ShiftOS Payroll Preparation Reporting provides accurate operational summaries that support external payroll processing.

By separating workforce operations from payroll calculations, ShiftOS remains focused on workforce management while enabling seamless integration with payroll and HR systems.