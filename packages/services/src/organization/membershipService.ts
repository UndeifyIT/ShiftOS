import {
  OrganizationMembershipRepository,
  RoleRepository,
  BranchRepository,
  InvitationRepository,
  InvitationBranchAccessRepository,
  type MembershipWithDetails,
  type RoleRecord,
  type InvitationWithRole
} from '@shiftos/repositories';
import { AuthorizationError, ValidationError, NotFoundError } from '@shiftos/errors';
import type { ApplicationContext } from '../applicationContext.js';

export interface InviteMemberInput {
  email: string;
  /**
   * Optional since Task 3 (055, docs/superpowers/specs/2026-09-03-onboarding-ux-audit-design.md
   * §2 Phase 3) — the invite form no longer collects the invitee's name, since
   * they provide their own at CompleteProfilePage regardless of what the
   * inviter typed here. Stored as null when omitted; the columns themselves
   * remain (not dropped) for any invitation that already has a name on file.
   */
  firstName?: string;
  lastName?: string;
  roleId: string;
  /** Branches to grant. Ignored (and stored empty) if the target role is org-wide. */
  branchIds: string[];
}

/**
 * Member/role administration (WEB-009), plus real invitation issuance (031).
 * listMembers/listRoles are read-only, gated by org.members.manage.
 * inviteMember/listInvitations/revokeInvitation close the gap this class's
 * own comment used to flag as "requires a decision on the invitation flow" —
 * that decision is now: a server-written `invitations` table is the
 * authoritative source of what an invite grants (never Supabase Auth
 * user_metadata, which the invitee can edit before accepting), and
 * SupabaseAuthProvider.inviteUser (context.authProvider) sends the real
 * Supabase Auth invite. Does NOT let a caller invite into the org's
 * org-wide "Owner"-style role — that stays exclusively bootstrap-only via
 * create_organization_with_owner, so invite issuance can never be used for
 * privilege escalation to full org ownership.
 */
export class MembershipService {
  private readonly memberships: OrganizationMembershipRepository;
  private readonly roles: RoleRepository;
  private readonly branches: BranchRepository;
  private readonly invitations: InvitationRepository;
  private readonly invitationBranchAccess: InvitationBranchAccessRepository;

  constructor(private readonly context: ApplicationContext) {
    this.memberships = new OrganizationMembershipRepository(context.client);
    this.roles = new RoleRepository(context.client);
    this.branches = new BranchRepository(context.client);
    this.invitations = new InvitationRepository(context.client);
    this.invitationBranchAccess = new InvitationBranchAccessRepository(context.client);
  }

  async listMembers(): Promise<MembershipWithDetails[]> {
    await this.context.requirePermission('org.members.manage');
    return this.memberships.listWithUserAndRole(this.context.organizationId);
  }

  async listRoles(): Promise<RoleRecord[]> {
    await this.context.requirePermission('org.members.manage');
    return this.roles.listActive(this.context.organizationId);
  }

  /** Roles a member can actually be invited into — excludes org-wide (Owner-style) roles. */
  async listInvitableRoles(): Promise<RoleRecord[]> {
    await this.context.requirePermission('org.members.manage');
    const roles = await this.roles.listActive(this.context.organizationId);
    return roles.filter((role) => !role.grants_org_wide_branch_access);
  }

  async listInvitations(): Promise<InvitationWithRole[]> {
    await this.context.requirePermission('org.members.manage');
    return this.invitations.listWithRole(this.context.organizationId);
  }

