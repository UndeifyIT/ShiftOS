-- 039_seed_leave_permissions.sql
-- Migration: permission catalog + role grants for the Leave Requests domain.
-- leave_requests (008, hardened 018) had a full repository layer and a real
-- status-transition trigger but no permission codes, service, or API — same
-- gap closed for tasks/announcements (035) and attendance (037).
--
-- leave.read    — view leave requests
-- leave.create  — submit a leave request (self-service)
-- leave.approve — approve or reject a pending request
-- leave.cancel  — cancel your own request, or (with leave.approve) any request
--
-- Grants: Owner gets all four. Supervisor gets all four (branch-scoped
-- approver, matching the existing curated-grant pattern). Employee gets
-- read/create/cancel only — self-service, no approval authority.

INSERT INTO public.permissions (code, module, name, description)
VALUES
  ('leave.read', 'leave', 'View leave requests', 'View leave requests and their status.'),
  ('leave.create', 'leave', 'Request leave', 'Submit a new leave request.'),
  ('leave.approve', 'leave', 'Approve leave', 'Approve or reject a pending leave request.'),
  ('leave.cancel', 'leave', 'Cancel leave request', 'Cancel a leave request.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.is_active = true
WHERE r.grants_org_wide_branch_access = true
  AND p.code IN ('leave.read', 'leave.create', 'leave.approve', 'leave.cancel')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.is_active = true
WHERE r.is_system = true AND lower(r.name) = lower('Supervisor')
  AND p.code IN ('leave.read', 'leave.create', 'leave.approve', 'leave.cancel')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.is_active = true
WHERE r.is_system = true AND lower(r.name) = lower('Employee')
  AND p.code IN ('leave.read', 'leave.create', 'leave.cancel')
ON CONFLICT (role_id, permission_id) DO NOTHING;

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
    'attendance.read', 'attendance.clockin', 'attendance.update', 'attendance.correct',
    'leave.read', 'leave.create', 'leave.approve', 'leave.cancel'
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
    'attendance.read', 'attendance.clockin',
    'leave.read', 'leave.create', 'leave.cancel'
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
