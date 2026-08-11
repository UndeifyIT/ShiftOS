-- 030_add_employee_avatar_and_storage.sql
-- Migration: add employee photo support (column + private Storage bucket)
-- Purpose: the Lovable frontend integration (docs/frontend/SHIFTOS-FRONTEND-FOUNDATION.md
-- addendum) requires optional employee and manager profile photos. users.avatar_url
-- already exists (002) and is already RLS-writable by its own owner via
-- user_self_manage, so only the employees column and Storage are new here.
--
-- Storage design: one private bucket, `avatars`, never public. Two path
-- prefixes, each with its own RLS scope:
--   employees/{organizationId}/{employeeId}/{filename}  — read/write open to
--     any active member of that organization (mirrors the tenant-isolation
--     join pattern used throughout 017/022; does not add branch-level
--     granularity — a documented, minor gap, not a silent one).
--   users/{authUserId}/{filename}                        — read/write scoped
--     to that auth identity only, matching the existing user_self_manage
--     policy on public.users.
-- Access is always via createSignedUrl() from the client; the bucket has no
-- public read policy and the service-role key is never used from apps/web.

ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS avatar_url text;

COMMENT ON COLUMN public.employees.avatar_url IS
  'Storage object path (not a public URL) under the private avatars bucket, e.g. employees/{organizationId}/{employeeId}/{filename}. Resolved to a signed URL by the client at render time. Optional.';

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', false)
ON CONFLICT (id) DO NOTHING;

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
  );

DROP POLICY IF EXISTS avatars_employees_update ON storage.objects;
CREATE POLICY avatars_employees_update ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'employees'
    AND (storage.foldername(name))[2]::uuid IN (SELECT public.get_user_organizations())
  );

DROP POLICY IF EXISTS avatars_employees_delete ON storage.objects;
CREATE POLICY avatars_employees_delete ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'employees'
    AND (storage.foldername(name))[2]::uuid IN (SELECT public.get_user_organizations())
  );

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
