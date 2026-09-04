import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, TEST_FIXTURES, type TestContext } from '../testEnv.js';

interface MyContextResult {
  userId: string;
  organizationId: string;
  membershipId: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  branchAccess: { isOrgWide: boolean; branchIds: string[]; singleBranchId: string | null };
  accessibleOrganizationIds: string[];
  emailFlaggedDisposable: boolean;
}

/**
 * Pre-existing non-Owner fixture users in the same "ShiftOS Test Org" as
 * TEST_FIXTURES (left from earlier manual verification, not created by this
 * test — see testEnv.ts's own comment on that org). Verified live before use
 * (not just assumed from a migration/seed script):
 *  - the Employee fixture holds exactly one organization_member_branch_access
 *    grant, for TEST_FIXTURES.branchId — the "exactly one accessible branch"
 *    case singleBranchId exists for.
 *  - the Admin fixture holds four such grants — the "several branches, still
 *    not single-branch" case, distinct from the Owner's org-wide (isOrgWide)
 *    null case already covered below.
 * Both roles have grants_org_wide_branch_access = false, so neither is
 * conflated with the Owner's org-wide null case.
 */
const SINGLE_BRANCH_EMPLOYEE_AUTH_USER_ID = 'beb9eeb3-c6bf-4896-8486-f9e1ce255a55';
const MULTI_BRANCH_ADMIN_AUTH_USER_ID = 'a1d47f0d-c624-4886-b3be-3ca6b37f1e47';

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

  describe('branchAccess.singleBranchId (Task 10)', () => {
    it('is null for an org-wide (Owner) caller, even though isOrgWide implies access to every branch', async () => {
      const result = await ctx.call<MyContextResult>('get_my_context', {}, TEST_FIXTURES.ownerAuthUserId);

      expect(result.branchAccess.isOrgWide).toBe(true);
      expect(result.branchAccess.singleBranchId).toBeNull();
    });

    it('is the branch id for a non-org-wide caller scoped to exactly one branch', async () => {
      const result = await ctx.call<MyContextResult>('get_my_context', {}, SINGLE_BRANCH_EMPLOYEE_AUTH_USER_ID);

      expect(result.branchAccess.isOrgWide).toBe(false);
      expect(result.branchAccess.branchIds).toEqual([TEST_FIXTURES.branchId]);
      expect(result.branchAccess.singleBranchId).toBe(TEST_FIXTURES.branchId);
    });

    it('is null for a non-org-wide caller scoped to several branches', async () => {
      const result = await ctx.call<MyContextResult>('get_my_context', {}, MULTI_BRANCH_ADMIN_AUTH_USER_ID);

      expect(result.branchAccess.isOrgWide).toBe(false);
      expect(result.branchAccess.branchIds.length).toBeGreaterThan(1);
      expect(result.branchAccess.singleBranchId).toBeNull();
    });
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
