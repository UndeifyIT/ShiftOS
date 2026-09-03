import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, TEST_FIXTURES, type TestContext } from '../testEnv.js';

/**
 * "Employee" role in the shared "ShiftOS Test Org" fixture (see testEnv.ts's
 * own comment on that org) — non-org-wide, active, invitable. Verified live
 * before use (SELECT id, name, is_active, grants_org_wide_branch_access FROM
 * roles WHERE organization_id = TEST_FIXTURES.organizationId).
 */
const EMPLOYEE_ROLE_ID = '02719a6d-3318-4d6d-9a62-11cb9eb53215';

interface InvitationResult {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
  expires_at: string;
}

/**
 * Task 3 (docs/superpowers/specs/2026-09-03-onboarding-ux-audit-design.md §2
 * Phase 3, migration 055): invite_member/resend_invitation no longer require
 * firstName/lastName — the invitee sets their own name at CompleteProfilePage
 * after accepting, so collecting it at invite time was pure redundant data
 * entry. These tests exercise invite_member/resend_invitation's own
 * validation and DB writes against the real dev database (055 has been
 * applied there — see this task's report for how), not whether Supabase
 * Auth's invite-email pipeline itself works end to end (that stays a live,
 * manual check per this feature's testing strategy doc, and is deliberately
 * out of scope here).
 *
 * inviteUser is stubbed instead of using the real SupabaseAuthProvider
 * (context.authProvider) so these tests never send a real email or create a
 * real auth.users row — the stub is a plain structural implementation of
 * AuthenticationProvider (packages/auth/src/index.ts) rather than importing
 * that type, so this package doesn't need a new @shiftos/auth workspace
 * dependency just for a test-only type annotation; registry.execute's
 * authProvider parameter is passed the stub via an `as never` cast for the
 * same reason.
 */
function createStubAuthProvider() {
  const inviteCalls: Array<{ email: string; firstName?: string; lastName?: string; organizationId: string; roleId?: string }> = [];
  return {
    inviteCalls,
    signIn: async () => {
      throw new Error('not implemented in test stub');
    },
    signOut: async () => {},
    getCurrentUser: async () => null,
    refreshSession: async () => null,
    requestPasswordReset: async () => {},
    confirmPasswordReset: async () => {},
    inviteUser: async (email: string, firstName: string | undefined, lastName: string | undefined, organizationId: string, roleId?: string) => {
      inviteCalls.push({ email, firstName, lastName, organizationId, roleId });
      return { invitedEmail: email };
    }
  };
}

