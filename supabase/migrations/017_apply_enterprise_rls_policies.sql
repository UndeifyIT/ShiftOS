-- 017_apply_enterprise_rls_policies.sql
-- Migration: Apply Enterprise-Grade Row-Level Security (RLS) Policies
-- Purpose: Complete tenant isolation and security context validation for all 27 tables.

-- A. Security Helper Function to retrieve current user's active organization IDs.
-- Uses SECURITY DEFINER to safely bypass RLS on organization_memberships to prevent circular recursion.
CREATE OR REPLACE FUNCTION public.get_user_organizations()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id
  FROM public.organization_memberships
  WHERE user_id = (
    SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1
  ) AND is_active = true AND deleted_at IS NULL;
$$;

-- Redefining validation triggers to run as SECURITY DEFINER to bypass RLS blocks during cross-table queries.
-- 1. Redefine employees validation trigger
CREATE OR REPLACE FUNCTION public.trg_employees_validate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.hire_date > current_date THEN
    RAISE EXCEPTION 'Hire date cannot be in the future';
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Redefine leave_requests validation trigger
CREATE OR REPLACE FUNCTION public.trg_leave_requests_validate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deletion validation
  IF TG_OP = 'UPDATE' THEN
    IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      RAISE EXCEPTION 'Deleted leave requests cannot be restored';
    END IF;
    IF OLD.deleted_at IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot modify a deleted leave request';
    END IF;
  END IF;

  -- Status transition validation
  IF TG_OP = 'UPDATE' AND OLD.status <> NEW.status THEN
    CASE OLD.status
      WHEN 'pending' THEN
        IF NEW.status NOT IN ('pending', 'approved', 'rejected', 'cancelled') THEN
          RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
        END IF;
      WHEN 'approved' THEN
        IF NEW.status IS DISTINCT FROM 'approved' THEN
          RAISE EXCEPTION 'Cannot transition leave request from % to %: final state is terminal', OLD.status, NEW.status;
        END IF;
      WHEN 'rejected' THEN
        IF NEW.status IS DISTINCT FROM 'rejected' THEN
          RAISE EXCEPTION 'Cannot transition leave request from % to %: final state is terminal', OLD.status, NEW.status;
        END IF;
      WHEN 'cancelled' THEN
        IF NEW.status IS DISTINCT FROM 'cancelled' THEN
          RAISE EXCEPTION 'Cannot transition leave request from % to %: final state is terminal', OLD.status, NEW.status;
        END IF;
      ELSE
        RAISE EXCEPTION 'Unsupported previous status %', OLD.status;
    END CASE;
  END IF;

  -- Workflow state metadata validation
  IF NEW.status = 'pending' THEN
    IF NEW.approved_by IS NOT NULL OR NEW.approved_at IS NOT NULL OR NEW.rejected_by IS NOT NULL OR NEW.rejected_at IS NOT NULL OR NEW.cancelled_by IS NOT NULL OR NEW.cancelled_at IS NOT NULL OR NEW.cancellation_reason IS NOT NULL THEN
      RAISE EXCEPTION 'Pending leave requests may not include approval, rejection, or cancellation metadata';
    END IF;
  ELSIF NEW.status = 'approved' THEN
    IF NEW.approved_by IS NULL OR NEW.approved_at IS NULL THEN
      RAISE EXCEPTION 'Approved leave requests must include approved_by and approved_at';
    END IF;
  ELSIF NEW.status = 'rejected' THEN
    IF NEW.rejected_by IS NULL OR NEW.rejected_at IS NULL OR NEW.manager_notes IS NULL OR trim(NEW.manager_notes) = '' THEN
      RAISE EXCEPTION 'Rejected leave requests must include rejected_by, rejected_at, and manager_notes';
    END IF;
  ELSIF NEW.status = 'cancelled' THEN
    IF NEW.cancelled_by IS NULL OR NEW.cancelled_at IS NULL OR NEW.cancellation_reason IS NULL OR trim(NEW.cancellation_reason) = '' THEN
      RAISE EXCEPTION 'Cancelled leave requests must include cancelled_by, cancelled_at, and cancellation_reason';
    END IF;
  END IF;

  IF NEW.approved_at IS NOT NULL AND NEW.approved_at < NEW.created_at THEN
    RAISE EXCEPTION 'approved_at must be greater than or equal to created_at';
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.version := 1;
    NEW.last_status_changed_at := now();
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'created_at may not be modified';
    END IF;
    NEW.version := OLD.version + 1;
    IF NEW.status <> OLD.status THEN
      NEW.last_status_changed_at := now();
    ELSE
      NEW.last_status_changed_at := OLD.last_status_changed_at;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Redefine attendance_records validation trigger
