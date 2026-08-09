import { createClient } from '@supabase/supabase-js';

/**
 * Browser-safe Supabase client. Only ever constructed with the public anon
 * key (VITE_SUPABASE_ANON_KEY) — Row Level Security is the actual security
 * boundary for anything reached through it (SEC-005), never key secrecy.
 *
 * This client is used for exactly three things, all RLS-safe by design:
 *   1. Supabase Auth (sign in/out, session, password reset) — SHARED-001-004.
 *   2. Self-inserting the caller's own `public.users` profile row after
 *      sign-up (RLS policy `user_self_manage`: auth_user_id = auth.uid()).
 *   3. `create_organization_with_owner` (WEB-001) and reading the caller's
 *      own accessible `organizations` rows (RLS: `get_user_organizations()`)
 *      — the only way to discover which org(s) a just-signed-in identity
 *      belongs to before any organizationId is known, which every other
 *      RPC operation requires as an input (see apiClient.ts).
 *
 * Every other domain operation (branches, employees, scheduling, etc.) goes
 * through apiClient.ts's callRpc(), never through this client directly.
 */
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