  async inviteMember(input: InviteMemberInput): Promise<InvitationWithRole> {
    await this.context.requirePermission('org.members.manage');

    if (!this.context.authProvider) {
      throw new AuthorizationError(
        'Member invitations are not available in this environment — the server has no configured service-role capability.'
      );
    }

    const email = input.email.trim().toLowerCase();
    if (!email) {
      throw new ValidationError('Email is required');
    }
    const firstName = input.firstName?.trim() || null;
    const lastName = input.lastName?.trim() || null;

    const role = await this.roles.getById(this.context.organizationId, input.roleId);
    if (!role || !role.is_active) {
      throw new NotFoundError('Role not found');
    }
    if (role.grants_org_wide_branch_access) {
      throw new AuthorizationError('This role cannot be assigned via invitation.');
    }

    const existingPending = await this.invitations.findPendingByEmail(this.context.organizationId, email);
    if (existingPending) {
      throw new ValidationError('An invitation is already pending for this email address.');
    }

    const validBranchIds = new Set(await this.branches.listAllBranchIds(this.context.organizationId));
    const branchIds = input.branchIds.filter((id) => validBranchIds.has(id));
    if (branchIds.length !== input.branchIds.length) {
      throw new ValidationError('One or more selected branches were not found in this organization.');
    }

    // The Supabase Auth invite call cannot be part of the same DB transaction
    // as the invitations row below — it's a separate system. If the DB write
    // fails after the email is already queued, that's a real, surfaced error
    // (not silently swallowed), not a rollback of the sent email.
    await this.context.authProvider.inviteUser(email, firstName ?? undefined, lastName ?? undefined, this.context.organizationId, role.id);

    const invitation = await this.invitations.insert(this.context.organizationId, {
      email,
      first_name: firstName,
      last_name: lastName,
      role_id: role.id,
      status: 'pending',
      invited_by: this.context.userId
    });

    await this.invitationBranchAccess.createForInvitation(this.context.organizationId, invitation.id, branchIds);

    const withRole = (await this.invitations.listWithRole(this.context.organizationId)).find((i) => i.id === invitation.id);
    if (!withRole) {
      throw new NotFoundError('Invitation was created but could not be re-read');
    }
    await this.context.audit('invite_member', 'invitation', invitation.id, null, { email, role_id: role.id, branch_ids: branchIds });
    return withRole;
  }

  async revokeInvitation(invitationId: string): Promise<void> {
    await this.context.requirePermission('org.members.manage');
    await this.invitations.revoke(this.context.organizationId, invitationId, this.context.userId);
    await this.context.audit('revoke_invitation', 'invitation', invitationId, null, null);
  }

  /**
   * Resend a still-pending invitation — Task 3's confirmed-missing gap
   * (docs/superpowers/specs/2026-09-03-onboarding-ux-audit-design.md §2
   * Phase 3): status/expiry surfacing already worked end-to-end, but nothing
   * let a manager recover an invitation whose link expired or whose email
   * never arrived, short of it staying stuck forever (an expired invitation
   * can't be re-invited under the same email — findPendingByEmail/the
   * uq_invitations_org_email_pending index both key off status='pending'
   * regardless of expiry — and the UI never offered revoke for an expired
   * row either). Re-sends the real Supabase Auth invite email, then extends
   * expires_at another 7 days so the (possibly already-expired) link becomes
   * valid again.
   */
  async resendInvitation(invitationId: string): Promise<InvitationWithRole> {
    await this.context.requirePermission('org.members.manage');

    if (!this.context.authProvider) {
      throw new AuthorizationError(
        'Member invitations are not available in this environment — the server has no configured service-role capability.'
      );
    }

    const invitation = await this.invitations.getByIdOrThrow(this.context.organizationId, invitationId);
    if (invitation.status !== 'pending') {
      throw new ValidationError('Only a pending invitation can be resent.');
    }

    const role = await this.roles.getById(this.context.organizationId, invitation.role_id);
    if (!role) {
      throw new NotFoundError('Role not found');
    }

    await this.context.authProvider.inviteUser(
      invitation.email,
      invitation.first_name ?? undefined,
      invitation.last_name ?? undefined,
      this.context.organizationId,
      role.id
    );

    await this.invitations.resend(this.context.organizationId, invitationId);

    const withRole = (await this.invitations.listWithRole(this.context.organizationId)).find((i) => i.id === invitationId);
    if (!withRole) {
      throw new NotFoundError('Invitation was resent but could not be re-read');
    }
    await this.context.audit('resend_invitation', 'invitation', invitationId, null, { email: invitation.email });
    return withRole;
  }
}