CREATE OR REPLACE FUNCTION public.trg_attendance_records_validate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_branch_id uuid;
  v_employee_is_active boolean;
  v_employee_deleted timestamptz;
  v_assignment_branch_id uuid;
  v_assignment_employee_id uuid;
  v_assignment_status public.assignment_status_enum;
  v_assignment_deleted timestamptz;
  v_shift_status public.shift_status_enum;
  v_shift_deleted timestamptz;
  v_worked_minutes integer;
  v_elapsed_minutes integer;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      RAISE EXCEPTION 'Deleted attendance records cannot be restored';
    END IF;
    IF OLD.deleted_at IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot modify a deleted attendance record';
    END IF;
  END IF;

  SELECT e.branch_id, e.is_active, e.deleted_at
    INTO v_employee_branch_id, v_employee_is_active, v_employee_deleted
  FROM public.employees e
  WHERE e.id = NEW.employee_id AND e.organization_id = NEW.organization_id;

  IF NOT FOUND OR v_employee_deleted IS NOT NULL THEN
    RAISE EXCEPTION 'Attendance must reference an existing employee that is not deleted';
  END IF;

  SELECT a.organization_id, a.employee_id, a.assignment_status, a.deleted_at, s.status, s.deleted_at
    INTO v_assignment_branch_id, v_assignment_employee_id, v_assignment_status, v_assignment_deleted, v_shift_status, v_shift_deleted
  FROM public.shift_assignments a
  JOIN public.shifts s ON s.id = a.shift_id AND s.organization_id = a.organization_id
  WHERE a.id = NEW.shift_assignment_id AND a.organization_id = NEW.organization_id;

  IF NOT FOUND OR v_assignment_deleted IS NOT NULL OR v_shift_deleted IS NOT NULL THEN
    RAISE EXCEPTION 'Attendance must reference an existing shift assignment and shift that are not deleted';
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Redefine tasks validation trigger
CREATE OR REPLACE FUNCTION public.trg_tasks_validate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branch_organization_id uuid;
BEGIN
  SELECT organization_id INTO v_branch_organization_id
  FROM public.branches
  WHERE id = NEW.branch_id AND deleted_at IS NULL;

  IF NOT FOUND OR v_branch_organization_id IS DISTINCT FROM NEW.organization_id THEN
    RAISE EXCEPTION 'Task branch must belong to the same organization';
  END IF;

  RETURN NEW;
END;
$$;


-- B. CREATE RLS POLICIES FOR ALL 27 TABLES TO ASSURE 100% TENANT ISOLATION.

-- 1. organizations
DROP POLICY IF EXISTS tenant_isolation_org ON public.organizations;
CREATE POLICY tenant_isolation_org ON public.organizations
  FOR ALL USING (id IN (SELECT public.get_user_organizations()));

-- 2. branches
DROP POLICY IF EXISTS tenant_isolation_branches ON public.branches;
CREATE POLICY tenant_isolation_branches ON public.branches
  FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

-- 3. users
DROP POLICY IF EXISTS user_self_manage ON public.users;
CREATE POLICY user_self_manage ON public.users
  FOR ALL USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS view_org_users ON public.users;
CREATE POLICY view_org_users ON public.users
  FOR SELECT USING (id IN (
    SELECT user_id FROM public.organization_memberships
    WHERE organization_id IN (SELECT public.get_user_organizations()) AND deleted_at IS NULL
  ));

-- 4. roles
DROP POLICY IF EXISTS tenant_isolation_roles ON public.roles;
CREATE POLICY tenant_isolation_roles ON public.roles
  FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

-- 5. permissions (global read-only)
DROP POLICY IF EXISTS read_all_permissions ON public.permissions;
CREATE POLICY read_all_permissions ON public.permissions
  FOR SELECT USING (is_active = true);

-- 6. role_permissions
DROP POLICY IF EXISTS tenant_isolation_role_permissions ON public.role_permissions;
CREATE POLICY tenant_isolation_role_permissions ON public.role_permissions
  FOR ALL USING (role_id IN (
    SELECT id FROM public.roles WHERE organization_id IN (SELECT public.get_user_organizations())
  ))
  WITH CHECK (role_id IN (
    SELECT id FROM public.roles WHERE organization_id IN (SELECT public.get_user_organizations())
  ));

-- 7. organization_memberships
DROP POLICY IF EXISTS tenant_isolation_memberships ON public.organization_memberships;
CREATE POLICY tenant_isolation_memberships ON public.organization_memberships
  FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

