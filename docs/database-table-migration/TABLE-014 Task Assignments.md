# TBL-014 — Task Assignments Table Specification

**Document ID:** TBL-014  
**Table Name:** `task_assignments`  
**Domain:** Workforce Operations  
**Status:** Approved  
**Phase:** MVP Foundation  

**Related Documents:**
- TBL-008 Employees
- TBL-013 Tasks
- TASK-001 Task Management
- TASK-002 Task Workflow
- DB-003 Schema Overview
- DB-004 Entity Relationships
- DB-005 Table Standards
- DB-006 Constraints
- SEC-004 Row-Level Security

---

# 1. Purpose

The `task_assignments` table connects operational tasks with employees responsible for completing them.

This table exists separately from `tasks` because:

- One task may have multiple employees assigned.
- Employees may complete multiple tasks.
- Assignment history must be tracked independently.
- Tasks and workers have different lifecycles.

Examples:

- Assign opening checklist to cashier team.
- Assign cleaning task to maintenance staff.
- Assign stock checking task to warehouse employees.

---

# 2. Ownership

| Property | Value |
|----------|-------|
| Entity Type | Tenant |
| Tenant Owned | Yes |
| Parent Entity | Task |
| Assigned Entity | Employee |

---

# 3. Table Structure

| Column | Data Type | Nullable | Default | Description |
|---------|-----------|----------|---------|-------------|
| id | UUID | No | `gen_random_uuid()` | Primary key |
| task_id | UUID | No | — | Task being assigned |
| employee_id | UUID | No | — | Assigned employee |
| assignment_status | task_assignment_status_enum | No | `'assigned'` | Assignment state |
| assigned_by | UUID | No | — | User assigning task |
| assigned_at | TIMESTAMPTZ | No | `now()` | Assignment timestamp |
| completed_at | TIMESTAMPTZ | Yes | NULL | Completion timestamp |
| created_at | TIMESTAMPTZ | No | `now()` | Creation timestamp |
| updated_at | TIMESTAMPTZ | No | `now()` | Last modification |
| deleted_at | TIMESTAMPTZ | Yes | NULL | Soft delete |

---

# 4. Primary Key

| Column | Type |
|---------|------|
| id | UUID |

Generated using:

```sql
gen_random_uuid()
```

---

# 5. Foreign Keys

| Column | References | Delete Rule |
|---------|------------|-------------|
| task_id | tasks.id | CASCADE |
| employee_id | employees.id | RESTRICT |
| assigned_by | users.id | RESTRICT |

---

# 6. Constraints

## Duplicate Assignment Prevention

The same employee cannot be assigned the same task multiple times.

Constraint:

```
UNIQUE(task_id, employee_id)
```

---

## Assignment Status

Uses:

```
task_assignment_status_enum
```

Expected values:

- assigned
- accepted
- in_progress
- completed
- cancelled

---

## Completion Timestamp

If status is:

```
completed
```

then:

```
completed_at
```

must contain a value.

---

# 7. Indexes

| Index | Purpose |
|--------|---------|
| idx_task_assignments_task_id | Task lookup |
| idx_task_assignments_employee_id | Employee workload queries |
| idx_task_assignments_status | Assignment filtering |

---

# 8. Relationships

## Task → Task Assignments

```
tasks.id
    │
    ▼
task_assignments.task_id
```

A task can have multiple assignments.

---

## Employee → Task Assignments

```
employees.id
        │
        ▼
task_assignments.employee_id
```

An employee can receive multiple tasks.

---

## User → Assignment Creator

```
users.id
    │
    ▼
task_assignments.assigned_by
```

---

# 9. Business Rules

## Assignment Creation

Authorized users may assign tasks.

Examples:

- Managers
- Supervisors
- Administrators

---

## Employee Visibility

Employees should only see:

- Their assigned tasks
- Tasks belonging to their permitted branch

---

## Completion Tracking

When an employee completes a task:

```
assignment_status = completed
```

and:

```
completed_at = current timestamp
```

---

## Task Completion Logic

A task should not automatically become completed simply because one assignment completes.

Completion rules are determined by business workflow:

Possible future options:

- All employees complete
- Supervisor approval
- Any employee completion

---

# 10. Audit Fields

| Field | Purpose |
|--------|----------|
| assigned_by | Accountability |
| assigned_at | Assignment history |
| completed_at | Completion tracking |
| created_at | Record creation |
| updated_at | Record updates |

Uses:

```
public.trg_set_updated_at()
```

---

# 11. Row-Level Security

RLS is enabled.

Policies ensure:

- Employees access only their assignments.
- Managers access assignments for permitted branches.
- Organizations cannot access another organization's assignments.
- Assignment creation requires proper permissions.

---

# 12. Performance Considerations

Expected queries:

- Employee daily task list
- Supervisor task dashboard
- Pending assignments
- Completed work reports
- Employee workload analysis

Indexes support employee and task based retrieval.

---

# 13. Future Expansion

Potential future additions:

- Task comments
- Employee notes
- Task proof uploads
- Task scoring
- Time spent tracking
- Performance metrics
- Automated assignment rules

Deferred until future releases.

---

# 14. Migration Dependencies

Depends on:

- TBL-008 Employees
- TBL-013 Tasks
- TBL-003 Users

---

# 15. Implementation Notes

- Do not store employee assignment directly inside the tasks table.
- This table represents the relationship between workers and operational work.
- Historical assignments should be preserved for reporting.
- Assignment status belongs here, while task status belongs to the task itself.
- Avoid duplicating task information in this table.