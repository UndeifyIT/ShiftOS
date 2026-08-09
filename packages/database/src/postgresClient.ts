import { Pool, type PoolClient, type PoolConfig } from 'pg';
import type { DatabaseClient, DatabaseConfig } from './index';
import { DatabaseError, ShiftOSError } from '@shiftos/errors';

class PostgresClient implements DatabaseClient {
  constructor(private pool: Pool) {}

  async query<T extends Record<string, unknown> = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    try {
      const result = await this.pool.query<T>(sql, params as unknown[]);
      return result.rows;
    } catch (error) {
      // `message` is a fixed, safe string; the raw driver error (which can include
      // constraint/column names) is preserved only on `cause`, for server-side
      // logging, never for direct client exposure.
      throw new DatabaseError('A database operation failed', error);
    }
  }

  async transaction<T>(callback: (client: DatabaseClient) => Promise<T>): Promise<T> {
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const trxClient: DatabaseClient = {
        query: async <U extends Record<string, unknown> = Record<string, unknown>>(sql: string, params: unknown[] = []) => {
          try {
            const result = await client.query<U>(sql, params as unknown[]);
            return result.rows;
          } catch (error) {
            throw new DatabaseError('A database operation failed', error);
          }
        },
        transaction: async () => {
          throw new DatabaseError('Nested transactions are not supported in this simple adapter');
        },
        close: async () => {
          // No-op: a transaction-scoped client does not own the pool.
        }
      };
      const result = await callback(trxClient);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // The connection is likely already broken (e.g. lost mid-transaction);
        // the original error below is what matters to the caller.
      }
      // Preserve intentional application errors (ValidationError, NotFoundError,
      // a DatabaseError already produced above, etc.) so callers can branch on
      // error type. Only truly unexpected failures get wrapped here.
      if (error instanceof ShiftOSError) {
        throw error;
      }
      throw new DatabaseError('A database transaction failed', error);
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export function createPostgresClient(config: DatabaseConfig): DatabaseClient {
  const poolConfig: PoolConfig = {
    connectionString: config.connectionString,
    max: config.maxConnections,
    idleTimeoutMillis: config.idleTimeoutMillis
  };

  const pool = new Pool(poolConfig);
  return new PostgresClient(pool);
}
