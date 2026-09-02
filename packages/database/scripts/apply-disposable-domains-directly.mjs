// One-off helper: apply the remaining bulk INSERT statements from
// supabase/migrations/051_create_disposable_email_domains.sql directly via a
// live Postgres connection, splitting on the file's own statement boundaries.
// Used once, interactively, to unblock a stuck migration-apply loop — not
// part of the app's runtime or build. Reuses this package's own reviewed
// connection helper (createPostgresClient), including its existing
// PG_ALLOW_INSECURE_TLS opt-in for Supabase's pooler cert, instead of
// constructing a raw pg.Client with its own TLS handling.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createPostgresClient } from '../dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');
const migrationPath = join(repoRoot, 'supabase', 'migrations', '051_create_disposable_email_domains.sql');
const sql = readFileSync(migrationPath, 'utf8');

const statements = sql
  .split(/;\s*\n/)
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !s.startsWith('--'))
  .map((s) => s + ';');

const insertStatements = statements.filter((s) => s.startsWith('INSERT INTO public.disposable_email_domains'));
console.log(`Found ${insertStatements.length} INSERT statements in the migration file.`);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL not set');

const client = createPostgresClient({ connectionString });

try {
  const before = await client.query('SELECT count(*)::int AS c FROM public.disposable_email_domains');
  console.log('Row count before:', before[0].c);

  for (let i = 0; i < insertStatements.length; i++) {
    await client.query(insertStatements[i]);
    const now = await client.query('SELECT count(*)::int AS c FROM public.disposable_email_domains');
    console.log(`Chunk ${i + 1}/${insertStatements.length} applied — total rows now: ${now[0].c}`);
  }

  const after = await client.query('SELECT count(*)::int AS c FROM public.disposable_email_domains');
  console.log('Row count after:', after[0].c);
} finally {
  await client.close();
}
