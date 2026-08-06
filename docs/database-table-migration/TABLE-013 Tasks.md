# TABLE-013: Tasks

## 1. Table Specification

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary Key |
| `organization_id` | `uuid` | NO | | Parent Tenant Organization |
| `branch_id` | `uuid` | NO | | Location Branch Scope |
| `title` | `text` | NO | | Task title |
| `description` | `text` | YES | | Implementation instructions |
| `due_date` | `date` | YES | | Due date |
| `due_time` | `time` | YES | | Due time |
| `priority` | `task_priority_enum` | NO | `'normal'` | Priority enum |
| `task_status` | `task_status_enum` | NO | `'draft'` | Execution status |
| `assigned_supervisor_id` | `uuid` | YES | | Responsible supervisor employee |
| `assigned_by` | `uuid` | YES | | User assigning |
| `assigned_at` | `timestamptz` | YES | | Assignment timestamp |
| `completed_at` | `timestamptz` | YES | | Completion timestamp |
| `completed_by` | `uuid` | YES | | User completing |
| `completion_notes` | `text` | YES | | Completion notes |
| `verified_at` | `timestamptz` | YES | | Verification timestamp |
| `verified_by` | `uuid` | YES | | User verifying |
| `verification_notes` | `text` | YES | | Verification notes |
| `verification_status` | `task_verification_status_enum` | NO | `'pending'` | Verification enum |
| `created_by` | `uuid` | NO | | Task creator user |
| `updated_by` | `uuid` | YES | | Task updater user |
| `version` | `integer` | NO | `1` | Concurrency optimistic lock |
| `created_at` | `timestamptz` | NO | `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | NO | `now()` | Last modification timestamp |
| `deleted_at` | `timestamptz` | YES | | Soft delete timestamp |

## 2. Constraints
- `pk_tasks` PRIMARY KEY (`id`)
- `fk_tasks_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations`
- `fk_tasks_branch` FOREIGN KEY (`branch_id`, `organization_id`) REFERENCES `branches` (`id`, `organization_id`)
- `fk_tasks_assigned_supervisor` FOREIGN KEY (`assigned_supervisor_id`, `organization_id`) REFERENCES `employees` (`id`, `organization_id`)
- `fk_tasks_assigned_by` FOREIGN KEY (`assigned_by`, `organization_id`) REFERENCES `organization_memberships` (`user_id`, `organization_id`)
- `uq_tasks_id_organization_id` UNIQUE (`id`, `organization_id`)
- `chk_tasks_title_not_empty` CHECK (`title` not empty)
- `chk_tasks_assignment_consistency` CHECK validates states field links and dates

## 3. Triggers
- `trg_20_tasks_validate` BEFORE INSERT OR UPDATE executes `trg_tasks_validate()` (SECURITY DEFINER) enforcing tenancy checks.

## 4. Row-Level Security
- Enabled.
- Policy: `tenant_isolation_tasks` restricting access by `organization_id`.
