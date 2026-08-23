-- 035_seed_tasks_announcements_permissions.sql
-- Migration: permission catalog + role grants for the Tasks and Announcements
-- domains (backend completion pass).
--
-- Both domains already had a full table/repository layer (012-014) but no
-- permission codes existed for either, so no service could call
-- requirePermission() against them. This migration:
--   1. seeds the permission catalog rows (same dot-notation convention as
--      028_seed_domain_permission_catalog.sql);
--   2. grants every new code to every organization's org-wide ("Owner")
--      role, mirroring create_organization_with_owner()'s "every active
--      permission" policy for roles that already existed before this
--      migration ran (that function only grants active permissions AT
--      CREATION TIME, so existing Owner roles need an explicit backfill —
--      same reasoning as 031's ensure_standard_roles backfill);
--   3. extends ensure_standard_roles() (031) so newly created organizations'
--      Supervisor/Employee roles pick up the curated grants below, and
--      backfills the same grants onto every existing Supervisor/Employee
--      role.
--
-- Curated grants (verified against the actual requirePermission() calls this
-- migration's paired service-layer changes make, not guessed):
--   Supervisor — branch-scoped operational role: reads tasks/announcements,
--     completes tasks assigned to them, acknowledges announcements. No
--     create/assign/verify/publish — those stay Owner-only, consistent with
--     031's existing Supervisor grant (curated, not "every permission").
--   Employee — self-service only: reads and acknowledges announcements.
--     Tasks are supervisor-assigned in this schema (tasks.assigned_supervisor_id),
--     so Employee gets no task permissions, matching 031's existing minimal
--     Employee grant.

INSERT INTO public.permissions (code, module, name, description)
VALUES
  -- Tasks (schema: 012_create_tasks.sql, 013_create_task_assignments.sql)
  ('tasks.read', 'tasks', 'View tasks', 'View task details, status, and history.'),
  ('tasks.create', 'tasks', 'Create task', 'Create a new draft task.'),
  ('tasks.update', 'tasks', 'Edit task', 'Edit task details, or cancel a task.'),
  ('tasks.assign', 'tasks', 'Assign task', 'Assign a task to a branch supervisor.'),
  ('tasks.complete', 'tasks', 'Complete task', 'Mark an assigned task as completed.'),
  ('tasks.verify', 'tasks', 'Verify task', 'Verify or request rework on a completed task.'),
  ('tasks.archive', 'tasks', 'Archive task', 'Archive (soft-delete) a task record.'),

  -- Announcements (schema: 014_create_announcements.sql)
  ('announcements.read', 'communications', 'View announcements', 'View published announcements visible to your branches.'),
  ('announcements.create', 'communications', 'Create announcement', 'Create a new draft announcement.'),
  ('announcements.update', 'communications', 'Edit announcement', 'Edit an announcement''s content or targeting.'),
  ('announcements.publish', 'communications', 'Publish announcement', 'Publish a draft announcement to its audience.'),
  ('announcements.archive', 'communications', 'Archive announcement', 'Archive (soft-delete) an announcement.'),
  ('announcements.acknowledge', 'communications', 'Acknowledge announcement', 'Record that you have read a published announcement.')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Backfill: grant every one of the codes above to every organization's
-- existing org-wide role (the "Owner" role, identified by
-- grants_org_wide_branch_access = true, not by name, so any future rename
-- is still covered).
-- ---------------------------------------------------------------------------
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.is_active = true
WHERE r.grants_org_wide_branch_access = true
  AND p.code IN (
    'tasks.read', 'tasks.create', 'tasks.update', 'tasks.assign', 'tasks.complete', 'tasks.verify', 'tasks.archive',
    'announcements.read', 'announcements.create', 'announcements.update', 'announcements.publish', 'announcements.archive', 'announcements.acknowledge'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Backfill the curated Supervisor / Employee grants onto every existing
-- system role of that name (created by 031's ensure_standard_roles).
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.is_active = true
WHERE r.is_system = true AND lower(r.name) = lower('Supervisor')
  AND p.code IN ('tasks.read', 'tasks.complete', 'announcements.read', 'announcements.acknowledge')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.is_active = true
WHERE r.is_system = true AND lower(r.name) = lower('Employee')
  AND p.code IN ('announcements.read', 'announcements.acknowledge')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Extend ensure_standard_roles() so future organizations' Supervisor/Employee
-- roles are created with these grants already included, without touching the
-- Owner path in create_organization_with_owner() (it already grants every
-- active permission at creation time, so it needs no change).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_standard_roles(p_organization_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supervisor_role_id uuid;
  v_employee_role_id uuid;
BEGIN
  SELECT id INTO v_supervisor_role_id FROM public.roles
    WHERE organization_id = p_organization_id AND lower(name) = lower('Supervisor');
  IF v_supervisor_role_id IS NULL THEN
    INSERT INTO public.roles (organization_id, name, is_system, is_active, grants_org_wide_branch_access)
    VALUES (p_organization_id, 'Supervisor', true, true, false)
    RETURNING id INTO v_supervisor_role_id;
  END IF;

  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_supervisor_role_id, p.id FROM public.permissions p
  WHERE p.is_active = true AND p.code IN (
    'branches.read',
    'employees.read', 'employees.create', 'employees.update', 'employees.archive',
    'schedules.read', 'schedules.create', 'schedules.update', 'schedules.publish', 'schedules.archive',
    'shifts.read', 'shifts.create', 'shifts.update', 'shifts.archive',
    'assignments.create', 'assignments.update', 'assignments.delete',
    'tasks.read', 'tasks.complete',
    'announcements.read', 'announcements.acknowledge'
  )
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  SELECT id INTO v_employee_role_id FROM public.roles
    WHERE organization_id = p_organization_id AND lower(name) = lower('Employee');
  IF v_employee_role_id IS NULL THEN
    INSERT INTO public.roles (organization_id, name, is_system, is_active, grants_org_wide_branch_access)
    VALUES (p_organization_id, 'Employee', true, true, false)
    RETURNING id INTO v_employee_role_id;
  END IF;

  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_employee_role_id, p.id FROM public.permissions p
  WHERE p.is_active = true AND p.code IN ('employees.read', 'schedules.read', 'shifts.read', 'announcements.read', 'announcements.acknowledge')
  ON CONFLICT (role_id, permission_id) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.ensure_standard_roles(uuid) IS
  'Creates (if missing) and (re-)grants the standard branch-scoped Supervisor/Employee system roles for an organization, each holding a curated permission set (not every permission, unlike the Owner role). Idempotent — safe to call for an organization that already has these roles, since it now backfills newly added permission codes onto them too. Called by create_organization_with_owner() for new organizations, once as a 031 backfill, and once more here as a 035 backfill for the tasks/announcements codes.';

REVOKE ALL ON FUNCTION public.ensure_standard_roles(uuid) FROM PUBLIC;

-- Re-run the backfill loop so every existing organization's Supervisor/
-- Employee roles pick up the new grants via the updated function body above
-- (idempotent: only INSERTs new role/permission rows that don't already exist).
DO $$
DECLARE
  v_org record;
BEGIN
  FOR v_org IN SELECT id FROM public.organizations LOOP
    PERFORM public.ensure_standard_roles(v_org.id);
  END LOOP;
END$$;