function uniqueEmail(label: string): string {
  return `task3-${label}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

describe('invitations integration (Task 3 — optional names, resend)', () => {
  let ctx: TestContext;
  const invitationIds: string[] = [];

  beforeAll(() => {
    ctx = createTestContext();
  });

  afterAll(async () => {
    if (invitationIds.length > 0) {
      await ctx.client.query('DELETE FROM invitation_branch_access WHERE invitation_id = ANY($1::uuid[])', [invitationIds]);
      await ctx.client.query('DELETE FROM invitations WHERE id = ANY($1::uuid[])', [invitationIds]);
    }
    await ctx.client.close();
  });

  it('invite_member succeeds with no firstName/lastName at all and stores null (055)', async () => {
    const stub = createStubAuthProvider();
    const email = uniqueEmail('no-name');

    const result = await ctx.registry.execute(
      ctx.client,
      'invite_member',
      {
        authUserId: TEST_FIXTURES.ownerAuthUserId,
        organizationId: TEST_FIXTURES.organizationId,
        input: { email, roleId: EMPLOYEE_ROLE_ID, branchIds: [TEST_FIXTURES.branchId] }
      },
      stub as never
    );

    expect(result.success).toBe(true);
    const invitation = result.data as InvitationResult;
    invitationIds.push(invitation.id);
    expect(invitation.email).toBe(email);
    expect(invitation.first_name).toBeNull();
    expect(invitation.last_name).toBeNull();
    expect(invitation.status).toBe('pending');

    // The Supabase Auth invite call itself must not require a name either —
    // confirms the whole path (RPC input parsing -> MembershipService ->
    // AuthenticationProvider.inviteUser) tolerates the omission, not just the
    // DB write.
    expect(stub.inviteCalls).toHaveLength(1);
    expect(stub.inviteCalls[0].firstName).toBeUndefined();
    expect(stub.inviteCalls[0].lastName).toBeUndefined();
  });

  it('invite_member still accepts an explicit firstName/lastName for backward compatibility', async () => {
    const stub = createStubAuthProvider();
    const email = uniqueEmail('with-name');

    const result = await ctx.registry.execute(
      ctx.client,
      'invite_member',
      {
        authUserId: TEST_FIXTURES.ownerAuthUserId,
        organizationId: TEST_FIXTURES.organizationId,
        input: { email, firstName: 'Ada', lastName: 'Lovelace', roleId: EMPLOYEE_ROLE_ID, branchIds: [TEST_FIXTURES.branchId] }
      },
      stub as never
    );

    expect(result.success).toBe(true);
    const invitation = result.data as InvitationResult;
    invitationIds.push(invitation.id);
    expect(invitation.first_name).toBe('Ada');
    expect(invitation.last_name).toBe('Lovelace');
  });

  it('invite_member still rejects a request missing email entirely', async () => {
    const stub = createStubAuthProvider();

    const result = await ctx.registry.execute(
      ctx.client,
      'invite_member',
      {
        authUserId: TEST_FIXTURES.ownerAuthUserId,
        organizationId: TEST_FIXTURES.organizationId,
        input: { roleId: EMPLOYEE_ROLE_ID, branchIds: [TEST_FIXTURES.branchId] }
      },
      stub as never
    );

    expect(result.success).toBe(false);
    expect(stub.inviteCalls).toHaveLength(0);
  });

  it('resend_invitation — confirmed genuinely missing before Task 3 — re-sends the invite and extends expires_at', async () => {
    const stub = createStubAuthProvider();
    const email = uniqueEmail('resend');

    const created = await ctx.registry.execute(
      ctx.client,
      'invite_member',
      {
        authUserId: TEST_FIXTURES.ownerAuthUserId,
        organizationId: TEST_FIXTURES.organizationId,
        input: { email, roleId: EMPLOYEE_ROLE_ID, branchIds: [TEST_FIXTURES.branchId] }
      },
      stub as never
    );
    expect(created.success).toBe(true);
    const invitation = created.data as InvitationResult;
    invitationIds.push(invitation.id);

    // Backdate expires_at so the resend's extension is unambiguous even if
    // this whole test runs within the same DB-clock second as creation.
    await ctx.client.query(`UPDATE invitations SET expires_at = now() - interval '1 day' WHERE id = $1`, [invitation.id]);

    const resent = await ctx.registry.execute(
      ctx.client,
      'resend_invitation',
      {
        authUserId: TEST_FIXTURES.ownerAuthUserId,
        organizationId: TEST_FIXTURES.organizationId,
        input: { invitationId: invitation.id }
      },
      stub as never
    );

    expect(resent.success).toBe(true);
    const resentInvitation = resent.data as InvitationResult;
    expect(new Date(resentInvitation.expires_at).getTime()).toBeGreaterThan(Date.now());
    expect(stub.inviteCalls).toHaveLength(2);
    expect(stub.inviteCalls[1].email).toBe(email);
  });

  it('resend_invitation rejects an invitation that has already been revoked', async () => {
    const stub = createStubAuthProvider();
    const email = uniqueEmail('revoked');

    const created = await ctx.registry.execute(
      ctx.client,
      'invite_member',
      {
        authUserId: TEST_FIXTURES.ownerAuthUserId,
        organizationId: TEST_FIXTURES.organizationId,
        input: { email, roleId: EMPLOYEE_ROLE_ID, branchIds: [TEST_FIXTURES.branchId] }
      },
      stub as never
    );
    const invitation = created.data as InvitationResult;
    invitationIds.push(invitation.id);

    const revoked = await ctx.registry.execute(
      ctx.client,
      'revoke_invitation',
      { authUserId: TEST_FIXTURES.ownerAuthUserId, organizationId: TEST_FIXTURES.organizationId, input: { invitationId: invitation.id } },
      stub as never
    );
    expect(revoked.success).toBe(true);

    const resendResult = await ctx.registry.execute(
      ctx.client,
      'resend_invitation',
      { authUserId: TEST_FIXTURES.ownerAuthUserId, organizationId: TEST_FIXTURES.organizationId, input: { invitationId: invitation.id } },
      stub as never
    );
    expect(resendResult.success).toBe(false);
    // Only the original invite_member call should have reached the auth
    // provider — resend must fail before re-sending the email.
    expect(stub.inviteCalls).toHaveLength(1);
  });
});
