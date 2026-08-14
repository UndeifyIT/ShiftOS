-- 031_add_supervisor_role_and_invitations.sql
-- Migration: real Supervisor/Employee roles + a working member-invitation pipeline
-- Purpose: closes the confirmed gap (audit 2026-08-14) that ShiftOS could not
-- create a second privileged user. Onboarding's "Supervisor" step created a
-- plain employees row with no role/membership/login; create_organization_with_owner
-- (023) has only ever created a single "Owner" role per organization; and no
-- invitation ever turned into an organization_memberships row.
--
-- This migration:
--   1. extends create_organization_with_owner() to also create real,
--      branch-scoped "Supervisor" and "Employee" system roles for every new
--      organization, granted a curated (not "every permission") set;
--   2. backfills the same two roles for organizations that already exist;
--   3. adds `invitations` + `invitation_branch_access` — the authoritative,
--      server-written, RLS-protected record of what an invitation grants.
--      Deliberately NOT sourced from Supabase Auth's `user_metadata`: that
--      field is editable by the invited user themselves via the client SDK
--      (supabase.auth.updateUser({ data })), so trusting it for role/branch
--      assignment at acceptance time would let an invitee tamper with their
--      own privileges before accepting. A DB table only the service layer
--      (permission-gated) can write to is the safe source of truth;
--   4. adds accept_invitation(), a SECURITY DEFINER bridge function mirroring
--      create_organization_with_owner()'s precedent: the invitee holds zero
--      permissions in the target organization before their membership exists,
--      so no ordinary RLS-gated write could create that membership for them.

