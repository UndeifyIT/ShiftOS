# TABLE-005: Roles

## 1. Table Specification

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary Key |
| `organization_id` | `uuid` | NO | | Parent Organization |
| `name` | `text` | NO | | Security Role Name |
| `description` | `text` | YES | | Purpose description |
| `is_system` | `boolean` | NO | `false` | System-defined flag |
| `is_active` | `boolean` | NO | `true` | Status flag |
| `created_at` | `timestamptz` | NO | `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | NO | `now()` | Last modification timestamp |
| `deleted_at` | `timestamptz` | YES | | Soft delete timestamp |

## 2. Constraints
- `pk_roles` PRIMARY KEY (`id`)
- `fk_roles_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations`
- `chk_roles_name_not_empty` CHECK (`name` not empty)

## 3. Indexes
- `uq_roles_org_lower_name` UNIQUE ON (`organization_id`, `lower(name)`)
- `idx_roles_organization_id` ON (`organization_id`)
- `idx_roles_active` ON (`is_active`)
- `idx_roles_system` ON (`is_system`)

## 4. Row-Level Security
- Enabled.
- Policy: `tenant_isolation_roles` restricting access by `organization_id`.
