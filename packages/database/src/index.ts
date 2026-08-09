import type { RepositoryQueryOptions } from '@shiftos/types';
import { DatabaseError, NotFoundError, ShiftOSError } from '@shiftos/errors';

export interface DatabaseClient {
  query<T extends Record<string, unknown> = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  transaction<T>(callback: (client: DatabaseClient) => Promise<T>): Promise<T>;
  /**
   * Releases the underlying connection pool. Call once during graceful process
   * shutdown or test teardown, never per-request. A no-op on a transaction-scoped
   * client passed into a transaction() callback.
   */
  close(): Promise<void>;
}

export interface DatabaseConfig {
  connectionString: string;
  maxConnections?: number;
  idleTimeoutMillis?: number;
}

// The real, pg-backed implementation lives in ./postgresClient. It is re-exported
// here (under both names) so this stays the single entrypoint for constructing a
// DatabaseClient; there is intentionally only one production adapter.
export { createPostgresClient, createPostgresClient as createDatabaseClient } from './postgresClient.js';

const IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Validates that `identifier` is safe to interpolate directly into SQL as a
 * table/column name (parameterized placeholders can't stand in for
 * identifiers). Exported so packages/repositories can apply the exact same
 * rule when it builds queries BaseRepository doesn't cover (e.g. ANY($n)
 * branch-array filters), instead of duplicating or loosening this check.
 */
export function assertSafeIdentifier(identifier: string, context: string): void {
  if (!IDENTIFIER_PATTERN.test(identifier)) {
    throw new DatabaseError(`Unsafe identifier rejected in ${context}`);
  }
}

export abstract class BaseRepository<T extends Record<string, unknown>> {
  constructor(protected client: DatabaseClient, protected tableName: string) {
    assertSafeIdentifier(tableName, 'table name');
  }

  async findAll(options?: RepositoryQueryOptions): Promise<T[]> {
    const params: unknown[] = [];
    let sql = `SELECT * FROM ${this.tableName}`;

    const filters = options?.filters;
    if (filters && Object.keys(filters).length > 0) {
      const clauses = Object.entries(filters).map(([column, value]) => {
        assertSafeIdentifier(column, 'filter column');
        params.push(value);
        return `${column} = $${params.length}`;
      });
      sql += ` WHERE ${clauses.join(' AND ')}`;
    }

    if (options?.orderBy) {
      const [column, rawDirection] = options.orderBy.trim().split(/\s+/);
      assertSafeIdentifier(column, 'orderBy column');
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

  async findById(id: string): Promise<T | null> {
    const rows = await this.client.query<T>(`SELECT * FROM ${this.tableName} WHERE id = $1`, [id]);
    return rows?.[0] ?? null;
  }

  async count(filters?: Record<string, unknown>): Promise<number> {
    const params: unknown[] = [];
    let sql = `SELECT count(*)::int AS count FROM ${this.tableName}`;

    if (filters && Object.keys(filters).length > 0) {
      const clauses = Object.entries(filters).map(([column, value]) => {
        assertSafeIdentifier(column, 'filter column');
        params.push(value);
        return `${column} = $${params.length}`;
      });
      sql += ` WHERE ${clauses.join(' AND ')}`;
    }

    const rows = await this.client.query<{ count: number }>(sql, params);
    return rows[0]?.count ?? 0;
  }

  async create(entity: Partial<T>): Promise<T> {
    const columns = Object.keys(entity);
    if (columns.length === 0) {
      throw new DatabaseError('Cannot create a record with no fields');
    }
    columns.forEach((column) => assertSafeIdentifier(column, 'insert column'));

    const values = columns.map((column) => (entity as Record<string, unknown>)[column]);
    const placeholders = columns.map((_, index) => `$${index + 1}`);
    const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;

    const rows = await this.client.query<T>(sql, values);
    const created = rows[0];
    if (!created) {
      throw new DatabaseError(`Insert into ${this.tableName} did not return the created record`);
    }
    return created;
  }

  async update(id: string, changes: Partial<T>): Promise<T> {
    const columns = Object.keys(changes);
    if (columns.length === 0) {
      throw new DatabaseError('Cannot update a record with no fields');
    }
    columns.forEach((column) => assertSafeIdentifier(column, 'update column'));

    const values = columns.map((column) => (changes as Record<string, unknown>)[column]);
    const setClause = columns.map((column, index) => `${column} = $${index + 1}`).join(', ');
    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = $${columns.length + 1} RETURNING *`;

    const rows = await this.client.query<T>(sql, [...values, id]);
    const updated = rows[0];
    if (!updated) {
      throw new NotFoundError(`Record ${id} not found in ${this.tableName}`);
    }
    return updated;
  }

  /**
   * Hard-deletes a row. Most ShiftOS tables use soft deletion (deleted_at) instead;
   * prefer softDelete() for tables that have that column.
   */
  async delete(id: string): Promise<void> {
    await this.client.query(`DELETE FROM ${this.tableName} WHERE id = $1`, [id]);
  }

  /**
   * Soft-deletes a row by setting deleted_at. Only valid for tables with a
   * deleted_at column; callers are responsible for knowing their table's schema.
   */
  async softDelete(id: string): Promise<T> {
    const rows = await this.client.query<T>(
      `UPDATE ${this.tableName} SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [id]
    );
    const updated = rows[0];
    if (!updated) {
      throw new NotFoundError(`Active record ${id} not found in ${this.tableName}`);
    }
    return updated;
  }
}

// Re-exported so callers catching transaction/query failures can distinguish
// "one of our own errors propagated through" from "the driver failed" without
// importing @shiftos/errors separately.
export { ShiftOSError };
