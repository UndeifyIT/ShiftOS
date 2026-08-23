import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabaseClient, type DatabaseClient } from '@shiftos/database';
import { createDefaultRegistry, type RpcRegistry } from '@shiftos/api';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

/**
 * Reads DATABASE_URL directly from the repo-root .env, bypassing whatever is
 * already in process.env. This repo has a known environment issue (see
 * docs/backend-completion-audit.md): a stray DATABASE_URL pointing at a
 * local, unrelated Postgres instance has been observed set somewhere in the
 * parent process tree of dev shells, and @shiftos/config's loadConfig()
 * only fills in a var when it is *not already present* in process.env — so
 * relying on that here would silently point these tests at the wrong
 * database. Reading the file directly sidesteps that entirely.
 */
function readDotenvDatabaseUrl(): string {
  const envPath = join(REPO_ROOT, '.env');
  if (!existsSync(envPath)) {
    throw new Error(`Integration tests require a repo-root .env with DATABASE_URL (expected at ${envPath})`);
  }
  const contents = readFileSync(envPath, 'utf8');
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    if (key === 'DATABASE_URL') {
      return line.slice(idx + 1).trim();
    }
  }
  throw new Error('DATABASE_URL not found in repo-root .env');
}

/**
 * Fixtures inside the pre-existing "ShiftOS Test Org" (98fdbe03-...) left in
 * the live database from earlier manual verification. Tests must only
 * create disposable rows scoped to a recognizable marker (a title/note
 * prefix, or a throwaway employee's email) and delete them in an afterAll —
 * never touch these fixture ids' own rows.
 */
export const TEST_FIXTURES = {
  organizationId: '98fdbe03-36f6-4195-841a-4a882164723a',
  branchId: 'a21b9394-e73c-4464-aa69-3fbb1c696e69',
  /** "Ada Test" — a real, pre-existing active employee in the fixture branch. */
  employeeId: '51d51b67-f3e1-49f0-8875-0cba84418184',
  /** The Owner test user — org-wide role, every permission. */
  ownerAuthUserId: '0c533edb-210c-474e-83bb-20bd3b82ccc5'
} as const;

export interface TestContext {
  client: DatabaseClient;
  registry: RpcRegistry;
  call<T = unknown>(op: string, input?: unknown, authUserId?: string): Promise<T>;
  callRaw(op: string, input?: unknown, authUserId?: string): Promise<{ success: boolean; data: unknown; error?: { message: string; code: string } }>;
}

export function createTestContext(): TestContext {
  // A small pool: these are sequential integration tests, not a
  // high-concurrency workload, and a small hosted Supabase project's pooler
  // has its own connection ceiling worth staying well under.
  const client = createDatabaseClient({ connectionString: readDotenvDatabaseUrl(), maxConnections: 5 });
  const registry = createDefaultRegistry();

  async function callRaw(op: string, input: unknown = {}, authUserId: string = TEST_FIXTURES.ownerAuthUserId) {
    return registry.execute(client, op, { authUserId, organizationId: TEST_FIXTURES.organizationId, input }) as Promise<{
      success: boolean;
      data: unknown;
      error?: { message: string; code: string };
    }>;
  }

  async function call<T>(op: string, input: unknown = {}, authUserId: string = TEST_FIXTURES.ownerAuthUserId): Promise<T> {
    const result = await callRaw(op, input, authUserId);
    if (!result.success) {
      throw new Error(`${op} failed: ${result.error?.code} — ${result.error?.message}`);
    }
    return result.data as T;
  }

  return { client, registry, call, callRaw };
}
