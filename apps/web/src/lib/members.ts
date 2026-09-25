import type { Member } from '../types/domain.js';

/**
 * Matching a person's ShiftOS login to their employee record is done by
 * email, and both sides can be missing one — an employee added without an
 * address, or a member whose user row has none. Comparing those directly
 * throws on null, which unmounts the whole page (React 18), so every screen
 * that pairs the two goes through here.
 */

/** A case-insensitive key for an email, or null when there is nothing to match on. */
export function emailKey(email: string | null | undefined): string | null {
  const value = email?.trim().toLowerCase();
  return value ? value : null;
}

/** email → role name, over the active members that actually have an email. */
export function roleNameByEmail(members: Member[]): Map<string, string> {
  const byEmail = new Map<string, string>();
  for (const member of members) {
    if (!member.is_active || member.deleted_at) continue;
    const key = emailKey(member.user_email);
    if (key) byEmail.set(key, member.role_name);
  }
  return byEmail;
}

/** The active member whose login is this email, if there is one. */
export function memberForEmail(members: Member[], email: string | null | undefined): Member | undefined {
  const key = emailKey(email);
  if (!key) return undefined;
  return members.find((member) => member.is_active && !member.deleted_at && emailKey(member.user_email) === key);
}
