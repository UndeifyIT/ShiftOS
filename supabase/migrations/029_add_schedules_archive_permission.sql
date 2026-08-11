-- 029_add_schedules_archive_permission.sql
-- Migration: add the one permission code missed in 028 for consistency
-- Purpose: 028 seeded branches.archive, employees.archive, and shifts.archive
-- following a consistent per-domain archive-permission convention, but
-- omitted schedules.archive despite schedules also being soft-deletable
-- (schedules.deleted_at) and having an Archived lifecycle state (SCH-002).
-- Adding it now, before SchedulingService is implemented against it, rather
-- than reusing schedules.update for a distinct, higher-impact action.

INSERT INTO public.permissions (code, module, name, description)
VALUES ('schedules.archive', 'scheduling', 'Archive schedule', 'Archive (soft-delete) a schedule.')
ON CONFLICT (code) DO NOTHING;
