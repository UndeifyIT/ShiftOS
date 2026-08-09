-- 022_add_branch_scoped_rls_policies.sql
-- Migration: apply branch-level RLS on top of existing organization-level RLS
-- Purpose: migration 017 enforced organization isolation only. This migration adds
-- the branch predicate required by PER-018 (Approved) to every table that has its
-- own branch_id column, using public.user_accessible_branches() (021). Tables
-- without a direct branch_id column derive branch scope through their parent
-- (shift_assignments -> shifts, task_assignments -> tasks). announcements has a
-- nullable branch_id (NULL = organization-wide announcement) and is scoped
-- accordingly.
--
-- Deliberately NOT included in this migration (documented scope limitation, not an
-- oversight): attendance_corrections, announcement_acknowledgements, employee_history,
-- task_history, schedule_versions remain organization-scoped only. These are
-- secondary/historical/audit-adjacent tables normally read by managers/supervisors
-- performing corrections or verification; adding derived-join branch predicates to
-- them is tracked as a fix-before-scale follow-up rather than rushed here.

-- employees (branch_id NOT NULL)
DROP POLICY IF EXISTS tenant_isolation_employees ON public.employees;
CREATE POLICY tenant_branch_isolation_employees ON public.employees
  FOR ALL USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND branch_id IN (SELECT public.user_accessible_branches(organization_id))
  )
  WITH CHECK (
    organization_id IN (SELECT public.get_user_organizations())
    AND branch_id IN (SELECT public.user_accessible_branches(organization_id))
  );

-- shift_templates (branch_id NOT NULL)
DROP POLICY IF EXISTS tenant_isolation_shift_templates ON public.shift_templates;
CREATE POLICY tenant_branch_isolation_shift_templates ON public.shift_templates
  FOR ALL USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND branch_id IN (SELECT public.user_accessible_branches(organization_id))
  )
  WITH CHECK (
    organization_id IN (SELECT public.get_user_organizations())
    AND branch_id IN (SELECT public.user_accessible_branches(organization_id))
  );

-- shifts (branch_id NOT NULL)
DROP POLICY IF EXISTS tenant_isolation_shifts ON public.shifts;
CREATE POLICY tenant_branch_isolation_shifts ON public.shifts
  FOR ALL USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND branch_id IN (SELECT public.user_accessible_branches(organization_id))
  )
  WITH CHECK (
    organization_id IN (SELECT public.get_user_organizations())
    AND branch_id IN (SELECT public.user_accessible_branches(organization_id))
  );

-- attendance_records (branch_id NOT NULL)
DROP POLICY IF EXISTS tenant_isolation_attendance_records ON public.attendance_records;
CREATE POLICY tenant_branch_isolation_attendance_records ON public.attendance_records
  FOR ALL USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND branch_id IN (SELECT public.user_accessible_branches(organization_id))
  )
  WITH CHECK (
    organization_id IN (SELECT public.get_user_organizations())
    AND branch_id IN (SELECT public.user_accessible_branches(organization_id))
  );

-- leave_requests (branch_id NOT NULL, denormalized snapshot from employee)
DROP POLICY IF EXISTS tenant_isolation_leave_requests ON public.leave_requests;
CREATE POLICY tenant_branch_isolation_leave_requests ON public.leave_requests
  FOR ALL USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND branch_id IN (SELECT public.user_accessible_branches(organization_id))
  )
  WITH CHECK (
    organization_id IN (SELECT public.get_user_organizations())
    AND branch_id IN (SELECT public.user_accessible_branches(organization_id))
  );

-- tasks (branch_id NOT NULL)
DROP POLICY IF EXISTS tenant_isolation_tasks ON public.tasks;
CREATE POLICY tenant_branch_isolation_tasks ON public.tasks
  FOR ALL USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND branch_id IN (SELECT public.user_accessible_branches(organization_id))
  )
  WITH CHECK (
    organization_id IN (SELECT public.get_user_organizations())
    AND branch_id IN (SELECT public.user_accessible_branches(organization_id))
  );

-- schedules (branch_id NOT NULL)
DROP POLICY IF EXISTS tenant_isolation_schedules ON public.schedules;
CREATE POLICY tenant_branch_isolation_schedules ON public.schedules
  FOR ALL USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND branch_id IN (SELECT public.user_accessible_branches(organization_id))
  )
  WITH CHECK (
    organization_id IN (SELECT public.get_user_organizations())
    AND branch_id IN (SELECT public.user_accessible_branches(organization_id))
  );

-- announcements (branch_id NULLABLE: NULL = organization-wide announcement)
DROP POLICY IF EXISTS tenant_isolation_announcements ON public.announcements;
CREATE POLICY tenant_branch_isolation_announcements ON public.announcements
  FOR ALL USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND (branch_id IS NULL OR branch_id IN (SELECT public.user_accessible_branches(organization_id)))
  )
  WITH CHECK (
    organization_id IN (SELECT public.get_user_organizations())
    AND (branch_id IS NULL OR branch_id IN (SELECT public.user_accessible_branches(organization_id)))
  );

-- shift_assignments (no direct branch_id: derive via parent shift)
DROP POLICY IF EXISTS tenant_isolation_shift_assignments ON public.shift_assignments;
CREATE POLICY tenant_branch_isolation_shift_assignments ON public.shift_assignments
  FOR ALL USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND shift_id IN (
      SELECT s.id FROM public.shifts s
      WHERE s.organization_id = shift_assignments.organization_id
        AND s.branch_id IN (SELECT public.user_accessible_branches(s.organization_id))
    )
  )
  WITH CHECK (
    organization_id IN (SELECT public.get_user_organizations())
    AND shift_id IN (
      SELECT s.id FROM public.shifts s
      WHERE s.organization_id = shift_assignments.organization_id
        AND s.branch_id IN (SELECT public.user_accessible_branches(s.organization_id))
    )
  );

-- task_assignments (no direct branch_id: derive via parent task)
DROP POLICY IF EXISTS tenant_isolation_task_assignments ON public.task_assignments;
CREATE POLICY tenant_branch_isolation_task_assignments ON public.task_assignments
  FOR ALL USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND task_id IN (
      SELECT tk.id FROM public.tasks tk
      WHERE tk.organization_id = task_assignments.organization_id
        AND tk.branch_id IN (SELECT public.user_accessible_branches(tk.organization_id))
    )
  )
  WITH CHECK (
    organization_id IN (SELECT public.get_user_organizations())
    AND task_id IN (
      SELECT tk.id FROM public.tasks tk
      WHERE tk.organization_id = task_assignments.organization_id
        AND tk.branch_id IN (SELECT public.user_accessible_branches(tk.organization_id))
    )
  );
