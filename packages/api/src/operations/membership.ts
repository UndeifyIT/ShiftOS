import { MembershipService } from '@shiftos/services';
import { defineRpc } from '../rpc.js';
import { asRecord, requiredStringField, stringArrayField } from '../parse.js';

export const listMembers = defineRpc('list_members', async (context) => {
  return new MembershipService(context).listMembers();
});

export const listRoles = defineRpc('list_roles', async (context) => {
  return new MembershipService(context).listRoles();
});

export const listInvitableRoles = defineRpc('list_invitable_roles', async (context) => {
  return new MembershipService(context).listInvitableRoles();
});

export const listInvitations = defineRpc('list_invitations', async (context) => {
  return new MembershipService(context).listInvitations();
});

export const inviteMember = defineRpc('invite_member', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new MembershipService(context).inviteMember({
    email: requiredStringField(input, 'email'),
    firstName: requiredStringField(input, 'firstName'),
    lastName: requiredStringField(input, 'lastName'),
    roleId: requiredStringField(input, 'roleId'),
    branchIds: stringArrayField(input, 'branchIds')
  });
});

export const revokeInvitation = defineRpc('revoke_invitation', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  await new MembershipService(context).revokeInvitation(requiredStringField(input, 'invitationId'));
  return { revoked: true };
});

export const membershipOperations = [listMembers, listRoles, listInvitableRoles, listInvitations, inviteMember, revokeInvitation];
