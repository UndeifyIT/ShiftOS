-- 060_seed_shift_template_permissions.sql
-- Migration: permission catalog rows for the shift-templates RPCs
-- (list_shift_templates, create_shift_template) added in this pass.
--
-- "shifttemplates" (no underscore) per chk_permissions_code_format, same
-- reasoning as "shiftnotes" in 036_create_shift_notes.sql. Supervisor-only:
-- in Phase 1 of the schedule grid rebuild, Manager cannot assign shifts at
-- all (PER-003-SCHEDULING.md "Assign Employee to Shift: Manager Deny"), so
-- Manager never opens the template picker and does not need read access
-- yet. Revisit when Manager-facing template management is built.

INSERT INTO public.permissions (code, module, name, description)
VALUES
  ('shifttemplates.read', 'scheduling', 'View shift templates', 'View reusable shift templates for a branch.'),
  ('shifttemplates.create', 'scheduling', 'Create shift template', 'Create a reusable shift template.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.is_active = true
WHERE r.is_system = true AND lower(r.name) = lower('Supervisor')
  AND p.code IN ('shifttemplates.read', 'shifttemplates.create')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Extend ensure_standard_roles() so future organizations' Supervisor role
-- picks up shifttemplates.* grants at creation time too.
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
    'departments.read',
    'employees.read', 'employees.create', 'employees.update', 'employees.archive',
    'schedules.read', 'schedules.create', 'schedules.update', 'schedules.publish', 'schedules.archive',
    'shifts.read', 'shifts.create', 'shifts.update', 'shifts.archive',
    'assignments.create', 'assignments.update', 'assignments.delete',
    'swaps.read', 'swaps.request', 'swaps.respond', 'swaps.approve',
    'tasks.read', 'tasks.complete',
    'announcements.read', 'announcements.acknowledge',
    'shiftnotes.read', 'shiftnotes.create',
    'reports.read',
    'shifttemplates.read', 'shifttemplates.create'
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
  WHERE p.is_active = true AND p.code IN ('employees.read', 'schedules.read', 'shifts.read', 'announcements.read', 'announcements.acknowledge', 'swaps.read', 'swaps.request', 'swaps.respond')
  ON CONFLICT (role_id, permission_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_standard_roles(uuid) FROM PUBLIC;

DO $$
DECLARE
  v_org record;
BEGIN
  FOR v_org IN SELECT id FROM public.organizations LOOP
    PERFORM public.ensure_standard_roles(v_org.id);
  END LOOP;
END$$;
