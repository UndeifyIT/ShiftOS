# TABLE-011: Attendance Records

## 1. Table Specification

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary Key |
| `organization_id` | `uuid` | NO | | Parent Tenant Organization |
| `branch_id` | `uuid` | NO | | Location Branch Scope |
| `shift_assignment_id` | `uuid` | NO | | Reference assignment link |
| `employee_id` | `uuid` | NO | | Clocking Employee |
| `attendance_status` | `attendance_status_enum` | NO | `'scheduled'` | Clocking status |
| `clock_in_at` | `timestamptz` | YES | | Punch in timestamp |
| `clock_out_at` | `timestamptz` | YES | | Punch out timestamp |
| `break_minutes` | `integer` | NO | `0` | Recorded unpaid break |
| `worked_minutes` | `integer` | NO | `0` | Calculated paid time |
| `overtime_minutes` | `integer` | NO | `0` | Stored database overtime |
| `late_minutes` | `integer` | NO | `0` | Punched late minutes |
| `early_departure_minutes` | `integer` | NO | `0` | Punched early depart minutes |
| `notes` | `text` | YES | | Punched description notes |
| `recorded_by` | `uuid` | NO | | Authorizing actor |
| `updated_by` | `uuid` | YES | | Updating actor |
| `version` | `integer` | NO | `1` | Concurrency optimistic lock |
| `created_at` | `timestamptz` | NO | `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | NO | `now()` | Last modification timestamp |
| `deleted_at` | `timestamptz` | YES | | Soft delete timestamp |

## 2. Constraints
- `pk_attendance_records` PRIMARY KEY (`id`)
- `fk_attendance_records_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations`
- `fk_attendance_records_branch` FOREIGN KEY (`branch_id`, `organization_id`) REFERENCES `branches` (`id`, `organization_id`)
- `fk_attendance_records_shift_assignment` FOREIGN KEY (`shift_assignment_id`, `organization_id`) REFERENCES `shift_assignments` (`id`, `organization_id`)
- `fk_attendance_records_employee` FOREIGN KEY (`employee_id`, `organization_id`) REFERENCES `employees` (`id`, `organization_id`)
- `fk_attendance_records_recorded_by` FOREIGN KEY (`recorded_by`, `organization_id`) REFERENCES `organization_memberships` (`user_id`, `organization_id`)
- `fk_attendance_records_updated_by` FOREIGN KEY (`updated_by`, `organization_id`) REFERENCES `organization_memberships` (`user_id`, `organization_id`)
- `uq_attendance_records_id_organization_id` UNIQUE (`id`, `organization_id`)
- `chk_attendance_records_version_positive` CHECK (`version` >= 1)
- `chk_attendance_records_clock_order` CHECK (`clock_out_at` >= `clock_in_at`)
- `chk_attendance_records_non_negative_minutes` CHECK validates duration boundary bounds

## 3. Triggers
- `trg_20_attendance_records_validate` BEFORE INSERT OR UPDATE executes `trg_attendance_records_validate()` (SECURITY DEFINER) verifying active references and calculating durations.

## 4. Indexes
- `uq_attendance_records_org_shift_assignment` UNIQUE INDEX ON (`organization_id`, `shift_assignment_id`) WHERE `deleted_at IS NULL`
- `idx_attendance_records_employee_id` ON (`employee_id`) WHERE `deleted_at IS NULL`
- `idx_attendance_records_status` ON (`attendance_status`)

## 5. Row-Level Security
- Enabled.
- Policy: `tenant_isolation_attendance_records` restricting access by `organization_id`.
