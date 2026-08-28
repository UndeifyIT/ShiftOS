# TBL-009 — Shifts Table Specification

**Document ID:** TBL-009  
**Table Name:** `shifts`  
**Domain:** Scheduling  
**Status:** Approved  
**Phase:** MVP Foundation  
**Related Documents:**
- SCH-001 Shift Scheduling
- SCH-002 Shift Lifecycle
- ATT-001 Attendance
- EMP-001 Employee Management
- DB-003 Schema Overview
- DB-004 Entity Relationships
- DB-005 Table Standards
- DB-006 Constraints
- SEC-004 Row-Level Security

---

# 1. Purpose

The `shifts` table stores every scheduled work shift created within an organization.

A shift represents a scheduled period of work.

Employees are **not** stored directly in this table. Employee assignment is handled by the **Shift Assignments** table.

Examples

- Morning Shift
- Afternoon Shift
- Night Shift
- Weekend Shift
- Holiday Shift

---

# 2. Ownership

| Property | Value |
|----------|-------|
| Entity Type | Tenant |
| Tenant Owned | Yes |
| Parent Entity | Organization |
| Child Entity | Shift Assignments |

---

# 3. Table Structure

| Column | Data Type | Nullable | Default | Description |
|---------|-----------|----------|---------|-------------|
| id | UUID | No | `gen_random_uuid()` | Primary key |
| organization_id | UUID | No | — | Owning organization |
| title | TEXT | No | — | Shift name |
| description | TEXT | Yes | NULL | Optional description |
| shift_date | DATE | No | — | Scheduled date |
| start_time | TIME | No | — | Shift start |
| end_time | TIME | No | — | Shift end |
| break_minutes | INTEGER | No | 0 | Unpaid break duration |
| status | shift_status_enum | No | `'draft'` | Current shift status |
| published_at | TIMESTAMPTZ | Yes | NULL | Publication timestamp |
| is_active | BOOLEAN | No | TRUE | Active record |
| created_at | TIMESTAMPTZ | No | `now()` | Creation timestamp |
| updated_at | TIMESTAMPTZ | No | `now()` | Last update |
| deleted_at | TIMESTAMPTZ | Yes | NULL | Soft deletion |

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
| organization_id | organizations.id | RESTRICT |

Each shift belongs to one organization.

---

# 6. Unique Constraints

No unique constraints beyond the primary key.

Multiple shifts may occur on the same date.

---

# 7. Check Constraints

## Title

- Required
- Cannot be empty

---

## Break Minutes

- Must be zero or greater

---

## Start / End Time

Start and end time cannot be identical.

Overnight shifts are supported.

Example

```
Start: 22:00

End: 06:00
```

---

# 8. Indexes

| Index | Purpose |
|--------|---------|
| idx_shifts_organization | Organization lookup |
| idx_shifts_date | Schedule lookup |
| idx_shifts_status | Status filtering |
| idx_shifts_start_time | Calendar sorting |

---

# 9. Relationships

## Organization → Shifts

```
organizations.id
        │
        ▼
shifts.organization_id
```

---

## Shift → Shift Assignments

```
shifts.id
     │
     ▼
shift_assignments.shift_id
```

---

# 10. Business Rules

## Draft Workflow

New shifts begin as

```
Draft
```

Draft shifts are editable.

---

## Published Workflow

Once published

- Employees can be assigned
- Notifications may be generated
- Attendance becomes available

---

## Archived Shifts

Completed historical shifts remain available for reporting.

They are never hard deleted.

---

## Overnight Shifts

Shifts spanning midnight are fully supported.

Example

```
22:00

↓

06:00
```

The application must correctly calculate duration across dates.

---

## Break Time

Break duration is stored separately.

Working hours are calculated as

```
Shift Duration

−

Break Minutes
```

---

# 11. Audit Fields

| Field | Purpose |
|--------|----------|
| created_at | Creation |
| updated_at | Last modification |
| deleted_at | Soft deletion |

`updated_at` is maintained using the shared trigger.

---

# 12. Row-Level Security

RLS is enabled.

Policies ensure

- Organizations only access their own shifts.
- Supervisors manage branch schedules.
- Managers publish schedules.
- Cross-tenant access is prohibited.
- Service Role bypasses RLS where appropriate.

---

# 13. Performance Considerations

Expected queries

- Daily schedule
- Weekly schedule
- Monthly calendar
- Upcoming shifts
- Published shifts
- Draft shifts

Indexes on organization, date, and status support expected workloads.

---

# 14. Future Expansion

Potential additions

- Branch assignment
- Color labels
- Recurring shifts
- Shift templates
- Cost estimation
- Required employee count
- Weather metadata
- AI schedule recommendations

Deferred until future releases.

---

# 15. Migration Dependencies

Depends on

- Organizations

Required before

- Shift Assignments
- Attendance
- Notifications
- Reporting
- Analytics

---

# 16. Implementation Notes

- The `shifts` table stores schedule definitions only.
- Employees are linked through `shift_assignments`.
- Shift duration should always be calculated by the application rather than stored.
- Historical shifts must remain available for reporting, payroll, and attendance auditing.
- Soft deletion preserves historical integrity while allowing schedules to be retired.