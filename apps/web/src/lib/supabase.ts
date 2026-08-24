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

// Plain, non-sensitive flag (not the token itself) that Sign In's "Keep me
// signed in" checkbox writes before calling signIn(). Read fresh on every
// storage operation below rather than once at client-creation time, since
// the user's choice is only known after this client already exists.
const REMEMBER_ME_KEY = 'shiftos.rememberMe';

function remembersSession(): boolean {
  return window.localStorage.getItem(REMEMBER_ME_KEY) !== 'false';
}

// Routes Supabase's session/token writes to localStorage (persists across
// browser restarts) or sessionStorage (cleared when the tab/browser closes)
// depending on that flag, so "Keep me signed in" actually changes session
// persistence instead of being cosmetic. Defaults to localStorage when the
// flag has never been set, so pre-existing sessions and Sign Up's own
// auto-login are unaffected.
const sessionStorageAdapter = {
  getItem: (key: string) => window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key),
  setItem: (key: string, value: string) => {
    if (remembersSession()) {
      window.localStorage.setItem(key, value);
      window.sessionStorage.removeItem(key);
    } else {
      window.sessionStorage.setItem(key, value);
      window.localStorage.removeItem(key);
    }
  },
  removeItem: (key: string) => {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }
};

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: sessionStorageAdapter
  }
});
