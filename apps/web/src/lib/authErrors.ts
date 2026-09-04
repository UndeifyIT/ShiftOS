/**
 * Supabase-js v2 wraps a genuine fetch/network failure as
 * AuthRetryableFetchError (auth-js), distinct from a normal AuthError
 * (wrong password, expired link, etc). Used to render AuthStatusPanel's
 * "Network error" tone instead of a validation/auth error — these auth
 * calls don't go through apiClient.ts's existing NETWORK_ERROR handling,
 * which only covers the Tier-1 callRpc path.
 */
export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const name = 'name' in error ? String((error as { name: unknown }).name) : '';
  if (name === 'AuthRetryableFetchError') return true;
  const message = 'message' in error ? String((error as { message: unknown }).message).toLowerCase() : '';
  return message.includes('failed to fetch') || message.includes('network');
}

export interface AuthHashError {
  code: string | null;
  description: string | null;
}

/**
 * A bad/expired/consumed Supabase Auth magic link (invite, recovery, email
 * change, etc.) redirects the browser back to the app with the failure
 * encoded as a URL *hash* fragment, never a query param and never a session
 * -- e.g. `#error=access_denied&error_code=otp_expired&error_description=
 * Email+link+is+invalid+or+has+expired`. Detects the presence of Supabase's
 * `error` key generically, rather than matching specific known
 * `error_code`/`error_description` values, so any current or future shape of
 * this redirect (otp_expired, access_denied for other reasons, etc.) is
 * caught the same way. Returns null when the hash carries no error.
 */
export function parseAuthHashError(hash: string): AuthHashError | null {
  const trimmed = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!trimmed) return null;
  const params = new URLSearchParams(trimmed);
  if (!params.has('error')) return null;
  return {
    code: params.get('error_code'),
    description: params.get('error_description')
  };
}
