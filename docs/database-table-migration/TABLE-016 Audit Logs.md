# TABLE-016: Audit Logs

## 1. Table Specification

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary Key |
| `organization_id` | `uuid` | NO | | Parent Tenant Organization |
| `user_id` | `uuid` | YES | | Acting User profile |
| `action` | `text` | NO | | Audited action description |
| `entity_type` | `text` | NO | | Target table type name |
| `entity_id` | `uuid` | YES | | Target entity row ID |
| `old_values` | `jsonb` | YES | | JSON old values |
| `new_values` | `jsonb` | YES | | JSON new values |
| `ip_address` | `inet` | YES | | Client source IP |
| `user_agent` | `text` | YES | | Client user agent |
| `created_at` | `timestamptz` | NO | `now()` | Immutable event timestamp |

## 2. Constraints
- `pk_audit_logs` PRIMARY KEY (`id`)
- `fk_audit_logs_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations`
- `fk_audit_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` ON DELETE SET NULL
- `chk_audit_logs_action_not_empty` CHECK (`action` not empty)
- `chk_audit_logs_entity_type_not_empty` CHECK (`entity_type` not empty)

## 3. Indexes
- `idx_audit_logs_organization_id` ON (`organization_id`)
- `idx_audit_logs_user_id` ON (`user_id`)
- `idx_audit_logs_entity_type` ON (`entity_type`)
- `idx_audit_logs_entity_id` ON (`entity_id`)
- `idx_audit_logs_created_at` ON (`created_at`)

## 4. Row-Level Security
- Enabled.
- Policy: `tenant_isolation_audit_logs` restricting access by `organization_id`.
