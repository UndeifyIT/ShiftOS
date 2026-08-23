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
