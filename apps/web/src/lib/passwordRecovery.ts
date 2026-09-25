import { useSyncExternalStore } from 'react';
import { supabase } from './supabase.js';

/*
 * A password-reset link signs the person in (Supabase's recovery session) —
 * which, left alone, drops them straight into the app with no way to set the
 * new password. So a recovery sign-in is remembered for this tab until the
 * password is actually changed (or they sign out), and App shows the Reset
 * Password page instead of the app while it lasts.
 *
 * Recognised two ways, so it works wherever the link lands (Supabase falls
 * back to the Site URL when /reset-password isn't in its redirect allowlist):
 * the `type=recovery` the link carries in the URL fragment, and the client's
 * PASSWORD_RECOVERY auth event.
 */

const KEY = 'shiftos.passwordRecovery';
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return window.sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

let active = read();

function set(value: boolean): void {
  active = value;
  try {
    if (value) window.sessionStorage.setItem(KEY, '1');
    else window.sessionStorage.removeItem(KEY);
  } catch {
    // Private mode: the flag lasts until the page is reloaded.
  }
  listeners.forEach((listener) => listener());
}

// Read before the Supabase client consumes and clears the fragment.
if (typeof window !== 'undefined' && /(^|[#&?])type=recovery(&|$)/.test(`${window.location.hash}&${window.location.search}`)) set(true);

supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') set(true);
  if (event === 'SIGNED_OUT') set(false);
});

/** The new password is saved (or the reset abandoned by signing out): back to the normal app. */
export function endPasswordRecovery(): void {
  set(false);
}

export function usePasswordRecovery(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => active,
    () => false
  );
}
