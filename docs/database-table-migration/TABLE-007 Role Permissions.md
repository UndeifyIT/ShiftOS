# TABLE-007: Role Permissions

## 1. Table Specification

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary Key |
| `role_id` | `uuid` | NO | | Associated Role |
| `permission_id` | `uuid` | NO | | Granted Permission |
| `created_at` | `timestamptz` | NO | `now()` | Creation timestamp |

## 2. Constraints
- `pk_role_permissions` PRIMARY KEY (`id`)
- `fk_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `roles` ON DELETE CASCADE
- `fk_role_permissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions`
- `uq_role_permissions_role_permission` UNIQUE (`role_id`, `permission_id`)

## 3. Indexes
- `idx_role_permissions_role_id` ON (`role_id`)
- `idx_role_permissions_permission_id` ON (`permission_id`)

## 4. Row-Level Security
- Enabled.
- Policy: `tenant_isolation_role_permissions` restricting join matching of roles.
