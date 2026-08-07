# TABLE-003: Users

## 1. Table Specification

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary Key |
| `auth_user_id` | `uuid` | NO | | Supabase Auth UUID Link |
| `first_name` | `text` | NO | | First name |
| `last_name` | `text` | NO | | Last name |
| `email` | `text` | NO | | User email |
| `phone` | `text` | YES | | Optional contact phone |
| `avatar_url` | `text` | YES | | Optional avatar URL |
| `is_active` | `boolean` | NO | `true` | Status flag |
| `last_login_at` | `timestamptz` | YES | | Session update stamp |
| `created_at` | `timestamptz` | NO | `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | NO | `now()` | Last modification timestamp |
| `deleted_at` | `timestamptz` | YES | | Soft delete timestamp |

## 2. Constraints
- `pk_users` PRIMARY KEY (`id`)
- `uq_users_auth_user_id` UNIQUE (`auth_user_id`)
- `chk_users_first_name_not_empty` CHECK (`first_name` not empty)
- `chk_users_last_name_not_empty` CHECK (`last_name` not empty)
- `chk_users_email_lowercase` CHECK (`email` lowercase)

## 3. Indexes
- `uq_users_email_active` UNIQUE INDEX ON (`email`) WHERE `deleted_at IS NULL`
- `idx_users_auth_user_id` ON (`auth_user_id`)
- `idx_users_is_active` ON (`is_active`)

## 4. Row-Level Security
- Enabled.
- Policies:
  - `user_self_manage`: Allows user self-updates based on `auth.uid()`.
  - `view_org_users`: View other users sharing organizations with the session member.
