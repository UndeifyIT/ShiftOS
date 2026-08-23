import type { DatabaseClient } from '@shiftos/database';
import { TenantScopedRepository, type TenantEntity } from '../base/tenantScopedRepository.js';

export type AnnouncementType = 'general' | 'policy' | 'safety' | 'operational' | 'emergency';
export type AnnouncementVisibility = 'organization' | 'branch' | 'public';

export interface Announcement extends TenantEntity {
  /** Nullable: null means organization-wide, matching visibility_type = 'organization'. */
  branch_id: string | null;
  title: string;
  content: string;
  announcement_type: AnnouncementType;
  visibility_type: AnnouncementVisibility;
  is_published: boolean;
  published_at: string | null;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Does NOT extend BranchScopedRepository: branch_id is nullable here (an
 * organization-wide announcement has branch_id = null), which doesn't fit
 * that base class's "every row has exactly one branch" assumption. Branch
 * visibility is handled explicitly in listVisibleTo below.
 */
export class AnnouncementRepository extends TenantScopedRepository<Announcement> {
  constructor(client: DatabaseClient) {
    super(client, 'announcements');
  }

  /** Published, non-expired announcements visible to someone with access to the given branches: organization-wide ones (branch_id IS NULL) plus branch-specific ones for an accessible branch. */
  async listVisibleTo(organizationId: string, branchIds: string[], options?: { limit?: number; offset?: number }): Promise<Announcement[]> {
    const params: unknown[] = [organizationId, branchIds];
    let sql = `SELECT * FROM announcements
                WHERE organization_id = $1 AND deleted_at IS NULL AND is_published = true
                  AND (expires_at IS NULL OR expires_at > now())
                  AND (branch_id IS NULL OR branch_id = ANY($2::uuid[]))
                ORDER BY published_at DESC`;
    if (typeof options?.limit === 'number') {
      params.push(options.limit);
      sql += ` LIMIT $${params.length}`;
    }
    if (typeof options?.offset === 'number') {
      params.push(options.offset);
      sql += ` OFFSET $${params.length}`;
    }
    return this.client.query<Announcement>(sql, params);
  }

  /** Every announcement (published or draft) an accessible-branches caller manages: organization-wide ones plus branch-specific ones for an accessible branch. Unlike listVisibleTo, does not filter by is_published/expires_at — for content managers, not the general audience view. */
  async listManaged(organizationId: string, branchIds: string[], options?: { limit?: number; offset?: number }): Promise<Announcement[]> {
    const params: unknown[] = [organizationId, branchIds];
    let sql = `SELECT * FROM announcements
                WHERE organization_id = $1 AND deleted_at IS NULL
                  AND (branch_id IS NULL OR branch_id = ANY($2::uuid[]))
                ORDER BY created_at DESC`;
    if (typeof options?.limit === 'number') {
      params.push(options.limit);
      sql += ` LIMIT $${params.length}`;
    }
    if (typeof options?.offset === 'number') {
      params.push(options.offset);
      sql += ` OFFSET $${params.length}`;
    }
    return this.client.query<Announcement>(sql, params);
  }

  async publish(organizationId: string, id: string): Promise<Announcement> {
    return this.patch(organizationId, id, { is_published: true, published_at: new Date().toISOString() } as Partial<Announcement>);
  }
}