-- ---------------------------------------------------------------------------
-- 1 & 2. Supervisor / Employee roles: curated permission sets, verified against
-- the actual requirePermission() calls in packages/services (not guessed):
--   Supervisor — branch-scoped operational manager. Everything a Supervisor
--     dashboard/employees/scheduling workflow needs; nothing organization- or
--     authorization-management-level.
--   Employee — self-service only. Verified minimum: EmployeeDashboardPage.tsx
--     requires employees.read (to find its own employee row) + schedules.read
--     + shifts.read (schedulingService.ts's listShiftsForEmployeeInSchedule).
--     No create/update/archive/publish/assignment permissions.
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

    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_supervisor_role_id, p.id FROM public.permissions p
    WHERE p.is_active = true AND p.code IN (
      'branches.read',
      'employees.read', 'employees.create', 'employees.update', 'employees.archive',
      'schedules.read', 'schedules.create', 'schedules.update', 'schedules.publish', 'schedules.archive',
      'shifts.read', 'shifts.create', 'shifts.update', 'shifts.archive',
      'assignments.create', 'assignments.update', 'assignments.delete'
    )
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  SELECT id INTO v_employee_role_id FROM public.roles
    WHERE organization_id = p_organization_id AND lower(name) = lower('Employee');
  IF v_employee_role_id IS NULL THEN
    INSERT INTO public.roles (organization_id, name, is_system, is_active, grants_org_wide_branch_access)
    VALUES (p_organization_id, 'Employee', true, true, false)
    RETURNING id INTO v_employee_role_id;

    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_employee_role_id, p.id FROM public.permissions p
    WHERE p.is_active = true AND p.code IN ('employees.read', 'schedules.read', 'shifts.read')
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.ensure_standard_roles(uuid) IS
  'Creates the standard branch-scoped Supervisor/Employee system roles for an organization if they do not already exist yet, each granted a curated permission set (not every permission, unlike the Owner role). Idempotent. Called by create_organization_with_owner() for new organizations and once here as a backfill for existing ones.';

REVOKE ALL ON FUNCTION public.ensure_standard_roles(uuid) FROM PUBLIC;

-- Extend the existing bootstrap function to also provision the standard roles
-- for every newly created organization, not just Owner.
CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
  p_name text,
  p_slug text,
  p_owner_role_name text DEFAULT 'Owner'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_user_id uuid;
  v_organization_id uuid;
  v_role_id uuid;
BEGIN
  SELECT id INTO v_caller_user_id FROM public.users WHERE auth_user_id = auth.uid();
  IF v_caller_user_id IS NULL THEN
    RAISE EXCEPTION 'A users profile row must exist for the current auth identity before creating an organization';
  END IF;

  INSERT INTO public.organizations (name, slug)
  VALUES (p_name, p_slug)
  RETURNING id INTO v_organization_id;

  INSERT INTO public.roles (organization_id, name, is_system, is_active, grants_org_wide_branch_access)
  VALUES (v_organization_id, p_owner_role_name, true, true, true)
  RETURNING id INTO v_role_id;

  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_role_id, p.id FROM public.permissions p WHERE p.is_active = true
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  INSERT INTO public.organization_memberships (organization_id, user_id, role_id, is_active)
  VALUES (v_organization_id, v_caller_user_id, v_role_id, true);

  PERFORM public.ensure_standard_roles(v_organization_id);

  RETURN v_organization_id;
END;
$$;

COMMENT ON FUNCTION public.create_organization_with_owner(text, text, text) IS
  'Creates a new organization, a default org-wide owner role holding every active permission, a membership binding the calling user to it, and the standard Supervisor/Employee roles (031). The only supported path to bootstrap a new tenant now that roles/role_permissions/organization_memberships writes are permission-gated. Cannot target an existing organization_id.';

REVOKE ALL ON FUNCTION public.create_organization_with_owner(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_organization_with_owner(text, text, text) TO authenticated;

-- Backfill for organizations created before this migration.
DO $$
DECLARE
  v_org record;
BEGIN
  FOR v_org IN SELECT id FROM public.organizations LOOP
    PERFORM public.ensure_standard_roles(v_org.id);
  END LOOP;
END$$;

-- ---------------------------------------------------------------------------
-- 3. Invitations
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  role_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid NOT NULL,
  accepted_by uuid,
  accepted_at timestamptz,
  revoked_by uuid,
  revoked_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'invitations' AND c.conname = 'fk_invitations_organization')
  THEN
    ALTER TABLE public.invitations
      ADD CONSTRAINT fk_invitations_organization FOREIGN KEY (organization_id)
        REFERENCES public.organizations (id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'invitations' AND c.conname = 'fk_invitations_role')
  THEN
    ALTER TABLE public.invitations
      ADD CONSTRAINT fk_invitations_role FOREIGN KEY (role_id, organization_id)
        REFERENCES public.roles (id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'invitations' AND c.conname = 'fk_invitations_invited_by')
  THEN
    ALTER TABLE public.invitations
      ADD CONSTRAINT fk_invitations_invited_by FOREIGN KEY (invited_by)
        REFERENCES public.users (id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'invitations' AND c.conname = 'fk_invitations_accepted_by')
  THEN
    ALTER TABLE public.invitations
      ADD CONSTRAINT fk_invitations_accepted_by FOREIGN KEY (accepted_by)
        REFERENCES public.users (id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'invitations' AND c.conname = 'fk_invitations_revoked_by')
  THEN
    ALTER TABLE public.invitations
      ADD CONSTRAINT fk_invitations_revoked_by FOREIGN KEY (revoked_by)
        REFERENCES public.users (id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'invitations' AND c.conname = 'chk_invitations_status')
  THEN
    ALTER TABLE public.invitations
      ADD CONSTRAINT chk_invitations_status CHECK (status IN ('pending', 'accepted', 'revoked'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'invitations' AND c.conname = 'chk_invitations_email_lowercase')
  THEN
    ALTER TABLE public.invitations
      ADD CONSTRAINT chk_invitations_email_lowercase CHECK (
        email IS NOT NULL AND trim(email) <> '' AND email = lower(email)
      );
  END IF;
END$$;

-- Only one active (pending) invitation per email per organization at a time.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'uq_invitations_org_email_pending')
  THEN
    CREATE UNIQUE INDEX uq_invitations_org_email_pending
      ON public.invitations (organization_id, email)
      WHERE status = 'pending';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid WHERE n.nspname='public' AND c.relname='idx_invitations_organization_id') THEN
    CREATE INDEX idx_invitations_organization_id ON public.invitations (organization_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid WHERE n.nspname='public' AND c.relname='idx_invitations_email') THEN
    CREATE INDEX idx_invitations_email ON public.invitations (email);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid WHERE n.nspname='public' AND c.relname='idx_invitations_status') THEN
    CREATE INDEX idx_invitations_status ON public.invitations (status);
  END IF;
END$$;

COMMENT ON TABLE public.invitations IS
  'Server-written, authoritative record of what a member invitation grants (organization, role, branches). Never sourced from or trusted against Supabase Auth user_metadata, which the invitee can edit themselves before accepting.';
COMMENT ON COLUMN public.invitations.status IS
  'pending | accepted | revoked. Expiry is not a separate stored transition — a row stays "pending" and callers should treat expires_at < now() as expired without a background job.';

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_invitations_set_updated_at' AND c.relname = 'invitations')
  THEN
    CREATE TRIGGER trg_invitations_set_updated_at
      BEFORE UPDATE ON public.invitations
      FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
  END IF;
END$$;

-- RLS: same pattern as 023's roles/memberships — visible + writable only to
-- members holding org.members.manage. The real write path is the RPC-mediated
-- service layer (packages/backend's direct DB connection, permission-checked
-- in MembershipService), but these policies still apply as defense-in-depth
-- consistent with the rest of this schema, and gate accept_invitation()'s
-- SECURITY DEFINER writes not at all (by design — same as memberships_insert
-- vs create_organization_with_owner in 023).
CREATE POLICY invitations_select ON public.invitations
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.user_has_permission(organization_id, 'org.members.manage')
  );

