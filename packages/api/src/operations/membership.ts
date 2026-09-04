import { MembershipService } from '@shiftos/services';
import { defineRpc } from '../rpc.js';
import { asRecord, requiredStringField, stringArrayField, stringField } from '../parse.js';

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
    // Optional since Task 3 (055) — the invite form no longer collects the
    // invitee's name; they set it themselves at CompleteProfilePage after
    // accepting. Still accepted if a caller sends one (e.g. an older client),
    // just no longer required.
    firstName: stringField(input, 'firstName'),
    lastName: stringField(input, 'lastName'),
    roleId: requiredStringField(input, 'roleId'),
    branchIds: stringArrayField(input, 'branchIds')
  });
});

export const revokeInvitation = defineRpc('revoke_invitation', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  await new MembershipService(context).revokeInvitation(requiredStringField(input, 'invitationId'));
  return { revoked: true };
});

/** Task 3 — confirmed genuinely missing (see MembershipService.resendInvitation's own comment). */
export const resendInvitation = defineRpc('resend_invitation', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new MembershipService(context).resendInvitation(requiredStringField(input, 'invitationId'));
});

export const membershipOperations = [
  listMembers,
  listRoles,
  listInvitableRoles,
  listInvitations,
  inviteMember,
  revokeInvitation,
  resendInvitation
];