-- 8. employees
DROP POLICY IF EXISTS tenant_isolation_employees ON public.employees;
CREATE POLICY tenant_isolation_employees ON public.employees
  FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

-- 9. employee_history
DROP POLICY IF EXISTS tenant_isolation_employee_history ON public.employee_history;
CREATE POLICY tenant_isolation_employee_history ON public.employee_history
  FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

-- 10. shift_templates
DROP POLICY IF EXISTS tenant_isolation_shift_templates ON public.shift_templates;
CREATE POLICY tenant_isolation_shift_templates ON public.shift_templates
  FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

-- 11. schedules
DROP POLICY IF EXISTS tenant_isolation_schedules ON public.schedules;
CREATE POLICY tenant_isolation_schedules ON public.schedules
  FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

-- 12. schedule_versions
DROP POLICY IF EXISTS tenant_isolation_schedule_versions ON public.schedule_versions;
CREATE POLICY tenant_isolation_schedule_versions ON public.schedule_versions
  FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

-- 13. shifts
DROP POLICY IF EXISTS tenant_isolation_shifts ON public.shifts;
CREATE POLICY tenant_isolation_shifts ON public.shifts
  FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

-- 14. shift_assignments
DROP POLICY IF EXISTS tenant_isolation_shift_assignments ON public.shift_assignments;
CREATE POLICY tenant_isolation_shift_assignments ON public.shift_assignments
  FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

-- 15. attendance_records
DROP POLICY IF EXISTS tenant_isolation_attendance_records ON public.attendance_records;
CREATE POLICY tenant_isolation_attendance_records ON public.attendance_records
  FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

-- 16. attendance_corrections
DROP POLICY IF EXISTS tenant_isolation_attendance_corrections ON public.attendance_corrections;
CREATE POLICY tenant_isolation_attendance_corrections ON public.attendance_corrections
  FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

-- 17. leave_requests
DROP POLICY IF EXISTS tenant_isolation_leave_requests ON public.leave_requests;
CREATE POLICY tenant_isolation_leave_requests ON public.leave_requests
  FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

-- 18. tasks
DROP POLICY IF EXISTS tenant_isolation_tasks ON public.tasks;
CREATE POLICY tenant_isolation_tasks ON public.tasks
  FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

-- 19. task_assignments
DROP POLICY IF EXISTS tenant_isolation_task_assignments ON public.task_assignments;
CREATE POLICY tenant_isolation_task_assignments ON public.task_assignments
  FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

-- 20. task_history
DROP POLICY IF EXISTS tenant_isolation_task_history ON public.task_history;
CREATE POLICY tenant_isolation_task_history ON public.task_history
  FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

-- 21. announcements
DROP POLICY IF EXISTS tenant_isolation_announcements ON public.announcements;
CREATE POLICY tenant_isolation_announcements ON public.announcements
  FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

-- 22. announcement_acknowledgements
DROP POLICY IF EXISTS tenant_isolation_announcement_acknowledgements ON public.announcement_acknowledgements;
CREATE POLICY tenant_isolation_announcement_acknowledgements ON public.announcement_acknowledgements
  FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

-- 23. notifications
DROP POLICY IF EXISTS tenant_isolation_notifications ON public.notifications;
CREATE POLICY tenant_isolation_notifications ON public.notifications
  FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

-- 24. notification_preferences
DROP POLICY IF EXISTS tenant_isolation_notification_preferences ON public.notification_preferences;
CREATE POLICY tenant_isolation_notification_preferences ON public.notification_preferences
  FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

-- 25. notification_delivery_attempts
DROP POLICY IF EXISTS tenant_isolation_notification_delivery_attempts ON public.notification_delivery_attempts;
CREATE POLICY tenant_isolation_notification_delivery_attempts ON public.notification_delivery_attempts
  FOR ALL USING (notification_id IN (
    SELECT id FROM public.notifications WHERE organization_id IN (SELECT public.get_user_organizations())
  ))
  WITH CHECK (notification_id IN (
    SELECT id FROM public.notifications WHERE organization_id IN (SELECT public.get_user_organizations())
  ));

-- 26. audit_logs
DROP POLICY IF EXISTS tenant_isolation_audit_logs ON public.audit_logs;
CREATE POLICY tenant_isolation_audit_logs ON public.audit_logs
  FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

-- 27. security_events
DROP POLICY IF EXISTS tenant_isolation_security_events ON public.security_events;
CREATE POLICY tenant_isolation_security_events ON public.security_events
  FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));
