import { BaseRepository, assertSafeIdentifier, type DatabaseClient } from '@shiftos/database';
import type { RepositoryQueryOptions } from '@shiftos/types';
import { NotFoundError, DatabaseError } from '@shiftos/errors';

/** Row shape shared by every organization-owned table. */
export interface TenantEntity extends Record<string, unknown> {
  id: string;
  organization_id: string;
}

/**
 * Base for tables that own an organization_id column (nearly every table in
 * the schema except organizations/users/permissions themselves).
 *
 * Deliberately does NOT override BaseRepository's findById/create/update/
 * softDelete under the same names: TypeScript would reject a same-named
 * override with a different, tenant-required parameter list (and even if it
 * didn't, silently shadowing a 1-argument method with a 2-argument one is
 * exactly the kind of thing a caller could get wrong without a compiler
 * error). Every method here has its own name and REQUIRES organizationId as
 * the first argument, so tenant scoping cannot be silently omitted the way
 * it could be by forgetting a WHERE clause deep in a query.
 *
 * Queries are built directly here (not via BaseRepository.findAll/count)
 * because correct soft-delete exclusion needs `deleted_at IS NULL`, which
 * BaseRepository's generic equality-filter map can't express (a `null` filter
 * value there would bind `= NULL`, which is never true in SQL, not `IS NULL`).
 */
export abstract class TenantScopedRepository<T extends TenantEntity> extends BaseRepository<T> {
  /** Override to `false` in the constructor of a repository for a table with no deleted_at column. */
  protected hasSoftDelete = true;

  constructor(client: DatabaseClient, tableName: string) {
    super(client, tableName);
  }

  async getById(organizationId: string, id: string): Promise<T | null> {
    const rows = await this.list(organizationId, { filters: { id } });
    return rows[0] ?? null;
  }

  async getByIdOrThrow(organizationId: string, id: string): Promise<T> {
    const record = await this.getById(organizationId, id);
    if (!record) {
      throw new NotFoundError(`Record ${id} not found in ${this.tableName}`);
    }
    return record;
  }

  async list(organizationId: string, options?: RepositoryQueryOptions): Promise<T[]> {
    const params: unknown[] = [organizationId];
    let sql = `SELECT * FROM ${this.tableName} WHERE organization_id = $1`;
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

  async countAll(organizationId: string, filters?: Record<string, unknown>): Promise<number> {
    const params: unknown[] = [organizationId];
    let sql = `SELECT count(*)::int AS count FROM ${this.tableName} WHERE organization_id = $1`;
    if (this.hasSoftDelete) {
      sql += ' AND deleted_at IS NULL';
    }

    if (filters) {
      for (const [column, value] of Object.entries(filters)) {
        this.assertSafeColumn(column);
        params.push(value);
        sql += ` AND ${column} = $${params.length}`;
      }
    }

    const rows = await this.client.query<{ count: number }>(sql, params);
    return rows[0]?.count ?? 0;
  }

  async insert(organizationId: string, entity: Partial<Omit<T, 'organization_id'>>): Promise<T> {
    return super.create({ ...(entity as Partial<T>), organization_id: organizationId } as Partial<T>);
  }

  /** Confirms `id` belongs to `organizationId` before applying the update, so one tenant can never patch another tenant's row by id alone. */
  async patch(organizationId: string, id: string, changes: Partial<T>): Promise<T> {
    await this.getByIdOrThrow(organizationId, id);
    return super.update(id, changes);
  }

  /** Same ownership check as patch(), then soft-deletes. Throws if this table has no deleted_at column. */
  async archive(organizationId: string, id: string): Promise<T> {
    if (!this.hasSoftDelete) {
      throw new DatabaseError(`${this.tableName} does not support soft delete`);
    }
    await this.getByIdOrThrow(organizationId, id);
    return super.softDelete(id);
  }

  /** Escape hatch for domain-specific queries this base class doesn't cover; still validates any dynamic column name it's given. */
  protected assertSafeColumn(column: string): void {
    assertSafeIdentifier(column, `${this.tableName} query column`);
  }
}
