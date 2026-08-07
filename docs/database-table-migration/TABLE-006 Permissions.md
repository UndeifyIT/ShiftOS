# TABLE-006: Permissions

## 1. Table Specification

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary Key |
| `code` | `text` | NO | | Dot notation permission code |
| `module` | `text` | NO | | Functional domain module code |
| `name` | `text` | NO | | Human-friendly name |
| `description` | `text` | YES | | Purpose description |
| `is_active` | `boolean` | NO | `true` | Status flag |
| `created_at` | `timestamptz` | NO | `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | NO | `now()` | Last modification timestamp |

## 2. Constraints
- `pk_permissions` PRIMARY KEY (`id`)
- `uq_permissions_code` UNIQUE (`code`)
- `chk_permissions_code_format` CHECK (`code` dot formatted lowercase)
- `chk_permissions_module_not_empty` CHECK (`module` not empty)
- `chk_permissions_name_not_empty` CHECK (`name` not empty)

## 3. Indexes
- `idx_permissions_code` ON (`code`)
- `idx_permissions_module` ON (`module`)
- `idx_permissions_active` ON (`is_active`)

## 4. Row-Level Security
- Enabled.
- Policy: `read_all_permissions` allows active global read select queries.
