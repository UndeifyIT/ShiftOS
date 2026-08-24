-- 046_add_organization_logo_storage_policy.sql
-- Migration: Storage RLS for organization logos in the existing `avatars` bucket
-- Purpose: the Onboarding wizard rebuild's new Organization step needs an
-- optional logo upload (docs/superpowers/specs/2026-08-24-onboarding-wizard-
-- rebuild-design.md, decision 2). No new bucket or table is needed -- the
-- private `avatars` bucket already exists (030) -- but its RLS only
-- recognizes `employees/{organizationId}/...` and `users/{authUserId}/...`
-- path prefixes; an `organizations/{organizationId}/...` prefix would be
-- silently denied by every existing policy (none of them match it).
--
-- Scope mirrors 030's own `avatars_employees_*` policies exactly: any
-- active member of the organization (via get_user_organizations()) can
-- read/write/update/delete that organization's own logo object -- same
-- tenant-isolation join pattern, no new authorization concept introduced.

DROP POLICY IF EXISTS avatars_organizations_read ON storage.objects;
CREATE POLICY avatars_organizations_read ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'organizations'
    AND (storage.foldername(name))[2]::uuid IN (SELECT public.get_user_organizations())
  );

DROP POLICY IF EXISTS avatars_organizations_write ON storage.objects;
CREATE POLICY avatars_organizations_write ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'organizations'
    AND (storage.foldername(name))[2]::uuid IN (SELECT public.get_user_organizations())
  );

DROP POLICY IF EXISTS avatars_organizations_update ON storage.objects;
CREATE POLICY avatars_organizations_update ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'organizations'
    AND (storage.foldername(name))[2]::uuid IN (SELECT public.get_user_organizations())
  );

DROP POLICY IF EXISTS avatars_organizations_delete ON storage.objects;
CREATE POLICY avatars_organizations_delete ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'organizations'
    AND (storage.foldername(name))[2]::uuid IN (SELECT public.get_user_organizations())
  );
