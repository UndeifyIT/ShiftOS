-- 009_shifts_rls.sql
-- Enable row level security for tenant-owned shifts.
-- Policies should be added separately once the tenant/branch access model is finalized.

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
