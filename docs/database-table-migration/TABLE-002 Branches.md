# TABLE-002: Branches

## 1. Table Specification

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary Key |
| `organization_id` | `uuid` | NO | | Parent Organization |
| `name` | `text` | NO | | Branch Name |
| `address` | `text` | YES | | Freeform physical address |
| `settings` | `jsonb` | NO | `'{}'::jsonb` | Branch-specific configurations |
| `is_active` | `boolean` | NO | `true` | Status flag |
| `created_at` | `timestamptz` | NO | `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | NO | `now()` | Last modification timestamp |
| `deleted_at` | `timestamptz` | YES | | Soft delete timestamp |

## 2. Constraints
- `pk_branches` PRIMARY KEY (`id`)
- `fk_branches_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations`
- `uq_branches_org_name` UNIQUE (`organization_id`, `name`)
- `chk_branches_name_not_empty` CHECK (`name` not empty)

## 3. Indexes
- `idx_branches_organization_id` ON (`organization_id`)

## 4. Row-Level Security
- Enabled.
- Policy: `tenant_isolation_branches` restricting access by `organization_id`.
