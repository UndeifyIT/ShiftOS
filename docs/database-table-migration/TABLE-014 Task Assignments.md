# TABLE-014: Task Assignments

## 1. Table Specification

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary Key |
| `organization_id` | `uuid` | NO | | Parent Tenant Organization |
| `task_id` | `uuid` | NO | | Associated task |
| `employee_id` | `uuid` | NO | | Assigned employee |
| `assignment_status` | `task_assignment_status_enum` | NO | `'assigned'` | Status enum |
| `assigned_by` | `uuid` | YES | | Assigning actor user |
| `assigned_at` | `timestamptz` | NO | `now()` | Assignment timestamp |
| `completed_at` | `timestamptz` | YES | | Completion timestamp |
| `created_at` | `timestamptz` | NO | `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | NO | `now()` | Last modification timestamp |
| `deleted_at` | `timestamptz` | YES | | Soft delete timestamp |

## 2. Constraints
- `pk_task_assignments` PRIMARY KEY (`id`)
- `fk_task_assignments_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations`
- `fk_task_assignments_task` FOREIGN KEY (`task_id`, `organization_id`) REFERENCES `tasks` (`id`, `organization_id`) ON DELETE CASCADE
- `fk_task_assignments_employee` FOREIGN KEY (`employee_id`, `organization_id`) REFERENCES `employees` (`id`, `organization_id`)
- `fk_task_assignments_assigned_by` FOREIGN KEY (`assigned_by`, `organization_id`) REFERENCES `organization_memberships` (`user_id`, `organization_id`)

## 3. Indexes
- `uq_task_assignments_org_task_employee` UNIQUE INDEX ON (`organization_id`, `task_id`, `employee_id`) WHERE `deleted_at IS NULL`
- `idx_task_assignments_organization_id` ON (`organization_id`)
- `idx_task_assignments_task_id` ON (`task_id`)
- `idx_task_assignments_employee_id` ON (`employee_id`)
- `idx_task_assignments_status` ON (`assignment_status`)

## 4. Row-Level Security
- Enabled.
- Policy: `tenant_isolation_task_assignments` restricting access by `organization_id`.
