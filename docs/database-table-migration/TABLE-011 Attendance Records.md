# TBL-011 — Attendance Records Table Specification

**Document ID:** TBL-011  
**Table Name:** `attendance_records`  
**Domain:** Attendance  
**Status:** Approved  
**Phase:** MVP Foundation  
**Related Documents:**
- TBL-008 Employees
- TBL-009 Shifts
- TBL-010 Shift Assignments
- ATT-001 Attendance
- ATT-002 Clock In / Clock Out
- ATT-003 Attendance Corrections
- DB-003 Schema Overview
- DB-004 Entity Relationships
- DB-005 Table Standards
- DB-006 Constraints
- SEC-004 Row-Level Security

---

# 1. Purpose

The `attendance_records` table stores the actual attendance for every scheduled shift assignment.

It records:

- Clock In
- Clock Out
- Attendance Status
- Attendance Source
- Attendance Corrections

Attendance is always linked to a **Shift Assignment**, never directly to a shift.

---

# 2. Ownership

| Property | Value |
|----------|-------|
| Entity Type | Tenant |
| Tenant Owned | Yes |
| Parent Entity | Shift Assignment |
| Child Entities | None |

---

# 3. Table Structure

| Column | Data Type | Nullable | Default | Description |
|---------|-----------|----------|---------|-------------|
| id | UUID | No | `gen_random_uuid()` | Primary key |
| shift_assignment_id | UUID | No | — | Assigned shift |
| attendance_status | attendance_status_enum | No | `'scheduled'` | Attendance state |
| clock_in_at | TIMESTAMPTZ | Yes | NULL | Actual clock-in |
| clock_out_at | TIMESTAMPTZ | Yes | NULL | Actual clock-out |
| attendance_source | attendance_source_enum | No | `'manual'` | How attendance was recorded |
| correction_reason | TEXT | Yes | NULL | Reason for attendance correction |
| corrected_by | UUID | Yes | NULL | User making correction |
| corrected_at | TIMESTAMPTZ | Yes | NULL | Correction timestamp |
| created_at | TIMESTAMPTZ | No | `now()` | Record creation |
| updated_at | TIMESTAMPTZ | No | `now()` | Last modification |

---

# 4. Primary Key

| Column | Type |
|---------|------|
| id | UUID |

Generated using

```sql
gen_random_uuid()
```

---

# 5. Foreign Keys

| Column | References | Delete Rule |
|---------|------------|-------------|
| shift_assignment_id | shift_assignments.id | RESTRICT |
| corrected_by | users.id | SET NULL |

---

# 6. Unique Constraints

| Constraint | Columns |
|------------|---------|
| uq_attendance_assignment | shift_assignment_id |

Each shift assignment can only have one attendance record.

---

# 7. Check Constraints

## Clock Times

If both timestamps exist:

```
clock_out_at

>

clock_in_at
```

must be true.

---

## Correction Reason

Required whenever attendance has been manually corrected.

---

## Attendance Status

Must exist in `attendance_status_enum`.

Example values

- scheduled
- present
- late
- absent
- partially_present
- excused

---

# 8. Indexes

| Index | Purpose |
|--------|---------|
| idx_attendance_assignment | Assignment lookup |
| idx_attendance_status | Attendance reports |
| idx_attendance_clock_in | Daily attendance |

---

# 9. Relationships

## Shift Assignment → Attendance

```
shift_assignments.id
         │
         ▼
attendance_records.shift_assignment_id
```

---

## User → Attendance Corrections

```
users.id
    │
    ▼
attendance_records.corrected_by
```

---

# 10. Business Rules

## One Attendance Record

Every shift assignment has at most one attendance record.

---

## Scheduled State

When a shift assignment is created

```
Status

↓

Scheduled
```

No clock times exist yet.

---

## Clock In

Clock-in changes attendance status.

Example

```
Scheduled

↓

Present
```

or

```
Scheduled

↓

Late
```

depending on business rules.

---

## Clock Out

Clock-out completes attendance.

Working hours are calculated dynamically.

No worked-hours column is stored.

---

## Attendance Corrections

Supervisors or Managers may correct attendance.

Every correction requires

- Reason
- Correcting user
- Timestamp

---

## Attendance History

Attendance records are never hard deleted.

Historical attendance is required for

- Payroll
- Reporting
- Audit logs
- Compliance

---

# 11. Audit Fields

| Field | Purpose |
|--------|----------|
| created_at | Record creation |
| updated_at | Last modification |
| corrected_by | Correction user |
| corrected_at | Correction timestamp |

`updated_at` uses the shared trigger.

---

# 12. Row-Level Security

RLS is enabled.

Policies ensure

- Employees may view their own attendance (if self-service is enabled).
- Supervisors manage attendance for assigned branches.
- Managers approve corrections.
- Organizations cannot access another organization's attendance.
- Service Role bypasses RLS where appropriate.

---

# 13. Performance Considerations

Expected queries

- Daily attendance
- Late arrivals
- Absentees
- Payroll export
- Monthly attendance reports
- Employee attendance history

Indexes should support reporting and payroll calculations efficiently.

---

# 14. Future Expansion

Potential future additions

- GPS verification
- Biometric device integration
- Facial recognition reference
- Device identifier
- IP address
- Clock-in photo
- Automatic geofencing
- Offline sync metadata

Deferred until future releases.

---

# 15. Migration Dependencies

Depends on

- TBL-003 Users
- TBL-010 Shift Assignments

Required before

- Payroll
- Attendance Reports
- Compliance Reports
- Workforce Analytics

---

# 16. Implementation Notes

- Attendance is linked to `shift_assignments`, not directly to employees or shifts.
- Worked hours should always be calculated from `clock_in_at`, `clock_out_at`, and the associated shift's break duration.
- Manual attendance edits must always record who made the change and why.
- Historical attendance data must remain immutable except through controlled correction workflows.
- This table serves as the authoritative source for attendance reporting and payroll calculations.