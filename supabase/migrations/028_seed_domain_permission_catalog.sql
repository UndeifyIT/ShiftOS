-- 028_seed_domain_permission_catalog.sql
-- Migration: seed the domain permission codes Milestone 4/5 services check against
-- Purpose: as of migration 020, the permissions table held only the three
-- authorization-management codes (org.roles.manage/org.members.manage/
-- org.branches.manage). No workforce/branch/organization/scheduling
-- permission codes existed anywhere, despite docs/roles-permissions/PER-002-*
-- documenting the full Organization/Branch/Workforce/Scheduling permission
-- matrices in detail. This migration adds the permission catalog rows those
-- matrices imply, so packages/services can call requirePermission() against
-- real database-backed codes instead of hardcoding role checks.
--
-- Reference/lookup data, not test seed data (same rationale as 020): shipped
-- via migration, idempotent (ON CONFLICT DO NOTHING), zero data risk (INSERT
-- only, no existing rows touched).
--
-- Naming: dot-notation lowercase alphanumeric segments only, matching the
-- enforced chk_permissions_code_format constraint (002_create_identity_access.sql)
-- — NOT the underscore-style examples in PER-002's prose, which predate the
-- actual database implementation (see PER-001 2026-08-09 amendment). Note
-- shift_assignments (the table) becomes "assignments" (the permission
-- module/entity) since the constraint rejects underscores entirely, even
-- within a single segment.
--
-- Granting these to a role remains an explicit, separate action via
-- role_permissions (023's org.roles.manage-gated writes, or
-- create_organization_with_owner()'s automatic full grant to a new org's
-- Owner role) — seeding the catalog does not grant anything to anyone.

INSERT INTO public.permissions (code, module, name, description)
VALUES
  -- Organization (PER-002-01 Organization Management Permission Matrix)
  ('organizations.read', 'organization', 'View organization', 'View organization profile and details.'),
  ('organizations.update', 'organization', 'Edit organization', 'Edit organization details and business settings.'),

  -- Branches (PER-002-02 Branch Permission Matrix / PER-007)
  ('branches.read', 'organization', 'View branches', 'View branch list, details, and settings.'),
  ('branches.create', 'organization', 'Create branch', 'Create a new branch.'),
  ('branches.update', 'organization', 'Edit branch', 'Edit branch information and settings.'),
  ('branches.archive', 'organization', 'Archive branch', 'Archive (soft-delete) a branch.'),

  -- Workforce (PER-002-01 Workforce Permission Matrix)
  ('employees.read', 'workforce', 'View employees', 'View employee directory, profiles, and employment history.'),
  ('employees.create', 'workforce', 'Create employee', 'Create a new employee record.'),
  ('employees.update', 'workforce', 'Edit employee', 'Edit an employee record.'),
  ('employees.archive', 'workforce', 'Archive employee', 'Archive (soft-delete) an employee record.'),

  -- Scheduling (PER-002-02 Scheduling Permission Matrix / SCH-007)
  ('schedules.read', 'scheduling', 'View schedules', 'View schedule calendar, details, and version history.'),
  ('schedules.create', 'scheduling', 'Create schedule', 'Create a new draft schedule.'),
  ('schedules.update', 'scheduling', 'Edit schedule', 'Edit a draft schedule.'),
  ('schedules.publish', 'scheduling', 'Publish schedule', 'Publish or republish a schedule, creating a new version.'),
  ('shifts.read', 'scheduling', 'View shifts', 'View shift details.'),
  ('shifts.create', 'scheduling', 'Create shift', 'Create a new shift on a schedule.'),
  ('shifts.update', 'scheduling', 'Edit shift', 'Edit or cancel a shift.'),
  ('shifts.archive', 'scheduling', 'Archive shift', 'Archive (soft-delete) a shift.'),
  ('assignments.create', 'scheduling', 'Assign employee to shift', 'Assign an employee to a shift.'),
  ('assignments.update', 'scheduling', 'Reassign shift', 'Update or reassign an existing shift assignment.'),
  ('assignments.delete', 'scheduling', 'Remove shift assignment', 'Remove an employee from a shift.')
ON CONFLICT (code) DO NOTHING;
