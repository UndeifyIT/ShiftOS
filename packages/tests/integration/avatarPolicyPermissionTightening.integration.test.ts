import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatabaseError } from '@shiftos/errors';
import { createTestContext, TEST_FIXTURES, type TestContext } from '../testEnv.js';

/**
 * Regression test for Task 9 (spec §2 Phase 11 / onboarding-ux-audit) —
 * supabase/migrations/058_apply_missing_avatars_bucket_and_tighten_employee_policies.sql
 * tightened avatars_employees_write/update/delete on storage.objects from
 * "any active org member" to a public.user_has_permission() check
 * (employees.create/employees.update). Live probes at the time confirmed
 * this worked, but were never turned into a committed test -- a future
 * migration that accidentally reverts or loosens the WITH CHECK/USING
 * clauses back to org-only would have had no automated signal catching it.
 * This file is that signal, covering the two properties the Storage-API
 * e2e coverage doesn't reach:
 *   (c) a caller without employees.create/employees.update in an org can no
 *       longer write/overwrite an employee's avatar there, but read access
 *       (unchanged by 058) still works.
 *   (d) a caller who holds employees.create/employees.update in a
 *       *different* org still cannot touch the first org's avatars, with a
 *       positive control in the same run proving that same caller CAN act
 *       under their own org's path -- so the rejection is genuine cross-org
 *       isolation, not a blanket-deny bug.
 *
 * Technique: DATABASE_URL (see testEnv.ts) connects as `postgres`, which has
 * rolbypassrls = true (confirmed live) -- RLS is never evaluated for that
 * role, so every probe below runs inside `ctx.client.transaction()` (a
 * single dedicated connection for the whole callback -- required, since
 * `SET LOCAL ROLE` and `set_config(..., true)` are both connection/
 * transaction-scoped and a bare `ctx.client.query()` may hop pooled
 * connections between calls) with `SET LOCAL ROLE authenticated` (confirmed
 * live: rolbypassrls = false) switching the executing role for the
 * remainder of the transaction, then `set_config('request.jwt.claims', ...)`
 * fakes auth.uid() exactly as
 * acceptInvitationRoleIntegrity.integration.test.ts already does for
 * accept_invitation() -- mirroring what PostgREST does per-request, just by
 * hand. `SET LOCAL`/`is_local=true` reset automatically at COMMIT/ROLLBACK,
 * so nothing leaks onto another test's pooled connection.
 *
 * DELETE is intentionally NOT covered here: storage.objects carries a
 * protect_objects_delete trigger (storage.protect_delete()) that
 * unconditionally rejects any raw-SQL DELETE ("Direct deletion from storage
 * tables is not allowed. Use the Storage API instead.", confirmed live via
 * pg_proc.prosrc) unless the session sets the custom GUC
 * storage.allow_delete_query = 'true' -- which this file DOES use, but only
 * for its own fixture teardown (a deliberate, documented escape hatch in
 * the trigger itself, run here as the bypassrls `postgres` connection, never
 * inside a faked-`authenticated` probe). Actually verifying the
 * avatars_employees_delete/cross-org DELETE policy therefore requires going
 * through the real Storage API with a real minted session (as Task 9's live
 * verification did) -- standing up that auth flow inside this repo's
 * Postgres-only integration-test harness was judged disproportionate for a
 * committed regression test, so it remains a documented gap here. INSERT
 * and UPDATE (evaluated via WITH CHECK / USING, the same clauses DELETE's
 * USING clause is copied from almost verbatim) plus the unchanged SELECT
 * policy give strong, if not 100%, coverage of the same authorization
 * surface.
 */

/** "ShiftOS Test Org 2" -- a second real, pre-existing organization distinct from TEST_FIXTURES.organizationId, used only for cross-org isolation (property d). */
const ORG_2 = '807e041c-cfb2-4b4c-94ef-990d3bf321bf';

/** A real, pre-existing "Admin" member of TEST_FIXTURES.organizationId confirmed live to hold employees.read only -- no employees.create/employees.update. */
const NO_EMPLOYEE_PERMISSION_EMAIL = 'undeify2026+shiftostest_admin1@gmail.com';

const TEST_MARKER = 'task9-avatarpolicy';

interface PermissionRow extends Record<string, unknown> {
  c: boolean;
  u: boolean;
}

