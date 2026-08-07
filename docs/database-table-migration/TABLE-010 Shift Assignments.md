# TABLE-010: Shift Assignments

## 1. Table Specification

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary Key |
| `organization_id` | `uuid` | NO | | Parent Tenant Organization |
| `shift_id` | `uuid` | NO | | Associated scheduled shift |
| `employee_id` | `uuid` | NO | | Associated employee |
| `assignment_status` | `assignment_status_enum` | NO | `'assigned'` | Lifecycle state |
| `assigned_at` | `timestamptz` | NO | `now()` | Assignment timestamp |
| `confirmed_at` | `timestamptz` | YES | | Confirmation timestamp |
| `declined_at` | `timestamptz` | YES | | Decline timestamp |
| `cancelled_at` | `timestamptz` | YES | | Cancellation timestamp |
| `assigned_by` | `uuid` | YES | | Authorized user who assigned |
| `notes` | `text` | YES | | Operational details notes |
| `created_at` | `timestamptz` | NO | `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | NO | `now()` | Last modification timestamp |
| `deleted_at` | `timestamptz` | YES | | Soft delete timestamp |

## 2. Constraints
- `pk_shift_assignments` PRIMARY KEY (`id`)
- `fk_shift_assignments_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations`
- `fk_shift_assignments_shift` FOREIGN KEY (`shift_id`, `organization_id`) REFERENCES `shifts` (`id`, `organization_id`) ON DELETE CASCADE
- `fk_shift_assignments_employee` FOREIGN KEY (`employee_id`, `organization_id`) REFERENCES `employees` (`id`, `organization_id`)
- `fk_shift_assignments_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `users` ON DELETE SET NULL
- `uq_shift_assignments_id_organization_id` UNIQUE (`id`, `organization_id`)
- `chk_shift_assignments_status_timestamp_consistency` CHECK validates status dates consistency

## 3. Indexes
- `uq_shift_assignments_shift_employee` UNIQUE INDEX on (`shift_id`, `employee_id`) WHERE `deleted_at IS NULL`
- `idx_shift_assignments_organization_id` ON (`organization_id`)
- `idx_shift_assignments_shift_id` ON (`shift_id`)
- `idx_shift_assignments_employee_id` ON (`employee_id`)
- `idx_shift_assignments_status` ON (`assignment_status`)
- `idx_shift_assignments_employee_status` ON (`employee_id`, `assignment_status`)

## 4. Row-Level Security
- Enabled.
- Policy: `tenant_isolation_shift_assignments` restricting access by `organization_id`.
