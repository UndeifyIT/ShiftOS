import { defineRpc } from '../rpc.js';

/**
 * Exposes the fields ApplicationContext already resolves on every request
 * (role, permissions, branch access, sibling organizations) as their own
 * operation. The frontend needs this to decide what navigation/actions to
 * render (UI-002 §10, §D of the frontend foundation doc) — there is no other
 * way for a client to learn its own permission set, since authentication
 * (packages/auth) deliberately returns no roles/permissions of its own
 * (DEC-018). This performs no additional repository work of its own; it only
 * shapes context already computed by createApplicationContext for transport.
 */
export const getMyContext = defineRpc('get_my_context', async (context) => {
  return {
    userId: context.userId,
    organizationId: context.organizationId,
    membershipId: context.membershipId,
    roleId: context.roleId,
    roleName: context.roleName,
    permissions: Array.from(context.permissions),
    branchAccess: context.branchAccess,
    accessibleOrganizationIds: context.accessibleOrganizationIds
  };
});

export const contextOperations = [getMyContext];
