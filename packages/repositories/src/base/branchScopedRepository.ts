import type { RepositoryQueryOptions } from '@shiftos/types';
import { TenantScopedRepository, type TenantEntity } from './tenantScopedRepository.js';

/** Row shape shared by tables that carry their own branch_id column directly. */
export interface BranchEntity extends TenantEntity {
  branch_id: string;
}

/**
 * Base for branch-owned tables (employees, shifts, schedules, attendance_records,
 * leave_requests, tasks — every table with its own branch_id column).
 *
 * Per the ShiftOS branch-authorization model (see docs/roles-permissions/PER-018,
 * GOV-003 DEC-032), branch access is resolved by the authorization layer BEFORE
 * a repository call is made — organization-wide roles resolve to "every branch
 * in the org", branch-scoped roles resolve to an explicit branch id list. This
 * class does not know or care which case it's in: callers always pass the
 * already-resolved branch id(s) explicitly, so branch scoping is as hard to
 * omit here as organization scoping is on TenantScopedRepository.
 */
export abstract class BranchScopedRepository<T extends BranchEntity> extends TenantScopedRepository<T> {
  async listByBranch(organizationId: string, branchId: string, options?: RepositoryQueryOptions): Promise<T[]> {
    return this.list(organizationId, {
      ...options,
      filters: { ...(options?.filters ?? {}), branch_id: branchId }
    });
  }

  /**
   * For callers who already resolved a set of accessible branch ids (e.g. an
   * org-wide Manager's full branch list, or a member with several explicit
   * grants). Empty array intentionally returns no rows rather than falling
   * back to "all rows" — an empty accessible-branch set means no access.
   */
  async listByBranches(organizationId: string, branchIds: string[], options?: RepositoryQueryOptions): Promise<T[]> {
    if (branchIds.length === 0) {
      return [];
    }

    const params: unknown[] = [organizationId, branchIds];
    let sql = `SELECT * FROM ${this.tableName} WHERE organization_id = $1 AND branch_id = ANY($2::uuid[])`;
    if (this.hasSoftDelete) {
      sql += ' AND deleted_at IS NULL';
    }

    const filters = options?.filters;
    if (filters) {
      for (const [column, value] of Object.entries(filters)) {
        this.assertSafeColumn(column);
        params.push(value);
        sql += ` AND ${column} = $${params.length}`;
      }
    }

    if (options?.orderBy) {
      const [column, rawDirection] = options.orderBy.trim().split(/\s+/);
      this.assertSafeColumn(column);
      const direction = rawDirection?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
      sql += ` ORDER BY ${column} ${direction}`;
    }

    if (typeof options?.limit === 'number') {
      params.push(options.limit);
      sql += ` LIMIT $${params.length}`;
    }

    if (typeof options?.offset === 'number') {
      params.push(options.offset);
      sql += ` OFFSET $${params.length}`;
    }

    return this.client.query<T>(sql, params);
  }

  async countByBranches(organizationId: string, branchIds: string[]): Promise<number> {
    if (branchIds.length === 0) {
      return 0;
    }
    let sql = `SELECT count(*)::int AS count FROM ${this.tableName} WHERE organization_id = $1 AND branch_id = ANY($2::uuid[])`;
    if (this.hasSoftDelete) {
      sql += ' AND deleted_at IS NULL';
    }
    const rows = await this.client.query<{ count: number }>(sql, [organizationId, branchIds]);
    return rows[0]?.count ?? 0;
  }
}
