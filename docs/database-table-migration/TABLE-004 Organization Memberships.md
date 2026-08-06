# TABLE-004: Organization Memberships

## 1. Table Specification

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary Key |
| `organization_id` | `uuid` | NO | | Associated organization |
| `user_id` | `uuid` | NO | | Associated user |
| `role_id` | `uuid` | NO | | Appointed security role |
| `joined_at` | `timestamptz` | NO | `now()` | Appointed joined timestamp |
| `is_active` | `boolean` | NO | `true` | Status flag |
| `created_at` | `timestamptz` | NO | `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | NO | `now()` | Last modification timestamp |
| `deleted_at` | `timestamptz` | YES | | Soft delete timestamp |

## 2. Constraints
- `pk_organization_memberships` PRIMARY KEY (`id`)
- `fk_organization_memberships_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations`
- `fk_organization_memberships_user` FOREIGN KEY (`user_id`) REFERENCES `users`
- `fk_organization_memberships_role` FOREIGN KEY (`role_id`) REFERENCES `roles`
- `uq_organization_memberships_org_user` UNIQUE (`organization_id`, `user_id`)
- `uq_organization_memberships_user_organization` UNIQUE (`user_id`, `organization_id`)

## 3. Indexes
- `idx_organization_memberships_user_id` ON (`user_id`)
- `idx_organization_memberships_organization_id` ON (`organization_id`)
- `idx_organization_memberships_role_id` ON (`role_id`)
- `idx_organization_memberships_is_active` ON (`is_active`)

## 4. Row-Level Security
- Enabled.
- Policy: `tenant_isolation_memberships` restricting access based on `organization_id`.
