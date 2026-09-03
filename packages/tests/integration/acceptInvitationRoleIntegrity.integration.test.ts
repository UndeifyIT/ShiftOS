import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatabaseError } from '@shiftos/errors';
import { createTestContext, TEST_FIXTURES, type TestContext } from '../testEnv.js';

/**
 * Regression test for spec §1.2 / Task 4 (docs/superpowers/specs/2026-09-03-
 * onboarding-ux-audit-design.md): "Role tampering via direct API calls --
 * not found." Phase 0's audit read accept_invitation()
 * (031_add_supervisor_role_and_invitations.sql:377-431, hardened in 033) and
 * concluded it takes zero client-supplied identity/role/org/branch
 * parameters -- role_id and branch grants come entirely from the
 * server-written `invitations`/`invitation_branch_access` rows, keyed off
 * the caller's own verified `auth.uid()`. Nothing before this file asserted
 * that server-side, against the live database.
 *
 * Since accept_invitation() genuinely takes no parameters, there is no
 * literal "pass role_id=X" tamper attempt to make -- the only surfaces an
 * attacker actually has are (a) a forged/extended JWT with bogus extra
 * claims naming a different role/org/branch, and (b) trying to call the
 * function with an argument at all. Both are exercised below, directly
 * against Postgres (not through PostgREST), the same way
 * hookBeforeUserCreated.integration.test.ts exercises a raw SQL function.
 * auth.uid() itself is real Supabase Auth machinery (`select coalesce(
 * nullif(current_setting('request.jwt.claim.sub', true), ''),
 * (current_setting('request.jwt.claims', true)::jsonb ->> 'sub'))::uuid`),
 * so `set_config('request.jwt.claims', ..., true)` (transaction-local) run
 * on the same connection as the RPC call is a faithful way to authenticate
 * as a specific test user without needing a real Supabase Auth session --
 * mirrors what PostgREST itself does per-request, just done here by hand.
 * `true` (the "is_local" parameter) is essential: it scopes the setting to
 * the current transaction only, so it can never leak onto another test's
 * connection when the pool reuses it.
 *
 * Test rows are real invitations/users/memberships in the shared "ShiftOS
 * Test Org" fixture (see testEnv.ts's own comment on that org), fully
 * cleaned up in afterAll -- this never touches the pre-existing fixture
 * rows themselves (TEST_FIXTURES.*), only ones created here.
 */
const SUPERVISOR_ROLE_ID = 'b7e66f9e-b191-4c95-afa5-925fe4d94de1';
const ADMIN_ROLE_ID = '800609c0-e698-4ab4-bc58-1a17eabb255d';
/** "Ikeja Branch" -- a second real branch in the fixture org, distinct from TEST_FIXTURES.branchId ("Main Branch"). */
const IKEJA_BRANCH_ID = 'bcb7aef6-dec0-47a9-9c5f-698fbe0cf1f3';
const FOREIGN_ORG_ID = '11111111-1111-1111-1111-111111111111';

