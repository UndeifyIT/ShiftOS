import type { DatabaseClient } from '@shiftos/database';
import { ValidationError } from '@shiftos/errors';
import { TenantScopedRepository, type TenantEntity } from '../base/tenantScopedRepository.js';

export interface Invitation extends TenantEntity {
  email: string;
  first_name: string;
  last_name: string;
  role_id: string;
  status: 'pending' | 'accepted' | 'revoked';
  invited_by: string;
  accepted_by: string | null;
  accepted_at: string | null;
  revoked_by: string | null;
  revoked_at: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

/** `listWithRole()`'s row shape — the invitation plus the role name InvitationsPage needs to render, without an N+1 lookup. */
export interface InvitationWithRole extends Invitation {
  role_name: string;
  invited_by_first_name: string;
  invited_by_last_name: string;
}

export class InvitationRepository extends TenantScopedRepository<Invitation> {
  protected override hasSoftDelete = false;

  constructor(client: DatabaseClient) {
    super(client, 'invitations');
  }

  async listWithRole(organizationId: string): Promise<InvitationWithRole[]> {
    return this.client.query<InvitationWithRole>(
      `SELECT i.*, r.name AS role_name, u.first_name AS invited_by_first_name, u.last_name AS invited_by_last_name
         FROM invitations i
         JOIN roles r ON r.id = i.role_id
         JOIN users u ON u.id = i.invited_by
        WHERE i.organization_id = $1
        ORDER BY i.created_at DESC`,
      [organizationId]
    );
  }

  async findPendingByEmail(organizationId: string, email: string): Promise<Invitation | null> {
    const rows = await this.client.query<Invitation>(
      `SELECT * FROM invitations WHERE organization_id = $1 AND lower(email) = lower($2) AND status = 'pending'`,
      [organizationId, email]
    );
    return rows[0] ?? null;
  }

  async revoke(organizationId: string, id: string, revokedBy: string): Promise<Invitation> {
    await this.getByIdOrThrow(organizationId, id);
    const rows = await this.client.query<Invitation>(
      `UPDATE invitations SET status = 'revoked', revoked_at = now(), revoked_by = $3
        WHERE id = $1 AND organization_id = $2 AND status = 'pending' RETURNING *`,
      [id, organizationId, revokedBy]
    );
    const updated = rows[0];
    if (!updated) {
      throw new ValidationError('Only a pending invitation can be revoked');
    }
    return updated;
  }
}

export interface InvitationBranchAccess extends TenantEntity {
  invitation_id: string;
  branch_id: string;
  created_at: string;
}

export class InvitationBranchAccessRepository extends TenantScopedRepository<InvitationBranchAccess> {
  protected override hasSoftDelete = false;

  constructor(client: DatabaseClient) {
    super(client, 'invitation_branch_access');
  }

  async createForInvitation(organizationId: string, invitationId: string, branchIds: string[]): Promise<void> {
    for (const branchId of branchIds) {
      await this.insert(organizationId, { invitation_id: invitationId, branch_id: branchId });
    }
  }
}
