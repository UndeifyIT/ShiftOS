import { MembershipService } from '@shiftos/services';
import { defineRpc } from '../rpc.js';

export const listMembers = defineRpc('list_members', async (context) => {
  return new MembershipService(context).listMembers();
});

export const listRoles = defineRpc('list_roles', async (context) => {
  return new MembershipService(context).listRoles();
});

export const membershipOperations = [listMembers, listRoles];