function uniqueEmail(label: string): string {
  return `task4-${label}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

interface Invitee {
  userId: string;
  authUserId: string;
  email: string;
}

describe('accept_invitation role/org/branch integrity (Task 4 — regression for spec §1.2)', () => {
  let ctx: TestContext;
  let ownerUserId: string;
  const userIds: string[] = [];
  const invitationIds: string[] = [];
  const membershipIds: string[] = [];

  beforeAll(async () => {
    ctx = createTestContext();
    const rows = await ctx.client.query<{ id: string }>('SELECT id FROM users WHERE auth_user_id = $1', [
      TEST_FIXTURES.ownerAuthUserId
    ]);
    if (!rows[0]) {
      throw new Error(`Fixture owner user (auth_user_id ${TEST_FIXTURES.ownerAuthUserId}) not found`);
    }
    ownerUserId = rows[0].id;
  });

  afterAll(async () => {
    if (membershipIds.length > 0) {
      await ctx.client.query('DELETE FROM organization_member_branch_access WHERE membership_id = ANY($1::uuid[])', [membershipIds]);
      await ctx.client.query('DELETE FROM organization_memberships WHERE id = ANY($1::uuid[])', [membershipIds]);
    }
    if (invitationIds.length > 0) {
      await ctx.client.query('DELETE FROM invitation_branch_access WHERE invitation_id = ANY($1::uuid[])', [invitationIds]);
      await ctx.client.query('DELETE FROM invitations WHERE id = ANY($1::uuid[])', [invitationIds]);
    }
    if (userIds.length > 0) {
      await ctx.client.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [userIds]);
    }
    await ctx.client.close();
  });

  /**
   * A brand-new synthetic identity: a real public.users row with a random,
   * never-before-seen auth_user_id. public.users.auth_user_id is explicitly
   * "maintained by the application and is not a DB foreign key to the
   * Supabase auth schema" (002_create_identity_access.sql), so this is a
   * faithful stand-in for a real invitee without needing a real
   * auth.users/Supabase Auth signup.
   */
  async function createInvitee(label: string): Promise<Invitee> {
    const authUserId = randomUUID();
    const email = uniqueEmail(label);
    const rows = await ctx.client.query<{ id: string }>(
      `INSERT INTO users (auth_user_id, first_name, last_name, email, is_active)
       VALUES ($1, 'Task4', 'Tester', $2, true) RETURNING id`,
      [authUserId, email]
    );
    const userId = rows[0].id;
    userIds.push(userId);
    return { userId, authUserId, email };
  }

  async function createInvitation(email: string, roleId: string, branchIds: string[]): Promise<string> {
    const rows = await ctx.client.query<{ id: string }>(
      `INSERT INTO invitations (organization_id, email, role_id, status, invited_by, expires_at)
       VALUES ($1, $2, $3, 'pending', $4, now() + interval '7 days') RETURNING id`,
      [TEST_FIXTURES.organizationId, email, roleId, ownerUserId]
    );
    const invitationId = rows[0].id;
    invitationIds.push(invitationId);
    for (const branchId of branchIds) {
      await ctx.client.query(
        `INSERT INTO invitation_branch_access (organization_id, invitation_id, branch_id) VALUES ($1, $2, $3)`,
        [TEST_FIXTURES.organizationId, invitationId, branchId]
      );
    }
    return invitationId;
  }

  /** Runs `sql` on a single connection with auth.uid() faked as `authUserId`, with `extraClaims` merged into the JWT alongside `sub` (simulating a forged token carrying bogus extra fields). */
  async function withFakeAuth<T>(authUserId: string, extraClaims: Record<string, unknown>, sql: (run: <U extends Record<string, unknown>>(text: string, params?: unknown[]) => Promise<U[]>) => Promise<T>): Promise<T> {
    return ctx.client.transaction(async (trx) => {
      const claims = { sub: authUserId, ...extraClaims };
      await trx.query("select set_config('request.jwt.claims', $1::text, true)", [JSON.stringify(claims)]);
      return sql(trx.query.bind(trx));
    });
  }

  it('grants exactly the role and branch the invitation row specifies, ignoring forged extra JWT claims naming a different role/org/branch', async () => {
    const invitee = await createInvitee('forged-claims');
    const invitationId = await createInvitation(invitee.email, SUPERVISOR_ROLE_ID, [IKEJA_BRANCH_ID]);

    // A forged token could plausibly try to smuggle in claims naming a more
    // powerful role, a different organization, or a different branch.
    // accept_invitation() takes no parameters and reads nothing from the
    // JWT except auth.uid() (the 'sub' claim, resolved through
    // public.users.auth_user_id -> email) -- these must be silently ignored.
    const membershipId = await withFakeAuth(
      invitee.authUserId,
      { role_id: ADMIN_ROLE_ID, role: 'admin', organization_id: FOREIGN_ORG_ID, branch_id: TEST_FIXTURES.branchId },
      async (run) => {
        const rows = await run<{ membership_id: string }>('select accept_invitation() as membership_id');
        return rows[0]?.membership_id;
      }
    );
    expect(membershipId).toBeTruthy();
    membershipIds.push(membershipId as string);

    const membership = await ctx.client.query<{ organization_id: string; user_id: string; role_id: string; is_active: boolean }>(
      'SELECT organization_id, user_id, role_id, is_active FROM organization_memberships WHERE id = $1',
      [membershipId]
    );
    expect(membership).toHaveLength(1);
    expect(membership[0].organization_id).toBe(TEST_FIXTURES.organizationId); // not the forged FOREIGN_ORG_ID
    expect(membership[0].user_id).toBe(invitee.userId);
    expect(membership[0].role_id).toBe(SUPERVISOR_ROLE_ID); // not ADMIN_ROLE_ID from the forged claim
    expect(membership[0].is_active).toBe(true);

    const branchAccess = await ctx.client.query<{ branch_id: string }>(
      'SELECT branch_id FROM organization_member_branch_access WHERE membership_id = $1',
      [membershipId]
    );
    expect(branchAccess.map((r) => r.branch_id)).toEqual([IKEJA_BRANCH_ID]); // not TEST_FIXTURES.branchId from the forged claim

    const invitationRow = await ctx.client.query<{ status: string; accepted_by: string }>(
      'SELECT status, accepted_by FROM invitations WHERE id = $1',
      [invitationId]
    );
    expect(invitationRow[0].status).toBe('accepted');
    expect(invitationRow[0].accepted_by).toBe(invitee.userId);
  });

  it('takes no parameters at all -- a call attempting to pass an argument fails outright rather than being silently accepted', async () => {
    const invitee = await createInvitee('positional-arg');

    let caught: unknown;
    try {
      await ctx.client.transaction(async (trx) => {
        await trx.query("select set_config('request.jwt.claims', $1::text, true)", [JSON.stringify({ sub: invitee.authUserId })]);
        // Attempting to smuggle an organization id in as a positional
        // argument -- no such function signature exists, which is itself
        // the proof there is no parameter surface here for a client to
        // exploit (unlike, say, a REST endpoint that would just ignore an
        // unrecognized field).
        return trx.query('select accept_invitation($1::uuid)', [TEST_FIXTURES.organizationId]);
      });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(DatabaseError);
    const pgError = (caught as DatabaseError).cause as { code?: string } | undefined;
    expect(pgError?.code).toBe('42883'); // undefined_function

    const membership = await ctx.client.query('SELECT id FROM organization_memberships WHERE user_id = $1', [invitee.userId]);
    expect(membership).toHaveLength(0);
  });

  it("only ever matches the caller's own verified email -- an authenticated user with no invitation of their own is refused, even while another email's invitation is pending", async () => {
    const invitee = await createInvitee('no-invitation-of-own');
    const other = await createInvitee('bystander');
    await createInvitation(other.email, SUPERVISOR_ROLE_ID, [IKEJA_BRANCH_ID]); // belongs to `other`, not `invitee`

    let caught: unknown;
    try {
      await withFakeAuth(invitee.authUserId, {}, (run) => run('select accept_invitation()'));
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(DatabaseError);
    const pgError = (caught as DatabaseError).cause as { message?: string; code?: string } | undefined;
    expect(pgError?.code).toBe('P0001');
    expect(pgError?.message).toBe('No pending invitation found for this account');

    const membership = await ctx.client.query('SELECT id FROM organization_memberships WHERE user_id = $1', [invitee.userId]);
    expect(membership).toHaveLength(0);
  });
});
