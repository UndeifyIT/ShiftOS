-- 041_create_departments.sql
-- Migration: create departments table + optional employees.department_id
-- Purpose: the documented org hierarchy is
-- Organization -> Branches -> Departments -> Managers -> Supervisors -> Employees,
-- but no "department" concept existed at any layer (no table, no repository,
-- no service, no API). This migration adds the minimal real feature: a
-- branch-owned grouping employees can optionally belong to, following the
-- same tenant/branch-scoping conventions as every other table in this schema
-- (closest structural precedent: 001_create_platform_organizations_branches.sql
-- for the table shape, 036_create_shift_notes.sql for the permission/role wiring).
--
-- Design decision (documented per the "small ambiguity -> pick the option
-- preserving existing architecture, document it" rule): departments are
-- scoped to a single branch (not organization-wide), matching how the
-- hierarchy is written (Branches -> Departments) and how every other
-- operational table in this schema is branch-owned. employees.department_id
-- is nullable and additive -- existing employees are unaffected, and
-- assigning a department is optional, not required.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'branches' AND c.conname = 'uq_branches_id_organization_id')
  THEN
    ALTER TABLE public.branches
      ADD CONSTRAINT uq_branches_id_organization_id UNIQUE (id, organization_id);
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'departments' AND c.conname = 'fk_departments_organization')
  THEN
    ALTER TABLE public.departments
      ADD CONSTRAINT fk_departments_organization FOREIGN KEY (organization_id)
        REFERENCES public.organizations (id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'departments' AND c.conname = 'fk_departments_branch')
  THEN
    ALTER TABLE public.departments
      ADD CONSTRAINT fk_departments_branch FOREIGN KEY (branch_id, organization_id)
        REFERENCES public.branches (id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'departments' AND c.conname = 'uq_departments_id_organization_id')
  THEN
    ALTER TABLE public.departments
      ADD CONSTRAINT uq_departments_id_organization_id UNIQUE (id, organization_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'departments' AND c.conname = 'uq_departments_branch_name')
  THEN
    ALTER TABLE public.departments
      ADD CONSTRAINT uq_departments_branch_name UNIQUE (branch_id, name);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'departments' AND c.conname = 'chk_departments_name_not_empty')
  THEN
    ALTER TABLE public.departments
      ADD CONSTRAINT chk_departments_name_not_empty CHECK (
        name IS NOT NULL AND trim(name) <> ''
      );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_departments_branch_id') THEN
    CREATE INDEX idx_departments_branch_id ON public.departments (branch_id)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_departments_organization_id') THEN
    CREATE INDEX idx_departments_organization_id ON public.departments (organization_id);
  END IF;
END$$;

COMMENT ON TABLE public.departments IS 'Branch-owned groupings employees may optionally belong to (Organization -> Branches -> Departments hierarchy).';
COMMENT ON COLUMN public.departments.description IS 'Optional freeform description.';

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_departments_set_updated_at' AND c.relname = 'departments')
  THEN
    CREATE TRIGGER trg_departments_set_updated_at
      BEFORE UPDATE ON public.departments
      FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
  END IF;
END$$;

-- Additive, nullable employee -> department link. Assigning a department is
-- optional; existing employees are unaffected (NULL by default).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'department_id') THEN
    ALTER TABLE public.employees ADD COLUMN department_id uuid;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'employees' AND c.conname = 'fk_employees_department')
  THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT fk_employees_department FOREIGN KEY (department_id, organization_id)
        REFERENCES public.departments (id, organization_id) ON DELETE SET NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_employees_department_id') THEN
    CREATE INDEX idx_employees_department_id ON public.employees (department_id);
  END IF;
END$$;

-- Extend the employees validation trigger (originally 003_create_employees.sql)
-- with one more rule: a department, if assigned, must belong to the same
-- branch as the employee. Full function body reproduced (CREATE OR REPLACE)
-- per the same convention used in 038_fix_attendance_trigger_branch_column.sql.
CREATE OR REPLACE FUNCTION public.trg_employees_validate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_department_branch_id uuid;
BEGIN
  IF NEW.hire_date > current_date THEN
    RAISE EXCEPTION 'Hire date cannot be in the future';
  END IF;

  IF NEW.department_id IS NOT NULL THEN
    SELECT branch_id INTO v_department_branch_id
    FROM public.departments
    WHERE id = NEW.department_id AND organization_id = NEW.organization_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Department must belong to the same organization as the employee';
    END IF;
    IF v_department_branch_id IS DISTINCT FROM NEW.branch_id THEN
      RAISE EXCEPTION 'Department must belong to the same branch as the employee';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Permission catalog
INSERT INTO public.permissions (code, module, name, description)
VALUES
  ('departments.read', 'workforce', 'View departments', 'View departments and their assigned employees.'),
  ('departments.create', 'workforce', 'Create department', 'Create a new department within a branch.'),
  ('departments.update', 'workforce', 'Update department', 'Update a department''s name or description.'),
  ('departments.archive', 'workforce', 'Archive department', 'Soft-delete a department.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.is_active = true
WHERE r.grants_org_wide_branch_access = true
  AND p.code IN ('departments.read', 'departments.create', 'departments.update', 'departments.archive')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.is_active = true
WHERE r.is_system = true AND lower(r.name) = lower('Supervisor')
  AND p.code IN ('departments.read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Extend ensure_standard_roles() so future organizations' Supervisor role
-- picks up departments.read at creation time too (same pattern as every
-- prior permission-catalog migration).
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
    'tasks.read', 'tasks.complete',
    'announcements.read', 'announcements.acknowledge',
    'shiftnotes.read', 'shiftnotes.create'
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

REVOKE ALL ON FUNCTION public.ensure_standard_roles(uuid) FROM PUBLIC;

DO $$
DECLARE
  v_org record;
BEGIN
  FOR v_org IN SELECT id FROM public.organizations LOOP
    PERFORM public.ensure_standard_roles(v_org.id);
  END LOOP;
END$$;
