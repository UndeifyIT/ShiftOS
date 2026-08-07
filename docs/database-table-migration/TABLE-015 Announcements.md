# TABLE-015: Announcements

## 1. Table Specification

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary Key |
| `organization_id` | `uuid` | NO | | Parent Tenant Organization |
| `branch_id` | `uuid` | YES | | Optional Branch Scope |
| `title` | `text` | NO | | Announcement title |
| `content` | `text` | NO | | Announcement content markdown |
| `announcement_type` | `announcement_type_enum` | NO | `'general'` | Announcement type enum |
| `visibility_type` | `announcement_visibility_enum` | NO | `'organization'` | Visibility enum |
| `is_published` | `boolean` | NO | `false` | Published flag |
| `published_at` | `timestamptz` | YES | | Published timestamp |
| `expires_at` | `timestamptz` | YES | | Expiration timestamp |
| `created_by` | `uuid` | NO | | Creator user |
| `created_at` | `timestamptz` | NO | `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | NO | `now()` | Last modification timestamp |
| `deleted_at` | `timestamptz` | YES | | Soft delete timestamp |

## 2. Constraints
- `pk_announcements` PRIMARY KEY (`id`)
- `fk_announcements_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations`
- `fk_announcements_branch` FOREIGN KEY (`branch_id`, `organization_id`) REFERENCES `branches` (`id`, `organization_id`) ON DELETE SET NULL
- `fk_announcements_created_by` FOREIGN KEY (`created_by`, `organization_id`) REFERENCES `organization_memberships` (`user_id`, `organization_id`)
- `uq_announcements_id_organization_id` UNIQUE (`id`, `organization_id`)
- `chk_announcements_title_not_empty` CHECK (`title` not empty)
- `chk_announcements_content_not_empty` CHECK (`content` not empty)
- `chk_announcements_published_at_required` CHECK matches is_published status
- `chk_announcements_expires_after_published` CHECK ensures expires_at is after published_at

## 3. Indexes
- `idx_announcements_organization_id` ON (`organization_id`)
- `idx_announcements_branch_id` ON (`branch_id`)
- `idx_announcements_published` ON (`published_at`) WHERE `deleted_at IS NULL AND is_published = true`

## 4. Row-Level Security
- Enabled.
- Policy: `tenant_isolation_announcements` restricting access by `organization_id`.
