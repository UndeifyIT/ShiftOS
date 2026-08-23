-- 036_create_shift_notes.sql
-- Migration: create shift_notes table + permission catalog rows
-- Purpose: ShiftOS had no shift-notes feature at any layer (no table, no
-- repository, no service, no API) — the only place the name "shift notes"
-- existed was an unrelated, disconnected Lovable/TanStack scaffold
-- (shift-app-hero/, not part of this workspace or this running app). This
-- migration adds the real, minimal backend feature: a per-shift log entry
-- (handover notes, incident notes, etc.) tied to organization + branch +
-- shift + author, following the same tenant/branch-scoping conventions as
-- every other table in this schema (see 012_create_tasks.sql for the closest
-- structural precedent).
--
-- Deliberately append-only-by-default (like task_history /
-- announcement_acknowledgements): notes are a log, not a document to be
-- rewritten. A soft-delete (deleted_at) escape hatch exists for correcting a
-- mistaken entry, gated to the author or someone holding shifts.update, not a
-- general edit capability.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  END IF;
END$$;

-- Ensure the parent tables have the composite uniqueness this table's
-- foreign keys need (same idempotent pattern as 012/014).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'branches' AND c.conname = 'uq_branches_id_organization_id')
  THEN
    ALTER TABLE public.branches
      ADD CONSTRAINT uq_branches_id_organization_id UNIQUE (id, organization_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'shifts' AND c.conname = 'uq_shifts_id_organization_id')
  THEN
    ALTER TABLE public.shifts
      ADD CONSTRAINT uq_shifts_id_organization_id UNIQUE (id, organization_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'organization_memberships' AND c.conname = 'uq_organization_memberships_user_organization')
  THEN
    ALTER TABLE public.organization_memberships
      ADD CONSTRAINT uq_organization_memberships_user_organization UNIQUE (user_id, organization_id);
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.shift_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  shift_id uuid NOT NULL,
  note text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'shift_notes' AND c.conname = 'fk_shift_notes_organization')
  THEN
    ALTER TABLE public.shift_notes
      ADD CONSTRAINT fk_shift_notes_organization FOREIGN KEY (organization_id)
        REFERENCES public.organizations (id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'shift_notes' AND c.conname = 'fk_shift_notes_branch')
  THEN
    ALTER TABLE public.shift_notes
      ADD CONSTRAINT fk_shift_notes_branch FOREIGN KEY (branch_id, organization_id)
        REFERENCES public.branches (id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'shift_notes' AND c.conname = 'fk_shift_notes_shift')
  THEN
    ALTER TABLE public.shift_notes
      ADD CONSTRAINT fk_shift_notes_shift FOREIGN KEY (shift_id, organization_id)
        REFERENCES public.shifts (id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'shift_notes' AND c.conname = 'fk_shift_notes_created_by')
  THEN
    ALTER TABLE public.shift_notes
      ADD CONSTRAINT fk_shift_notes_created_by FOREIGN KEY (created_by, organization_id)
        REFERENCES public.organization_memberships (user_id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'shift_notes' AND c.conname = 'chk_shift_notes_note_not_empty')
  THEN
    ALTER TABLE public.shift_notes
      ADD CONSTRAINT chk_shift_notes_note_not_empty CHECK (
        note IS NOT NULL AND trim(note) <> ''
      );
  END IF;
END$$;

-- Trigger: validate tenant integrity (shift's branch/org must match the note's).
CREATE OR REPLACE FUNCTION public.trg_shift_notes_validate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_shift_branch_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      RAISE EXCEPTION 'Deleted shift notes cannot be restored';
    END IF;
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
      RAISE EXCEPTION 'organization_id may not be changed after creation';
    END IF;
    IF NEW.shift_id IS DISTINCT FROM OLD.shift_id THEN
      RAISE EXCEPTION 'shift_id may not be changed after creation';
    END IF;
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'created_by may not be changed after creation';
    END IF;
    IF NEW.note IS DISTINCT FROM OLD.note AND NEW.deleted_at IS NULL THEN
      RAISE EXCEPTION 'Shift note text is append-only; soft-delete and create a new note instead of editing';
    END IF;
  END IF;

  SELECT branch_id INTO v_shift_branch_id
  FROM public.shifts
  WHERE id = NEW.shift_id AND organization_id = NEW.organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shift note shift must belong to the same organization';
  END IF;
  IF v_shift_branch_id IS DISTINCT FROM NEW.branch_id THEN
    RAISE EXCEPTION 'Shift note branch must match the shift''s branch';
  END IF;

  NEW.note := trim(NEW.note);

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_20_shift_notes_validate' AND c.relname = 'shift_notes')
  THEN
    CREATE TRIGGER trg_20_shift_notes_validate
      BEFORE INSERT OR UPDATE ON public.shift_notes
      FOR EACH ROW EXECUTE FUNCTION public.trg_shift_notes_validate();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_90_shift_notes_set_updated_at' AND c.relname = 'shift_notes')
  THEN
    CREATE TRIGGER trg_90_shift_notes_set_updated_at
      BEFORE UPDATE ON public.shift_notes
      FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_shift_notes_shift_id') THEN
    CREATE INDEX idx_shift_notes_shift_id ON public.shift_notes (shift_id)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_shift_notes_branch_id') THEN
    CREATE INDEX idx_shift_notes_branch_id ON public.shift_notes (branch_id)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

COMMENT ON TABLE public.shift_notes IS 'Append-only handover/incident log entries attached to a shift.';
COMMENT ON COLUMN public.shift_notes.note IS 'Free-text note content. Append-only after creation; corrections go through soft-delete + a new note.';
COMMENT ON COLUMN public.shift_notes.deleted_at IS 'Soft delete timestamp for correcting a mistaken entry. Deleted notes are retained for audit.';

ALTER TABLE public.shift_notes ENABLE ROW LEVEL SECURITY;

-- Permission catalog: no existing codes covered this domain. Uses "shiftnotes"
-- (no underscore) per chk_permissions_code_format, which rejects underscores
-- anywhere in a code segment (same rationale documented in
-- 028_seed_domain_permission_catalog.sql for "assignments" vs "shift_assignments").
INSERT INTO public.permissions (code, module, name, description)
VALUES
  ('shiftnotes.read', 'scheduling', 'View shift notes', 'View handover/incident notes logged against a shift.'),
  ('shiftnotes.create', 'scheduling', 'Create shift note', 'Log a new note against a shift.'),
  ('shiftnotes.archive', 'scheduling', 'Archive shift note', 'Soft-delete a shift note (author or shifts.update holder only, enforced in the service layer).')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.is_active = true
WHERE r.grants_org_wide_branch_access = true
  AND p.code IN ('shiftnotes.read', 'shiftnotes.create', 'shiftnotes.archive')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.is_active = true
WHERE r.is_system = true AND lower(r.name) = lower('Supervisor')
  AND p.code IN ('shiftnotes.read', 'shiftnotes.create')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Extend ensure_standard_roles() once more so future organizations' Supervisor
-- role picks up shift_notes grants at creation time too.
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
