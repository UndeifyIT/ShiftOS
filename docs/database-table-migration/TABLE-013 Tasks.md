# TBL-013 — Tasks Table Specification

**Document ID:** TBL-013  
**Table Name:** `tasks`  
**Domain:** Workforce Operations  
**Status:** Approved  
**Phase:** MVP Foundation  

**Related Documents:**
- TBL-002 Branches
- TBL-003 Users
- TBL-008 Employees
- TBL-014 Task Assignments
- TASK-001 Task Management
- TASK-002 Task Workflow
- DB-003 Schema Overview
- DB-004 Entity Relationships
- DB-005 Table Standards
- DB-006 Constraints
- SEC-004 Row-Level Security

---

# 1. Purpose

The `tasks` table stores operational tasks created within an organization.

Tasks allow businesses to:

- Assign operational work
- Track completion
- Monitor branch activities
- Manage recurring responsibilities
- Improve workforce accountability

Examples:

- Restock shelves
- Clean equipment
- Complete inventory checks
- Prepare reports
- Perform opening/closing duties

---

# 2. Ownership

| Property | Value |
|----------|-------|
| Entity Type | Tenant |
| Tenant Owned | Yes |
| Parent Entity | Branch |
| Assignment Entity | Task Assignment |

---

# 3. Table Structure

| Column | Data Type | Nullable | Default | Description |
|---------|-----------|----------|---------|-------------|
| id | UUID | No | `gen_random_uuid()` | Primary key |
| branch_id | UUID | No | — | Branch owning the task |
| title | TEXT | No | — | Task name |
| description | TEXT | Yes | NULL | Task details |
| task_status | task_status_enum | No | `'pending'` | Current task state |
| priority | task_priority_enum | No | `'medium'` | Task priority |
| due_date | DATE | Yes | NULL | Completion deadline |
| created_by | UUID | No | — | User creating task |
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
| branch_id | branches.id | RESTRICT |
| created_by | users.id | RESTRICT |

---

# 6. Constraints

## Title Validation

Task titles cannot be empty.

Rule:

```
trim(title) <> ''
```

---

## Status Validation

Uses:

```
task_status_enum
```

Expected values:

- pending
- in_progress
- completed
- cancelled

---

## Priority Validation

Uses:

```
task_priority_enum
```

Expected values:

- low
- medium
- high
- urgent

---

# 7. Indexes

| Index | Purpose |
|--------|---------|
| idx_tasks_branch_id | Branch task lookup |
| idx_tasks_status | Task queues |
| idx_tasks_due_date | Deadline reporting |
| idx_tasks_created_by | Creator lookup |

---

# 8. Relationships

## Branch → Tasks

```
branches.id
      │
      ▼
tasks.branch_id
```

---

## Task → Assignments

```
tasks.id
     │
     ▼
task_assignments.task_id
```

---

## User → Created Tasks

```
users.id
    │
    ▼
tasks.created_by
```

---

# 9. Business Rules

## Task Creation

Authorized users may create tasks.

Examples:

- Organization administrators
- Managers
- Supervisors

---

## Task Lifecycle

Default state:

```
pending
```

Lifecycle:

```
Pending

↓

In Progress

↓

Completed
```

Tasks may also become:

```
Cancelled
```

---

## Assignment Separation

Tasks do not directly store employees.

Assignments are handled through:

```
task_assignments
```

This allows:

- Multiple employees per task
- Reassignment
- Task history

---

## Branch Isolation

A task belongs to one branch.

Users can only access tasks from branches they have permission to manage.

---

# 10. Audit Fields

| Field | Purpose |
|--------|----------|
| created_by | Task creator |
| created_at | Creation time |
| updated_at | Last update |

`updated_at` uses:

```
public.trg_set_updated_at()
```

---

# 11. Row-Level Security

RLS is enabled.

Policies ensure:

- Users only access tasks belonging to authorized branches.
- Managers can manage branch tasks.
- Employees only see tasks assigned to them where applicable.
- Organizations cannot access another organization's tasks.

---

# 12. Performance Considerations

Expected queries:

- Active branch tasks
- Pending tasks
- Due tasks
- Completed task reports
- Employee task workload

Indexes support operational dashboards.

---

# 13. Future Expansion

Potential future additions:

- Recurring tasks
- Task templates
- Task checklists
- Attachments
- Task comments
- Task dependencies
- Automated task generation
- AI task recommendations

Deferred until future releases.

---

# 14. Migration Dependencies

Depends on:

- TBL-002 Branches
- TBL-003 Users

Required before:

- TBL-014 Task Assignments

---

# 15. Implementation Notes

- Tasks belong to branches, not organizations directly.
- Employee assignment is handled separately through `task_assignments`.
- Task completion history should be preserved for reporting.
- Do not store calculated completion metrics in this table.
- This table represents the definition of work, while assignments represent who performs it.