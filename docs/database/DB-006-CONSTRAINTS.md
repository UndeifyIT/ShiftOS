# ShiftOS Database Constraints

**Document ID:** DB-006

**Document Title:** Database Constraints

**Version:** 1.0.0

**Status:** Approved

**Classification:** Database

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the database constraint strategy used within ShiftOS.

Constraints ensure that stored data remains valid, consistent and aligned with business rules regardless of the source of the database operation.

---

# 2. Constraint Philosophy

Database constraints provide a final protection layer for data integrity.

They enforce:

- Valid relationships.
- Unique business rules.
- Required information.
- Valid data ranges.
- Operational consistency.

Application validation improves usability, while database constraints guarantee correctness.

---

# 3. Constraint Types

ShiftOS uses the following constraint types:

- Primary Key Constraints.
- Foreign Key Constraints.
- Unique Constraints.
- Check Constraints.
- Not Null Constraints.
- Exclusion Constraints where required.

---

# 4. Primary Key Constraints

Every persistent table must have a primary key.

Standard format:

```
id
```

Primary keys must:

- Uniquely identify records.
- Never change after creation.
- Remain available throughout the record lifecycle.

---

# 5. Foreign Key Constraints

Foreign keys enforce valid relationships between entities.

Examples:

```
employees.branch_id
        ↓
branches.id
```

Foreign keys prevent:

- Orphan records.
- Invalid references.
- Broken relationships.

---

# 6. Foreign Key Actions

Cascade behavior must be selected carefully.

Default preference:

- Restrict destructive deletes.
- Preserve historical records.
- Avoid accidental cascading data loss.

Examples:

Acceptable:

```
organization
    ↓
organization_members

ON DELETE CASCADE
```

Potentially dangerous:

```
employee
    ↓
attendance_records

ON DELETE CASCADE
```

Historical operational records should usually be preserved.

---

# 7. Not Null Constraints

Required business information should use NOT NULL constraints.

Examples:

Required:

```
employees.organization_id
employees.created_at
shifts.start_time
attendance_records.employee_id
```

Optional information may allow NULL values.

---

# 8. Unique Constraints

Unique constraints protect against duplicate records.

Examples:

Organization:

- Unique identifier.

Employee:

- Unique employee reference within organization where required.

Membership:

- Prevent duplicate user-organization relationships.

---

# 9. Tenant Constraints

Tenant-owned data must maintain ownership integrity.

Examples:

Records should not allow:

```
employee.organization_id
```

to reference a different organization than:

```
employee.branch.organization_id
```

Tenant relationships must remain consistent.

---

# 10. Check Constraints

Check constraints prevent impossible values.

Examples:

Attendance:

```
clock_out_time >= clock_in_time
```

Shift:

```
end_time > start_time
```

Employee:

```
employment_status
must be a valid value
```

---

# 11. Scheduling Constraints

Scheduling constraints should prevent:

- Invalid shift times.
- Missing required assignments.
- Impossible schedule states.

Examples:

A shift cannot:

- End before it starts.
- Exist without ownership.
- Reference an inactive schedule.

---

# 12. Attendance Constraints

Attendance constraints should protect:

- Employee ownership.
- Valid timestamps.
- Valid attendance states.
- Correction relationships.

Examples:

Prevent:

- Clock-out before clock-in.
- Duplicate active attendance sessions.
- Invalid employee references.

---

# 13. Historical Data Constraints

Historical records require special handling.

Constraints should ensure:

- Historical records remain valid.
- Previous states are preserved.
- Changes do not corrupt reporting.

Historical data should generally be append-oriented.

---

# 14. Soft Delete Constraints

Where soft deletes are used:

Records should maintain:

```
deleted_at
```

Constraints should consider active records separately where necessary.

Example:

A deleted employee should not prevent creation of a future employee record with the same identifier if business rules allow it.

---

# 15. Constraint Naming

Constraint names follow DB-002 standards.

Examples:

```
pk_employees

fk_employees_branch

uq_employee_reference

chk_shift_duration
```

---

# 16. Constraint Testing

Constraints should be tested through:

- Migration testing.
- Automated tests.
- Invalid data scenarios.
- Security testing.

Testing should confirm that invalid states cannot enter production.

---

# 17. Future Enhancements

Future versions may introduce:

- Advanced PostgreSQL exclusion constraints.
- Temporal constraints.
- Complex scheduling validations.
- Automated integrity monitoring.

---

# 18. Related Specifications

- DB-001 Database Philosophy
- DB-004 Entity Relationships
- DB-005 Tables
- DB-007 Indexes
- SEC-004 Row-Level Security

---

# 19. Summary

ShiftOS uses database constraints as a fundamental integrity layer.

By enforcing relationships, uniqueness, required data and valid business states directly within PostgreSQL, the platform protects operational accuracy, prevents corruption and maintains reliable workforce data throughout its lifecycle.
