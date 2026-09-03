-- 058_apply_missing_avatars_bucket_and_tighten_employee_policies.sql
-- Migration: finish 030's never-applied work, add bucket limits, tighten
-- employee-avatar write/update/delete policies (onboarding/UX audit, Task 9)
--
-- Root cause (live-verified 2026-09-03 against etodmfsmvhewihboxcrp):
-- 030_add_employee_avatar_and_storage.sql was written and merged but was
-- never actually executed against production. Confirmed live:
--   - storage.buckets has zero rows (no 'avatars' bucket).
--   - public.employees has no avatar_url column.
--   - none of 030's avatars_employees_read/write/update/delete or
--     avatars_users_manage policies exist on storage.objects.
-- Meanwhile 046_add_organization_logo_storage_policy.sql -- which assumes
-- 030 already ran ("the private `avatars` bucket already exists (030)") --
-- WAS applied, and its avatars_organizations_* policies are live today,
-- silently orphaned: every one of them references a bucket that has never
-- existed, so every organization-logo upload has been failing.
--
-- Migration convention followed: this repo's own precedent for a corrective
-- fix (see 053 revoking a gap left by 051, and 054's later follow-up) is a
-- new, later-numbered migration -- never editing an already-merged file.
-- 030's file already reads correctly as a description of intent and is left
-- untouched; this migration is what actually makes that intent true in
-- production, in its final (Task 9-tightened) form, so the policies are
-- only ever live in one shape.
--
-- Policy tightening (Task 9): avatars_employees_write/update/delete
-- previously allowed ANY active org member to write/overwrite/delete ANY
-- employee's avatar in that org -- a coworker with no employee-management
-- permission could silently deface another employee's photo. Replaced with
-- a permission check via the existing public.user_has_permission() (020)
-- SECURITY DEFINER helper, matching this repo's established pattern for
-- expressing authorization in SQL/RLS.
--
-- "Self, or a permission holder" collapses to one rule here rather than two:
-- public.employees has no auth-identity column (no user_id/auth_user_id --
-- confirmed live) and docs/database-table-migration/TABLE-008 Employees.md
-- #12 documents this table's RLS design as purely permission-based
-- ("Managers can create and update employees... HR and Administrators can
-- manage employment records") with no self-service rule -- consistent with
-- #7's "A business may manage employees who never access ShiftOS directly."
-- apps/web's only caller of uploadEmployeeAvatar (EmployeeFormPage) is
-- itself gated behind hasPermission('employees.create'/'employees.update');
-- there is no route where a non-permitted user edits an employees-table row,
-- their own included. So the same permission check both lets a manager set
-- another employee's photo and lets a manager who is themself an employee
-- record set their own -- there is no separate identity check to add
-- without inventing an unproven email-matching heuristic this codebase has
-- no precedent for. The genuine self-service avatar path -- a user's own
-- profile photo, uploaded from ProfilePage/CompleteProfilePage -- is the
-- separate `users/{authUserId}/...` prefix and avatars_users_manage policy,
-- already correctly self-scoped since 030 and left untouched here.
--
-- Insert (avatars_employees_write) accepts employees.create OR
-- employees.update: the create flow (PendingAvatarPicker in
-- EmployeeFormPage) uploads the first photo for a brand-new employee right
-- after create_employee succeeds, reachable only via employees.create; a
-- manager with only employees.update adding a first photo to a
-- previously-photo-less existing employee also hits the INSERT policy
-- (the object doesn't exist yet), so employees.update must satisfy it too.
-- Update/delete (replacing or removing an existing photo) require
-- employees.update only, matching EmployeeFormPage's canUpdate gate.

ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS avatar_url text;

COMMENT ON COLUMN public.employees.avatar_url IS
  'Storage object path (not a public URL) under the private avatars bucket, e.g. employees/{organizationId}/{employeeId}/{filename}. Resolved to a signed URL by the client at render time. Optional.';

-- file_size_limit/allowed_mime_types match the client-side checks already
-- shown to users (apps/web/src/components/AvatarUpload.tsx MAX_BYTES = 5MB
-- and file.type.startsWith('image/'); apps/web/src/pages/employees/
-- EmployeeFormPage.tsx's PendingAvatarPicker enforces the same 5MB/image
-- check for the create-flow path). Omitted entirely by 030 -- server-side
-- enforcement now matches what users are already told.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', false, 5242880, ARRAY['image/*'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Read: unchanged from 030 -- any active org member may view a coworker's
-- avatar via a signed URL; viewing isn't the security-sensitive direction.
DROP POLICY IF EXISTS avatars_employees_read ON storage.objects;
CREATE POLICY avatars_employees_read ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'employees'
    AND (storage.foldername(name))[2]::uuid IN (SELECT public.get_user_organizations())
  );

DROP POLICY IF EXISTS avatars_employees_write ON storage.objects;
CREATE POLICY avatars_employees_write ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'employees'
    AND (storage.foldername(name))[2]::uuid IN (SELECT public.get_user_organizations())
    AND (
      public.user_has_permission((storage.foldername(name))[2]::uuid, 'employees.create')
      OR public.user_has_permission((storage.foldername(name))[2]::uuid, 'employees.update')
    )
  );

DROP POLICY IF EXISTS avatars_employees_update ON storage.objects;
CREATE POLICY avatars_employees_update ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'employees'
    AND (storage.foldername(name))[2]::uuid IN (SELECT public.get_user_organizations())
    AND public.user_has_permission((storage.foldername(name))[2]::uuid, 'employees.update')
  );

DROP POLICY IF EXISTS avatars_employees_delete ON storage.objects;
CREATE POLICY avatars_employees_delete ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'employees'
    AND (storage.foldername(name))[2]::uuid IN (SELECT public.get_user_organizations())
    AND public.user_has_permission((storage.foldername(name))[2]::uuid, 'employees.update')
  );

-- Users' own avatar: unchanged from 030, already correctly self-scoped to
-- the caller's own auth identity -- not part of this migration's tightening.
DROP POLICY IF EXISTS avatars_users_manage ON storage.objects;
CREATE POLICY avatars_users_manage ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
