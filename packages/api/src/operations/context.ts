import { SecurityEventRepository } from '@shiftos/repositories';
import { defineRpc } from '../rpc.js';

/**
 * Exposes the fields ApplicationContext already resolves on every request
 * (role, permissions, branch access, sibling organizations) as their own
 * operation. The frontend needs this to decide what navigation/actions to
 * render (UI-002 §10, §D of the frontend foundation doc) — there is no other
 * way for a client to learn its own permission set, since authentication
 * (packages/auth) deliberately returns no roles/permissions of its own
 * (DEC-018).
 *
 * One deliberate exception to "no additional repository work of its own":
 * emailFlaggedDisposable below does a single extra lookup (email +
 * is_disposable_email_domain in one query) so the frontend can nudge a user
 * whose account already has a disposable-looking email address (this can't
 * be resolved at signup time alone — e.g. an org created before this feature
 * existed, or a domain added to the blocklist after the account already
 * existed). context.client here is the same superuser/BYPASSRLS Postgres
 * connection every other ApplicationContext query already runs through
 * (see packages/database/src/postgresClient.ts, and the `.env` DATABASE_URL's
 * own `postgres.<project-ref>` username) — not the supabase_auth_admin role
 * the Before User Created hook runs as, so the RLS trap that required an
 * explicit policy for that
 * role (supabase/migrations/051) does not apply here; empirically confirmed
 * this session: `SELECT current_user, rolbypassrls FROM pg_roles WHERE
 * rolname = current_user` over this same DATABASE_URL returns
 * ('postgres', true), and is_disposable_email_domain() already returns
 * correct (non-false-negative) results over this connection.
 */
export const getMyContext = defineRpc('get_my_context', async (context) => {
  const rows = await context.client.query<{ email_flagged_disposable: boolean }>(
    `SELECT public.is_disposable_email_domain(email) AS email_flagged_disposable
     FROM public.users
     WHERE id = $1`,
    [context.userId]
  );
  // No row shouldn't happen for an authenticated user (the RPC layer already
  // verified membership before this handler runs), but this field is
  // advisory UI only — never worth failing the whole context fetch over, so
  // a missing row defaults to false rather than throwing.
  const emailFlaggedDisposable = rows[0]?.email_flagged_disposable ?? false;

  if (emailFlaggedDisposable) {
    // Same fire-and-forget-on-failure shape as ApplicationContext's own
    // audit()/recordSecurityEvent(): a logging failure must never turn a
    // successful context fetch into an error. Logged every call rather than
    // deduplicated per session — an extra append-only row per session
    // bootstrap for a flagged account is cheap, and security_events is
    // designed for exactly this frequency (see applicationContext.ts).
    try {
      await new SecurityEventRepository(context.client).record({
        organization_id: context.organizationId,
        user_id: context.userId,
        event_type: 'EXISTING_ACCOUNT_DISPOSABLE_EMAIL_FLAGGED',
        details: {},
        ip_address: null,
        user_agent: null
      });
    } catch {
      // See above: a broken security_events write must never change what
      // getMyContext returns to the caller.
    }
  }

  return {
    userId: context.userId,
    organizationId: context.organizationId,
    membershipId: context.membershipId,
    roleId: context.roleId,
    roleName: context.roleName,
    permissions: Array.from(context.permissions),
    branchAccess: context.branchAccess,
    accessibleOrganizationIds: context.accessibleOrganizationIds,
    emailFlaggedDisposable
  };
});

export const contextOperations = [getMyContext];
