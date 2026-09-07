-- 061_backfill_shift_template_permissions_for_owner.sql
-- Migration: backfill shifttemplates.* permissions to existing Owner roles.
--
-- Migration 060 added shifttemplates.read and shifttemplates.create permissions
-- but only granted them to the Supervisor role for new organizations. This
-- migration backfills those permissions onto every existing org-wide role
-- (the "Owner" role, identified by grants_org_wide_branch_access = true),
-- following the same pattern as 035 for tasks/announcements permissions.

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.is_active = true
WHERE r.grants_org_wide_branch_access = true
  AND p.code IN ('shifttemplates.read', 'shifttemplates.create')
ON CONFLICT (role_id, permission_id) DO NOTHING;
