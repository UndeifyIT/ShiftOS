# TABLE-012: Leave Requests

## 1. Table Specification

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary Key |
| `organization_id` | `uuid` | NO | | Parent Tenant Organization |
| `branch_id` | `uuid` | NO | | Derived branch snapshot |
| `employee_id` | `uuid` | NO | | Applying workforce employee |
| `requested_by` | `uuid` | NO | | Initial requester user |
| `approved_by` | `uuid` | YES | | Authorizing user |
| `leave_type` | `leave_type_enum` | NO | | Type category |
| `status` | `leave_request_status_enum` | NO | `'pending'` | Workflow state |
| `start_date` | `date` | NO | | Leave block start |
| `end_date` | `date` | NO | | Leave block end |
| `total_days` | `integer` | NO | `GENERATED` | Stored duration calculation |
| `reason` | `text` | NO | | Description reasons |
| `manager_notes` | `text` | YES | | Approver notes |
| `cancellation_reason` | `text` | YES | | Cancelling notes |
| `last_status_changed_at` | `timestamptz` | NO | `now()` | Workflow clock stamp |
| `version` | `integer` | NO | `1` | Concurrency optimistic lock |
| `created_by` | `uuid` | NO | | Creating actor user |
| `rejected_by` | `uuid` | YES | | Rejecting actor user |
| `cancelled_by` | `uuid` | YES | | Cancelling actor user |
| `approved_at` | `timestamptz` | YES | | Approval timestamp |
| `rejected_at` | `timestamptz` | YES | | Rejection timestamp |
| `cancelled_at` | `timestamptz` | YES | | Cancellation timestamp |
| `created_at` | `timestamptz` | NO | `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | NO | `now()` | Last modification timestamp |
| `deleted_at` | `timestamptz` | YES | | Soft delete timestamp |

## 2. Constraints
- `pk_leave_requests` PRIMARY KEY (`id`)
- `fk_leave_requests_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations`
- `fk_leave_requests_branch` FOREIGN KEY (`branch_id`, `organization_id`) REFERENCES `branches` (`id`, `organization_id`)
- `fk_leave_requests_employee` FOREIGN KEY (`employee_id`, `organization_id`) REFERENCES `employees` (`id`, `organization_id`)
- `excl_leave_requests_employee_period` GIST Exclusion overlap checking on employee start/end dates
- `chk_leave_requests_date_range` CHECK (`end_date` >= `start_date`)

## 3. Triggers
- `trg_10_leave_requests_set_branch_snapshot` BEFORE INSERT sets derived branch snapshot from employees.
- `trg_20_leave_requests_validate` BEFORE INSERT OR UPDATE executes `trg_leave_requests_validate()` (SECURITY DEFINER) enforcing strict states transitions.

## 4. Row-Level Security
- Enabled.
- Policy: `tenant_isolation_leave_requests` restricting access by `organization_id`.