function uniqueEmail(label: string): string {
  return `task9-avatarpolicy-${label}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

describe('avatars_employees_* Storage RLS -- permission tightening & cross-org isolation (Task 9 regression)', () => {
  let ctx: TestContext;
  let noPermissionAuthUserId: string;
  let foreignAuthUserId: string;
  let foreignUserId: string;
  let foreignMembershipId: string;
  /** Seeded once, read/written against across (c) and (d)'s reject-only probes; never actually mutated by any of them. */
  const existingOrgAAvatarPath = `employees/${TEST_FIXTURES.organizationId}/${TEST_FIXTURES.employeeId}/${TEST_MARKER}-existing.png`;

  /** Runs `fn` with the connection switched to the `authenticated` role and auth.uid() faked as `authUserId`, on one dedicated connection (required for SET LOCAL/set_config to take effect), auto-committing on success or rolling back on a thrown error (e.g. an expected RLS violation). */
  async function withFakeAuth<T>(authUserId: string, fn: (run: TestContext['client']['query']) => Promise<T>): Promise<T> {
    return ctx.client.transaction(async (trx) => {
      await trx.query('set local role authenticated');
      await trx.query("select set_config('request.jwt.claims', $1::text, true)", [JSON.stringify({ sub: authUserId, role: 'authenticated' })]);
      return fn(trx.query.bind(trx));
    });
  }

  async function expectRlsRejection(promise: Promise<unknown>): Promise<void> {
    let caught: unknown;
    try {
      await promise;
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(DatabaseError);
    const pgError = (caught as DatabaseError).cause as { code?: string; message?: string } | undefined;
    expect(pgError?.code).toBe('42501');
  }

  beforeAll(async () => {
    ctx = createTestContext();

    const noPermRows = await ctx.client.query<{ auth_user_id: string }>(
      `SELECT u.auth_user_id
       FROM public.users u
       JOIN public.organization_memberships om ON om.user_id = u.id
       WHERE u.email = $1 AND om.organization_id = $2 AND om.is_active = true`,
      [NO_EMPLOYEE_PERMISSION_EMAIL, TEST_FIXTURES.organizationId]
    );
    if (!noPermRows[0]) {
      throw new Error(`Fixture ${NO_EMPLOYEE_PERMISSION_EMAIL} not found as an active member of TEST_FIXTURES.organizationId`);
    }
    noPermissionAuthUserId = noPermRows[0].auth_user_id;

    const org2SupervisorRoleRows = await ctx.client.query<{ id: string }>(
      `SELECT id FROM public.roles WHERE organization_id = $1 AND name = 'Supervisor' AND is_active = true LIMIT 1`,
      [ORG_2]
    );
    if (!org2SupervisorRoleRows[0]) {
      throw new Error(`No active "Supervisor" role found in ORG_2 (${ORG_2})`);
    }
    const org2SupervisorRoleId = org2SupervisorRoleRows[0].id;

    // A throwaway user, real member of ORG_2 only (never TEST_FIXTURES.organizationId) --
    // mirrors acceptInvitationRoleIntegrity's createInvitee() pattern: a real
    // public.users row with a random, never-before-seen auth_user_id stands
    // in for a real identity without needing a real Supabase Auth signup.
    foreignAuthUserId = randomUUID();
    const foreignUserRows = await ctx.client.query<{ id: string }>(
      `INSERT INTO public.users (auth_user_id, first_name, last_name, email, is_active)
       VALUES ($1, 'Task9', 'ForeignOrg', $2, true) RETURNING id`,
      [foreignAuthUserId, uniqueEmail('foreign')]
    );
    foreignUserId = foreignUserRows[0].id;
    const membershipRows = await ctx.client.query<{ id: string }>(
      `INSERT INTO public.organization_memberships (organization_id, user_id, role_id, is_active)
       VALUES ($1, $2, $3, true) RETURNING id`,
      [ORG_2, foreignUserId, org2SupervisorRoleId]
    );
    foreignMembershipId = membershipRows[0].id;

    // Seed an existing avatar object as the bypassrls `postgres` connection
    // (standing in for "some permitted user already uploaded this photo") --
    // used only by SELECT/UPDATE probes below, never actually mutated by any
    // of them, so one seed row suffices for the whole file.
    await ctx.client.query(`INSERT INTO storage.objects (bucket_id, name, owner, metadata) VALUES ('avatars', $1, null, '{}'::jsonb)`, [
      existingOrgAAvatarPath
    ]);
  });

  afterAll(async () => {
    // storage.protect_objects_delete unconditionally blocks raw-SQL DELETE
    // on storage.objects unless storage.allow_delete_query = 'true' is set
    // for the session/transaction -- a deliberate escape hatch in the
    // trigger itself (confirmed live via pg_proc.prosrc), used here only for
    // this file's own fixture teardown, on the bypassrls `postgres`
    // connection -- never inside a faked-`authenticated` probe above.
    await ctx.client.transaction(async (trx) => {
      await trx.query("select set_config('storage.allow_delete_query', 'true', true)");
      await trx.query(`DELETE FROM storage.objects WHERE name LIKE $1`, [`%/${TEST_MARKER}-%`]);
    });

    if (foreignMembershipId) {
      await ctx.client.query('DELETE FROM public.organization_memberships WHERE id = $1', [foreignMembershipId]);
    }
    if (foreignUserId) {
      await ctx.client.query('DELETE FROM public.users WHERE id = $1', [foreignUserId]);
    }
    await ctx.client.close();
  });

  describe('property (c): permission tightening within TEST_FIXTURES.organizationId', () => {
    it('precondition: the fixture "Admin" member genuinely lacks employees.create AND employees.update', async () => {
      const rows = await withFakeAuth(noPermissionAuthUserId, (run) =>
        run<PermissionRow>("select public.user_has_permission($1, 'employees.create') as c, public.user_has_permission($1, 'employees.update') as u", [
          TEST_FIXTURES.organizationId
        ])
      );
      expect(rows[0]?.c).toBe(false);
      expect(rows[0]?.u).toBe(false);
    });

    it('rejects INSERT of a new employee avatar by a member without employees.create/employees.update', async () => {
      const newPath = `employees/${TEST_FIXTURES.organizationId}/${TEST_FIXTURES.employeeId}/${TEST_MARKER}-insert-${Date.now()}.png`;
      await expectRlsRejection(
        withFakeAuth(noPermissionAuthUserId, (run) =>
          run(`insert into storage.objects (bucket_id, name, owner, metadata) values ('avatars', $1, null, '{}'::jsonb)`, [newPath])
        )
      );
    });

    it('rejects UPDATE (overwrite) of an existing employee avatar by a member without employees.update', async () => {
      const rows = await withFakeAuth(noPermissionAuthUserId, (run) =>
        run(`update storage.objects set metadata = '{"x":1}'::jsonb where bucket_id = 'avatars' and name = $1 returning id`, [existingOrgAAvatarPath])
      );
      expect(rows).toHaveLength(0);
    });

    it('still allows SELECT (read) of an existing employee avatar -- the unchanged, non-tightened read policy', async () => {
      const rows = await withFakeAuth(noPermissionAuthUserId, (run) =>
        run('select 1 from storage.objects where bucket_id = $1 and name = $2', ['avatars', existingOrgAAvatarPath])
      );
      expect(rows).toHaveLength(1);
    });

    it("the existing avatar's content was never actually changed by the rejected UPDATE attempt", async () => {
      const rows = await ctx.client.query<{ metadata: unknown }>('select metadata from storage.objects where bucket_id = $1 and name = $2', [
        'avatars',
        existingOrgAAvatarPath
      ]);
      expect(rows[0]?.metadata).toEqual({});
    });
  });

  describe('property (d): cross-org isolation for a member who holds the permission, but in a different org', () => {
    it('precondition: the throwaway user genuinely holds employees.create AND employees.update, but only in ORG_2', async () => {
      const rows = await withFakeAuth(foreignAuthUserId, (run) =>
        run<PermissionRow>("select public.user_has_permission($1, 'employees.create') as c, public.user_has_permission($1, 'employees.update') as u", [
          ORG_2
        ])
      );
      expect(rows[0]?.c).toBe(true);
      expect(rows[0]?.u).toBe(true);
    });

    it('precondition: the throwaway user is NOT in get_user_organizations() for TEST_FIXTURES.organizationId', async () => {
      const rows = await withFakeAuth(foreignAuthUserId, (run) =>
        run<{ is_member: boolean }>('select $1::uuid in (select public.get_user_organizations()) as is_member', [TEST_FIXTURES.organizationId])
      );
      expect(rows[0]?.is_member).toBe(false);
    });

    it("rejects SELECT of TEST_FIXTURES.organizationId's avatar (0 rows visible), despite holding the equivalent permission in ORG_2", async () => {
      const rows = await withFakeAuth(foreignAuthUserId, (run) =>
        run('select 1 from storage.objects where bucket_id = $1 and name = $2', ['avatars', existingOrgAAvatarPath])
      );
      expect(rows).toHaveLength(0);
    });

    it('rejects INSERT under a TEST_FIXTURES.organizationId path', async () => {
      const newPath = `employees/${TEST_FIXTURES.organizationId}/${TEST_FIXTURES.employeeId}/${TEST_MARKER}-crossorg-insert-${Date.now()}.png`;
      await expectRlsRejection(
        withFakeAuth(foreignAuthUserId, (run) =>
          run(`insert into storage.objects (bucket_id, name, owner, metadata) values ('avatars', $1, null, '{}'::jsonb)`, [newPath])
        )
      );
    });

    it('rejects UPDATE of an existing TEST_FIXTURES.organizationId avatar', async () => {
      const rows = await withFakeAuth(foreignAuthUserId, (run) =>
        run(`update storage.objects set metadata = '{"x":1}'::jsonb where bucket_id = 'avatars' and name = $1 returning id`, [existingOrgAAvatarPath])
      );
      expect(rows).toHaveLength(0);
    });

    it('positive control: the SAME user CAN insert+read under their OWN org (ORG_2) path -- proving the rejections above are isolation, not a broken/blanket-deny policy', async () => {
      const ownOrgPath = `employees/${ORG_2}/${randomUUID()}/${TEST_MARKER}-ownorg-${Date.now()}.png`;
      const inserted = await withFakeAuth(foreignAuthUserId, (run) =>
        run(`insert into storage.objects (bucket_id, name, owner, metadata) values ('avatars', $1, null, '{}'::jsonb) returning id`, [ownOrgPath])
      );
      expect(inserted).toHaveLength(1);

      const read = await withFakeAuth(foreignAuthUserId, (run) => run('select 1 from storage.objects where bucket_id = $1 and name = $2', ['avatars', ownOrgPath]));
      expect(read).toHaveLength(1);
    });
  });
});
