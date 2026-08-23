-- 037_seed_attendance_permissions.sql
-- Migration: permission catalog + role grants for the Attendance domain.
-- attendance_records/attendance_corrections (011, 016) had a full repository
-- layer but no permission codes, service, or API — same gap as tasks/
-- announcements closed in 035. This adds:
--   attendance.read     — view attendance records/corrections
--   attendance.clockin  — self-service clock in/out against your own shift assignment
--   attendance.update   — mark a record absent/no-show, edit notes (supervisor+)
--   attendance.correct  — record a formal correction to an existing record (supervisor+)
--
-- Grants: Owner gets all four (org-wide backfill, same pattern as 035).
-- Supervisor gets all four (branch-scoped operational role that runs
-- attendance for their branch). Employee gets read + clockin only —
-- self-service, no ability to edit or correct records, matching the same
-- minimal-Employee-grant policy already established in 031/035.

INSERT INTO public.permissions (code, module, name, description)
VALUES
  ('attendance.read', 'attendance', 'View attendance', 'View attendance records and correction history.'),
  ('attendance.clockin', 'attendance', 'Clock in/out', 'Clock yourself in or out of an assigned shift.'),
  ('attendance.update', 'attendance', 'Edit attendance', 'Mark an attendance record absent/no-show or edit its notes.'),
  ('attendance.correct', 'attendance', 'Correct attendance', 'Record a formal correction to an existing attendance record.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.is_active = true
WHERE r.grants_org_wide_branch_access = true
  AND p.code IN ('attendance.read', 'attendance.clockin', 'attendance.update', 'attendance.correct')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.is_active = true
WHERE r.is_system = true AND lower(r.name) = lower('Supervisor')
  AND p.code IN ('attendance.read', 'attendance.clockin', 'attendance.update', 'attendance.correct')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.is_active = true
WHERE r.is_system = true AND lower(r.name) = lower('Employee')
  AND p.code IN ('attendance.read', 'attendance.clockin')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Extend ensure_standard_roles() so future organizations pick up these grants
-- at creation time too.
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
    'announcements.read', 'announcements.acknowledge',
    'shiftnotes.read', 'shiftnotes.create',
    'attendance.read', 'attendance.clockin', 'attendance.update', 'attendance.correct'
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
  WHERE p.is_active = true AND p.code IN (
    'employees.read', 'schedules.read', 'shifts.read',
    'announcements.read', 'announcements.acknowledge',
    'attendance.read', 'attendance.clockin'
  )
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
