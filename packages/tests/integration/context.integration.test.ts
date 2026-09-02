import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, TEST_FIXTURES, type TestContext } from '../testEnv.js';

interface MyContextResult {
  userId: string;
  organizationId: string;
  membershipId: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  branchAccess: { isOrgWide: boolean; branchIds: string[] };
  accessibleOrganizationIds: string[];
  emailFlaggedDisposable: boolean;
}

/**
 * get_my_context (packages/api/src/operations/context.ts) — covers the
 * pre-existing shape plus Task 4's emailFlaggedDisposable field and its
 * security_events side effect. The Owner fixture's real email
 * (undeify2026+shiftostest1@gmail.com) is temporarily swapped to a known
 * disposable domain and always restored, including on failure, since other
 * integration tests share this same fixture user.
 */
describe('get_my_context integration', () => {
  let ctx: TestContext;
  let ownerUserId: string;
  let originalEmail: string;

  beforeAll(async () => {
    ctx = createTestContext();
    const rows = await ctx.client.query<{ id: string; email: string }>('SELECT id, email FROM users WHERE auth_user_id = $1', [
      TEST_FIXTURES.ownerAuthUserId
    ]);
    const owner = rows[0];
    if (!owner) {
      throw new Error(`Fixture owner user (auth_user_id ${TEST_FIXTURES.ownerAuthUserId}) not found`);
    }
    ownerUserId = owner.id;
    originalEmail = owner.email;
  });

  afterAll(async () => {
    // Safety net in case a mid-test failure skipped the per-test restore below.
    await ctx.client.query('UPDATE users SET email = $1 WHERE id = $2', [originalEmail, ownerUserId]);
    await ctx.client.close();
  });

  it('returns the full existing shape plus emailFlaggedDisposable: false for a non-disposable email', async () => {
    const result = await ctx.call<MyContextResult>('get_my_context', {}, TEST_FIXTURES.ownerAuthUserId);

    expect(result.userId).toBe(ownerUserId);
    expect(result.organizationId).toBe(TEST_FIXTURES.organizationId);
    expect(Array.isArray(result.permissions)).toBe(true);
    expect(result.branchAccess).toBeDefined();
    expect(Array.isArray(result.accessibleOrganizationIds)).toBe(true);
    expect(typeof result.emailFlaggedDisposable).toBe('boolean');
    expect(result.emailFlaggedDisposable).toBe(false);
  });

  it('flags emailFlaggedDisposable: true for a disposable-domain email and records a security event', async () => {
    const beforeRows = await ctx.client.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM security_events WHERE user_id = $1 AND event_type = 'EXISTING_ACCOUNT_DISPOSABLE_EMAIL_FLAGGED'",
      [ownerUserId]
    );
    const beforeCount = Number(beforeRows[0]?.count ?? 0);

    try {
      await ctx.client.query('UPDATE users SET email = $1 WHERE id = $2', [`context-test-${Date.now()}@zzz.com`, ownerUserId]);

      const result = await ctx.call<MyContextResult>('get_my_context', {}, TEST_FIXTURES.ownerAuthUserId);
      expect(result.emailFlaggedDisposable).toBe(true);

      const afterRows = await ctx.client.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM security_events WHERE user_id = $1 AND event_type = 'EXISTING_ACCOUNT_DISPOSABLE_EMAIL_FLAGGED'",
        [ownerUserId]
      );
      expect(Number(afterRows[0]?.count ?? 0)).toBe(beforeCount + 1);
    } finally {
      await ctx.client.query('UPDATE users SET email = $1 WHERE id = $2', [originalEmail, ownerUserId]);
    }
  });
});
