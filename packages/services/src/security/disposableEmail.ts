import { DISPOSABLE_EMAIL_DOMAINS } from './disposableDomains.generated.js';

/**
 * Normalizes an email address for disposable-domain checks: trims
 * surrounding whitespace and lowercases only the domain (everything after
 * the last '@'). The local part (before '@') is left exactly as typed --
 * no lowercasing, no '+alias' stripping, no other normalization. This
 * mirrors the exact rule used by the Postgres side
 * (`lower(split_part(p_email, '@', 2))` in is_disposable_email_domain(),
 * supabase/migrations/051_create_disposable_email_domains.sql) so the two
 * layers can never disagree about what counts as "the domain".
 *
 * `john@gmail.com` and `john+test@gmail.com` normalize to the same domain
 * but stay distinct full email strings -- this function never collapses
 * '+' aliases.
 */
export function normalizeEmail(email: string): { email: string; domain: string } {
  const trimmed = email.trim();
  const atIndex = trimmed.lastIndexOf('@');
  if (atIndex === -1) {
    return { email: trimmed, domain: '' };
  }
  const localPart = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1).toLowerCase();
  return { email: `${localPart}@${domain}`, domain };
}

/**
 * Exact-match only, never substring: checks whether `domain` is present in
 * the generated disposable-domain set (packages/services/src/security/
 * disposableDomains.generated.ts, produced by the same generator script and
 * mailchecker snapshot as the Postgres table). Lowercases its input itself
 * (mirroring the Postgres side's own `lower()` call) so callers can pass a
 * raw domain and still get a correct exact-match lookup.
 */
export function isDisposableDomain(domain: string): boolean {
  return DISPOSABLE_EMAIL_DOMAINS.has(domain.toLowerCase());
}
