import { DISPOSABLE_EMAIL_DOMAINS } from './disposableDomains.generated.js';

/**
 * Normalizes an email address for disposable-domain checks: trims
 * surrounding whitespace and lowercases only the domain. The local part
 * (before '@') is left exactly as typed -- no lowercasing, no '+alias'
 * stripping, no other normalization.
 *
 * "The domain" is deliberately defined as everything between the FIRST and
 * SECOND '@', which is precisely `split_part(p_email, '@', 2)` -- the rule
 * the Postgres side uses (`lower(split_part(p_email, '@', 2))` in
 * is_disposable_email_domain(),
 * supabase/migrations/051_create_disposable_email_domains.sql). An earlier
 * version of this function used `lastIndexOf('@')` instead, which agrees
 * with Postgres for every address containing exactly one '@' but diverges
 * for a malformed multi-'@' input (`a@b@zzz.com` -> `zzz.com` here vs `b`
 * in Postgres). No such address can reach either layer through a real
 * signup -- GoTrue rejects it upstream -- but the two layers now genuinely
 * agree rather than merely appearing to.
 *
 * When there is a second '@', the remainder of the string (from that '@'
 * onward) is preserved verbatim in the returned `email`, so nothing is
 * silently dropped; only the domain segment is lowercased.
 *
 * `john@gmail.com` and `john+test@gmail.com` normalize to the same domain
 * but stay distinct full email strings -- this function never collapses
 * '+' aliases.
 */
export function normalizeEmail(email: string): { email: string; domain: string } {
  const trimmed = email.trim();
  const firstAt = trimmed.indexOf('@');
  if (firstAt === -1) {
    return { email: trimmed, domain: '' };
  }
  const localPart = trimmed.slice(0, firstAt);
  const afterFirstAt = trimmed.slice(firstAt + 1);
  const secondAt = afterFirstAt.indexOf('@');
  const domain = (secondAt === -1 ? afterFirstAt : afterFirstAt.slice(0, secondAt)).toLowerCase();
  // Everything from the second '@' onward, kept exactly as typed.
  const remainder = secondAt === -1 ? '' : afterFirstAt.slice(secondAt);
  return { email: `${localPart}@${domain}${remainder}`, domain };
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
