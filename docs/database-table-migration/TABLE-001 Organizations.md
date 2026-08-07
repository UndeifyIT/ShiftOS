# TABLE-001: Organizations

## 1. Table Specification

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary Key |
| `name` | `text` | NO | | Organization Name |
| `slug` | `text` | NO | | Canonical slug |
| `metadata` | `jsonb` | NO | `'{}'::jsonb` | Arbitrary configurations |
| `is_active` | `boolean` | NO | `true` | Activation status flag |
| `created_at` | `timestamptz` | NO | `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | NO | `now()` | Last modification timestamp |
| `deleted_at` | `timestamptz` | YES | | Soft delete timestamp |

## 2. Constraints
- `pk_organizations` PRIMARY KEY (`id`)
- `uq_organizations_slug` UNIQUE (`slug`)
- `chk_organizations_slug_format` CHECK (`slug` lowercase and hyphenated format)
- `chk_organizations_name_not_empty` CHECK (`name` not empty after trim)

## 3. Indexes
- `idx_organizations_slug` ON `lower(slug)`

## 4. Row-Level Security
- Enabled.
- Policy: `tenant_isolation_org` restricting accesses to the user's active organizations (retrieved by `get_user_organizations()`).
