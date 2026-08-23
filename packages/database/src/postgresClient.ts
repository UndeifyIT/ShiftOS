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

/**
 * A hosted Postgres instance (Supabase's pooler and direct connection both)
 * requires TLS; a plain local Postgres on localhost/127.0.0.1 usually does
 * not, and some local setups reject a TLS negotiation attempt outright. `pg`
 * defaults to no TLS at all, which silently fails against a real Supabase
 * project rather than producing an obvious "wrong credentials" style error,
 * so this has to be explicit rather than left to the driver's default.
 *
 * Certificate verification defaults to strict (`rejectUnauthorized: true`),
 * on the assumption Supabase's chain runs through a root already in Node's
 * default CA store. In practice, on at least one real Windows dev machine,
 * that failed with `SELF_SIGNED_CERT_IN_CHAIN`, a known, common outcome
 * connecting to Supabase's pooler from `node-postgres`, not evidence of
 * anything intercepting the connection. Rather than silently downgrading
 * every non-local connection to unverified TLS, that relaxation is now an
 * explicit, per-machine opt-in: set `PG_ALLOW_INSECURE_TLS=1` in that
 * machine's own environment (never commit it) to allow
 * `rejectUnauthorized: false` there. The traffic is still encrypted either
 * way; only the certificate's identity goes unverified when the flag is set.
 * A stricter follow-up would pin Supabase's actual CA certificate via
 * `ssl.ca` instead; that needs a verified copy of the certificate, which was
 * not available when this was written.
 */
function isLocalHost(connectionString: string): boolean {
  try {
    const { hostname } = new URL(connectionString);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}

export function createPostgresClient(config: DatabaseConfig): DatabaseClient {
  const allowInsecureTls = process.env.PG_ALLOW_INSECURE_TLS === '1';
  const poolConfig: PoolConfig = {
    connectionString: config.connectionString,
    max: config.maxConnections,
    idleTimeoutMillis: config.idleTimeoutMillis,
    ssl: isLocalHost(config.connectionString) ? undefined : { rejectUnauthorized: !allowInsecureTls }
  };

  const pool = new Pool(poolConfig);
  return new PostgresClient(pool);
}
