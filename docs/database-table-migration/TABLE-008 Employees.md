# TABLE-008: Employees

## 1. Table Specification

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary Key |
| `organization_id` | `uuid` | NO | | Parent Tenant Organization |
| `branch_id` | `uuid` | NO | | Primary Assigned Location Branch |
| `employee_number` | `text` | NO | | Unique business ID |
| `first_name` | `text` | NO | | First name |
| `last_name` | `text` | NO | | Last name |
| `email` | `text` | YES | | Communication email |
| `phone` | `text` | YES | | Communication phone |
| `date_of_birth` | `date` | YES | | Birthday |
| `hire_date` | `date` | NO | | Employment date |
| `employment_status` | `employment_status_enum` | NO | `'active'` | Status enum |
| `notes` | `text` | YES | | Profiles details notes |
| `is_active` | `boolean` | NO | `true` | Status flag |
| `created_at` | `timestamptz` | NO | `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | NO | `now()` | Last modification timestamp |
| `deleted_at` | `timestamptz` | YES | | Soft delete timestamp |

## 2. Constraints
- `pk_employees` PRIMARY KEY (`id`)
- `fk_employees_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations`
- `fk_employees_branch` FOREIGN KEY (`branch_id`, `organization_id`) REFERENCES `branches` (`id`, `organization_id`)
- `uq_employees_id_branch_organization` UNIQUE (`id`, `branch_id`, `organization_id`)
- `uq_employees_id_organization_id` UNIQUE (`id`, `organization_id`)
- `uq_employees_org_employee_number` UNIQUE (`organization_id`, `employee_number`)
- `chk_employees_first_name_not_empty` CHECK (`first_name` not empty)
- `chk_employees_last_name_not_empty` CHECK (`last_name` not empty)
- `chk_employees_employee_number_not_empty` CHECK (`employee_number` not empty)

## 3. Triggers
- `trg_employees_validate` BEFORE INSERT OR UPDATE executes `trg_employees_validate()` checking that hire_date is not in the future.
- `trg_employees_set_updated_at` BEFORE UPDATE updates `updated_at`.

## 4. Indexes
- `idx_employees_organization_id` ON (`organization_id`)
- `idx_employees_branch_id` ON (`branch_id`)
- `idx_employees_status` ON (`employment_status`)
- `idx_employees_employee_number` ON (`employee_number`)
- `idx_employees_name` ON (`lower(first_name)`, `lower(last_name)`)

## 5. Row-Level Security
- Enabled.
- Policy: `tenant_isolation_employees` restricting query by `organization_id`.
