-- 042_create_shift_swap_requests.sql
-- Migration: create shift_swap_requests table + permission catalog rows
--
-- Design decision (documented, not unilaterally silent, per the "serious/
-- irreversible product decision -> proceed conservatively and document it
-- prominently rather than block" guidance): this is a brand-new domain with
-- no existing schema, service, or API anywhere in the codebase. Rather than
-- a full two-way "trade my shift for yours" marketplace, this migration
-- implements the conservative, reversible v1: a one-way coverage handoff.
--
-- An employee who owns a shift_assignment can request that someone else take
-- it over -- either a specific named coworker (target_employee_id set) or an
-- open request any eligible employee can claim (target_employee_id null).
-- The target/claimant must accept, and a supervisor (or org-wide role) must
-- still approve before the assignment actually moves -- so a published
-- schedule never changes hands without a person holding assignments.update-
-- equivalent authority signing off. True two-way trading (give up shift A in
-- exchange for taking shift B) is NOT implemented here; it is a materially
-- bigger design question (what happens if the trade fails validation on one
-- side but not the other, whether both halves need independent approval,
-- etc.) and is called out in docs/backend-completion-audit.md as an open
-- follow-up rather than something decided unilaterally in this pass.
--
-- State machine: pending -> accepted -> approved (terminal, reassignment
-- happens atomically in the same service-layer transaction as this last
-- transition) | pending -> declined (terminal, directed requests only) |
-- pending|accepted -> cancelled (terminal, requester-initiated) | accepted
-- -> rejected (terminal, supervisor-initiated). No further transitions out
-- of any terminal state. WHO may perform each transition (e.g. only the
-- named target may accept/decline, only a permission holder may approve) is
-- enforced in the service layer, matching the split already used elsewhere
-- in this schema (e.g. AttendanceService.resolveSelfRecord's ownership
-- check) between DB-enforced structural integrity and service-enforced
-- authorization.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shift_swap_status_enum') THEN
    CREATE TYPE public.shift_swap_status_enum AS ENUM (
      'pending',
      'accepted',
      'declined',
      'approved',
      'rejected',
      'cancelled'
    );
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

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'organization_memberships' AND c.conname = 'uq_organization_memberships_user_organization')
  THEN
    ALTER TABLE public.organization_memberships
      ADD CONSTRAINT uq_organization_memberships_user_organization UNIQUE (user_id, organization_id);
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.shift_swap_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  shift_assignment_id uuid NOT NULL,
  requested_by_employee_id uuid NOT NULL,
  target_employee_id uuid,
  status public.shift_swap_status_enum NOT NULL DEFAULT 'pending',
  notes text,
  responded_by_employee_id uuid,
  responded_at timestamptz,
  decision_by uuid,
  decision_at timestamptz,
  decision_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'shift_swap_requests' AND c.conname = 'fk_shift_swap_requests_organization')
  THEN
    ALTER TABLE public.shift_swap_requests
      ADD CONSTRAINT fk_shift_swap_requests_organization FOREIGN KEY (organization_id)
        REFERENCES public.organizations (id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'shift_swap_requests' AND c.conname = 'fk_shift_swap_requests_branch')
  THEN
    ALTER TABLE public.shift_swap_requests
      ADD CONSTRAINT fk_shift_swap_requests_branch FOREIGN KEY (branch_id, organization_id)
        REFERENCES public.branches (id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'shift_swap_requests' AND c.conname = 'fk_shift_swap_requests_assignment')
  THEN
    ALTER TABLE public.shift_swap_requests
      ADD CONSTRAINT fk_shift_swap_requests_assignment FOREIGN KEY (shift_assignment_id, organization_id)
        REFERENCES public.shift_assignments (id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'shift_swap_requests' AND c.conname = 'fk_shift_swap_requests_requested_by')
  THEN
    ALTER TABLE public.shift_swap_requests
      ADD CONSTRAINT fk_shift_swap_requests_requested_by FOREIGN KEY (requested_by_employee_id, organization_id)
        REFERENCES public.employees (id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'shift_swap_requests' AND c.conname = 'fk_shift_swap_requests_target')
  THEN
    ALTER TABLE public.shift_swap_requests
      ADD CONSTRAINT fk_shift_swap_requests_target FOREIGN KEY (target_employee_id, organization_id)
        REFERENCES public.employees (id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'shift_swap_requests' AND c.conname = 'fk_shift_swap_requests_responded_by')
  THEN
    ALTER TABLE public.shift_swap_requests
      ADD CONSTRAINT fk_shift_swap_requests_responded_by FOREIGN KEY (responded_by_employee_id, organization_id)
        REFERENCES public.employees (id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'shift_swap_requests' AND c.conname = 'fk_shift_swap_requests_decision_by')
  THEN
    ALTER TABLE public.shift_swap_requests
      ADD CONSTRAINT fk_shift_swap_requests_decision_by FOREIGN KEY (decision_by, organization_id)
        REFERENCES public.organization_memberships (user_id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'shift_swap_requests' AND c.conname = 'chk_shift_swap_requests_target_not_self')
  THEN
    ALTER TABLE public.shift_swap_requests
      ADD CONSTRAINT chk_shift_swap_requests_target_not_self CHECK (
        target_employee_id IS NULL OR target_employee_id <> requested_by_employee_id
      );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_shift_swap_requests_branch_status') THEN
    CREATE INDEX idx_shift_swap_requests_branch_status ON public.shift_swap_requests (branch_id, status);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_shift_swap_requests_assignment') THEN
    CREATE INDEX idx_shift_swap_requests_assignment ON public.shift_swap_requests (shift_assignment_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_shift_swap_requests_requested_by') THEN
    CREATE INDEX idx_shift_swap_requests_requested_by ON public.shift_swap_requests (requested_by_employee_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_shift_swap_requests_target') THEN
    CREATE INDEX idx_shift_swap_requests_target ON public.shift_swap_requests (target_employee_id);
  END IF;
END$$;

COMMENT ON TABLE public.shift_swap_requests IS 'One-way shift coverage handoff requests: an employee offers their shift assignment to a named coworker or the open branch pool, subject to acceptance and supervisor approval. Two-way trading is not implemented (see migration header).';
COMMENT ON COLUMN public.shift_swap_requests.target_employee_id IS 'NULL = open to any eligible employee in the branch; set = directed at one named coworker. On acceptance of an open request, this is filled in with the accepting employee.';
COMMENT ON COLUMN public.shift_swap_requests.decision_by IS 'user_id of the supervisor/org-wide-role holder who approved or rejected the request.';

ALTER TABLE public.shift_swap_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_90_shift_swap_requests_set_updated_at' AND c.relname = 'shift_swap_requests')
  THEN
    CREATE TRIGGER trg_90_shift_swap_requests_set_updated_at
      BEFORE UPDATE ON public.shift_swap_requests
      FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
  END IF;
END$$;

CREATE OR REPLACE FUNCTION public.trg_shift_swap_requests_validate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_assignment_employee_id uuid;
  v_assignment_status text;
  v_shift_branch_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'pending' THEN
      RAISE EXCEPTION 'A new shift swap request must start in status "pending"';
    END IF;
    IF NEW.responded_by_employee_id IS NOT NULL OR NEW.responded_at IS NOT NULL
      OR NEW.decision_by IS NOT NULL OR NEW.decision_at IS NOT NULL OR NEW.decision_notes IS NOT NULL THEN
      RAISE EXCEPTION 'A new shift swap request cannot already carry a response or a decision';
    END IF;

    SELECT sa.employee_id, sa.assignment_status, s.branch_id
      INTO v_assignment_employee_id, v_assignment_status, v_shift_branch_id
    FROM public.shift_assignments sa
    JOIN public.shifts s ON s.id = sa.shift_id AND s.organization_id = sa.organization_id
    WHERE sa.id = NEW.shift_assignment_id AND sa.organization_id = NEW.organization_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Shift assignment must belong to the same organization';
    END IF;
    IF v_assignment_employee_id IS DISTINCT FROM NEW.requested_by_employee_id THEN
      RAISE EXCEPTION 'You can only request a swap for your own shift assignment';
    END IF;
    IF v_assignment_status NOT IN ('assigned', 'confirmed') THEN
      RAISE EXCEPTION 'Cannot request a swap for an assignment in status "%"', v_assignment_status;
    END IF;
    IF v_shift_branch_id IS DISTINCT FROM NEW.branch_id THEN
      RAISE EXCEPTION 'Shift swap request branch must match the assignment''s shift branch';
    END IF;

    RETURN NEW;
  END IF;

  -- TG_OP = 'UPDATE'
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
    OR NEW.branch_id IS DISTINCT FROM OLD.branch_id
    OR NEW.shift_assignment_id IS DISTINCT FROM OLD.shift_assignment_id
    OR NEW.requested_by_employee_id IS DISTINCT FROM OLD.requested_by_employee_id
  THEN
    RAISE EXCEPTION 'organization_id, branch_id, shift_assignment_id, and requested_by_employee_id may not change after creation';
  END IF;

  IF OLD.status IN ('approved', 'declined', 'rejected', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot modify a shift swap request that is already in a terminal status ("%")', OLD.status;
  END IF;

  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    IF NEW.responded_by_employee_id IS NULL OR NEW.responded_at IS NULL THEN
      RAISE EXCEPTION 'Accepting a swap request requires responded_by_employee_id and responded_at';
    END IF;
    IF OLD.target_employee_id IS NOT NULL AND NEW.responded_by_employee_id IS DISTINCT FROM OLD.target_employee_id THEN
      RAISE EXCEPTION 'Only the named target employee may accept a directed swap request';
    END IF;
    IF OLD.target_employee_id IS NULL AND NEW.target_employee_id IS DISTINCT FROM NEW.responded_by_employee_id THEN
      RAISE EXCEPTION 'Accepting an open swap request must set target_employee_id to the accepting employee';
    END IF;

  ELSIF OLD.status = 'pending' AND NEW.status = 'declined' THEN
    IF OLD.target_employee_id IS NULL THEN
      RAISE EXCEPTION 'Only a directed swap request (with a named target) can be declined; cancel an open request instead';
    END IF;
    IF NEW.responded_by_employee_id IS DISTINCT FROM OLD.target_employee_id OR NEW.responded_at IS NULL THEN
      RAISE EXCEPTION 'Declining a swap request requires responded_by_employee_id to match the named target and responded_at to be set';
    END IF;

  ELSIF OLD.status IN ('pending', 'accepted') AND NEW.status = 'cancelled' THEN
    NULL; -- requester-initiated cancellation, no additional required fields

  ELSIF OLD.status = 'accepted' AND NEW.status = 'approved' THEN
    IF NEW.decision_by IS NULL OR NEW.decision_at IS NULL THEN
      RAISE EXCEPTION 'Approving a swap request requires decision_by and decision_at';
    END IF;

  ELSIF OLD.status = 'accepted' AND NEW.status = 'rejected' THEN
    IF NEW.decision_by IS NULL OR NEW.decision_at IS NULL THEN
      RAISE EXCEPTION 'Rejecting a swap request requires decision_by and decision_at';
    END IF;

  ELSIF NEW.status = OLD.status THEN
    RAISE EXCEPTION 'No fields may change on a shift swap request without a status transition';

  ELSE
    RAISE EXCEPTION 'Invalid shift swap request status transition from "%" to "%"', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_20_shift_swap_requests_validate' AND c.relname = 'shift_swap_requests')
  THEN
    CREATE TRIGGER trg_20_shift_swap_requests_validate
      BEFORE INSERT OR UPDATE ON public.shift_swap_requests
      FOR EACH ROW EXECUTE FUNCTION public.trg_shift_swap_requests_validate();
  END IF;
END$$;

-- Permission catalog
INSERT INTO public.permissions (code, module, name, description)
VALUES
  ('swaps.read', 'scheduling', 'View shift swap requests', 'View shift swap requests in accessible branches.'),
  ('swaps.request', 'scheduling', 'Request a shift swap', 'Offer one of your own shift assignments to a coworker or the open branch pool.'),
  ('swaps.respond', 'scheduling', 'Respond to a shift swap request', 'Accept or decline a shift swap request directed at you, or claim an open one.'),
  ('swaps.approve', 'scheduling', 'Approve or reject a shift swap', 'Approve (executing the reassignment) or reject an accepted shift swap request.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.is_active = true
WHERE r.grants_org_wide_branch_access = true
  AND p.code IN ('swaps.read', 'swaps.request', 'swaps.respond', 'swaps.approve')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.is_active = true
WHERE r.is_system = true AND lower(r.name) = lower('Supervisor')
  AND p.code IN ('swaps.read', 'swaps.request', 'swaps.respond', 'swaps.approve')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.is_active = true
WHERE r.is_system = true AND lower(r.name) = lower('Employee')
  AND p.code IN ('swaps.read', 'swaps.request', 'swaps.respond')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Extend ensure_standard_roles() so future organizations' Supervisor/Employee
-- roles pick up swaps grants at creation time too.
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
