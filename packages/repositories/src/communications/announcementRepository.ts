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
  /** Migration 066: shown first, with the handoff's "Pinned" badge. */
  is_pinned: boolean;
  /** Migration 069: whether readers are asked to acknowledge it. */
  requires_acknowledgement: boolean;
  published_at: string | null;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  /** Joined by the list queries: who posted it and their role, for readers who can't list members. */
  author_name?: string | null;
  author_role?: string | null;
}

/** Every column plus the author's name and role (their membership in this organization). */
const WITH_AUTHOR = `SELECT a.*,
         NULLIF(trim(concat_ws(' ', u.first_name, u.last_name)), '') AS author_name,
         r.name AS author_role
    FROM announcements a
    LEFT JOIN users u ON u.id = a.created_by
    LEFT JOIN organization_memberships om ON om.user_id = a.created_by AND om.organization_id = a.organization_id AND om.deleted_at IS NULL
    LEFT JOIN roles r ON r.id = om.role_id`;

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
    let sql = `${WITH_AUTHOR}
                WHERE a.organization_id = $1 AND a.deleted_at IS NULL AND a.is_published = true
                  AND (a.expires_at IS NULL OR a.expires_at > now())
                  AND (a.branch_id IS NULL OR a.branch_id = ANY($2::uuid[]))
                ORDER BY a.published_at DESC`;
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
    let sql = `${WITH_AUTHOR}
                WHERE a.organization_id = $1 AND a.deleted_at IS NULL
                  AND (a.branch_id IS NULL OR a.branch_id = ANY($2::uuid[]))
                ORDER BY a.created_at DESC`;
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