CREATE POLICY invitations_insert ON public.invitations
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.user_has_permission(organization_id, 'org.members.manage')
  );

CREATE POLICY invitations_update ON public.invitations
  FOR UPDATE USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.user_has_permission(organization_id, 'org.members.manage')
  ) WITH CHECK (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.user_has_permission(organization_id, 'org.members.manage')
  );

-- invitation_branch_access: which branches an accepted invitation grants.
-- Mirrors organization_member_branch_access (021) but keyed to an invitation
-- until acceptance, when accept_invitation() copies these rows into real
-- organization_member_branch_access grants.
CREATE TABLE IF NOT EXISTS public.invitation_branch_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  invitation_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'invitation_branch_access' AND c.conname = 'fk_invitation_branch_access_invitation')
  THEN
    ALTER TABLE public.invitation_branch_access
      ADD CONSTRAINT fk_invitation_branch_access_invitation FOREIGN KEY (invitation_id)
        REFERENCES public.invitations (id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'invitation_branch_access' AND c.conname = 'fk_invitation_branch_access_branch')
  THEN
    ALTER TABLE public.invitation_branch_access
      ADD CONSTRAINT fk_invitation_branch_access_branch FOREIGN KEY (branch_id, organization_id)
        REFERENCES public.branches (id, organization_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'invitation_branch_access' AND c.conname = 'uq_invitation_branch_access_invitation_branch')
  THEN
    ALTER TABLE public.invitation_branch_access
      ADD CONSTRAINT uq_invitation_branch_access_invitation_branch UNIQUE (invitation_id, branch_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid WHERE n.nspname='public' AND c.relname='idx_invitation_branch_access_invitation_id') THEN
    CREATE INDEX idx_invitation_branch_access_invitation_id ON public.invitation_branch_access (invitation_id);
  END IF;
END$$;

COMMENT ON TABLE public.invitation_branch_access IS
  'Branch grants an invitation will create once accepted. Copied into organization_member_branch_access by accept_invitation().';

ALTER TABLE public.invitation_branch_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY invitation_branch_access_select ON public.invitation_branch_access
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.user_has_permission(organization_id, 'org.members.manage')
  );

CREATE POLICY invitation_branch_access_insert ON public.invitation_branch_access
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.user_has_permission(organization_id, 'org.members.manage')
  );

-- ---------------------------------------------------------------------------
-- 4. Acceptance bridge function
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.accept_invitation()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_invitation record;
  v_membership_id uuid;
BEGIN
  SELECT id, email INTO v_user_id, v_user_email FROM public.users WHERE auth_user_id = auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'A users profile row must exist for the current auth identity before accepting an invitation';
  END IF;

  SELECT * INTO v_invitation
  FROM public.invitations
  WHERE lower(email) = lower(v_user_email)
    AND status = 'pending'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_invitation.id IS NULL THEN
    RAISE EXCEPTION 'No pending invitation found for this account';
  END IF;

  -- Idempotency / re-entry safety: if a membership already exists (e.g. this
  -- ran once already, or the RPC is retried), do not error or duplicate —
  -- just make sure the invitation is marked accepted and return the existing id.
  SELECT id INTO v_membership_id
  FROM public.organization_memberships
  WHERE organization_id = v_invitation.organization_id AND user_id = v_user_id;

  IF v_membership_id IS NULL THEN
    INSERT INTO public.organization_memberships (organization_id, user_id, role_id, is_active)
    VALUES (v_invitation.organization_id, v_user_id, v_invitation.role_id, true)
    RETURNING id INTO v_membership_id;

    INSERT INTO public.organization_member_branch_access (organization_id, membership_id, branch_id, granted_by)
    SELECT v_invitation.organization_id, v_membership_id, iba.branch_id, v_invitation.invited_by
    FROM public.invitation_branch_access iba
    WHERE iba.invitation_id = v_invitation.id;
  END IF;

  UPDATE public.invitations
  SET status = 'accepted', accepted_at = now(), accepted_by = v_user_id
  WHERE id = v_invitation.id;

  RETURN v_membership_id;
END;
$$;

COMMENT ON FUNCTION public.accept_invitation() IS
  'Turns the current authenticated identity''s matching pending invitation into a real organization_memberships row plus its branch grants. SECURITY DEFINER because the invitee holds zero permissions in the target organization before this runs, mirroring create_organization_with_owner()''s bootstrap precedent. Matches by the caller''s own verified email (public.users.email for auth.uid()), never by client-supplied input — cannot be pointed at an arbitrary invitation. Safe to call opportunistically (e.g. on every session bootstrap): raises a catchable exception and changes nothing if no pending invitation exists.';

REVOKE ALL ON FUNCTION public.accept_invitation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_invitation() TO authenticated;
