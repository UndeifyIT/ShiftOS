# TABLE-009: Shifts

## 1. Table Specification

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary Key |
| `organization_id` | `uuid` | NO | | Parent Tenant Organization |
| `branch_id` | `uuid` | NO | | Location Branch Scope |
| `template_id` | `uuid` | YES | | Source Template reference |
| `title` | `text` | NO | | Scheduled shift title |
| `description` | `text` | YES | | Operations description |
| `shift_date` | `date` | NO | | Calendar date scheduled |
| `start_time` | `time` | NO | | Shift start clock time |
| `end_time` | `time` | NO | | Shift end clock time |
| `duration` | `interval` | NO | | Stored shift planning duration |
| `crosses_midnight` | `boolean` | NO | `false` | Overnight shift status flag |
| `break_minutes` | `integer` | NO | `0` | Unpaid break duration |
| `status` | `shift_status_enum` | NO | `'draft'` | Lifecycle status |
| `published_at` | `timestamptz` | YES | | Publishing timestamp |
| `is_active` | `boolean` | NO | `true` | Status flag |
| `created_at` | `timestamptz` | NO | `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | NO | `now()` | Last modification timestamp |
| `deleted_at` | `timestamptz` | YES | | Soft delete timestamp |

## 2. Constraints
- `pk_shifts` PRIMARY KEY (`id`)
- `fk_shifts_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations`
- `fk_shifts_branch` FOREIGN KEY (`branch_id`, `organization_id`) REFERENCES `branches` (`id`, `organization_id`)
- `fk_shifts_template` FOREIGN KEY (`template_id`, `organization_id`) REFERENCES `shift_templates` (`id`, `organization_id`)
- `uq_shifts_id_organization_id` UNIQUE (`id`, `organization_id`)
- `chk_shifts_title_not_empty` CHECK (`title` not empty)
- `chk_shifts_break_minutes_non_negative` CHECK (`break_minutes` >= 0)
- `chk_shifts_overnight_logic` CHECK checks matching crosses_midnight start/end order
- `chk_shifts_duration_matches_time_range` CHECK validates duration interval matches range
- `chk_shifts_published_at_lifecycle` CHECK matches published status and published_at fields
- `chk_shifts_start_end_not_equal` CHECK ensures times are distinct

## 3. Indexes
- `idx_shifts_organization_id` ON (`organization_id`)
- `idx_shifts_branch_date` ON (`branch_id`, `shift_date`)
- `idx_shifts_branch_date_status` ON (`branch_id`, `shift_date`, `status`)
- `idx_shifts_status` ON (`status`)

## 4. Row-Level Security
- Enabled.
- Policy: `tenant_isolation_shifts` restricting queries by `organization_id`.
