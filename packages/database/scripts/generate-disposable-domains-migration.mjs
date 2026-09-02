#!/usr/bin/env node
// One-off generator: snapshot mailchecker's disposable-domain blacklist into
// two committed artifacts that must always agree with each other because
// they're generated from the exact same source in the same run:
//
//   1. supabase/migrations/051_create_disposable_email_domains.sql
//      - table + idempotent bulk seed + is_disposable_email_domain() function
//   2. packages/services/src/security/disposableDomains.generated.ts
//      - a `Set<string>` literal the TS-side isDisposableDomain() checks against
//
// This is a manual "refresh the list" tool, not part of the build. To refresh:
// bump the `mailchecker` version in packages/database, then re-run:
//
//   node packages/database/scripts/generate-disposable-domains-migration.mjs
//
// and commit both regenerated files (plus a new migration number if the table
// already exists in prior migrations -- see this file's own comments below).
//
// Run from anywhere; paths below are resolved relative to this script.

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const mailchecker = require('mailchecker');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const MIGRATION_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '051_create_disposable_email_domains.sql'
);
const TS_OUTPUT_PATH = path.join(
  REPO_ROOT,
  'packages',
  'services',
  'src',
  'security',
  'disposableDomains.generated.ts'
);

const CHUNK_SIZE = 5000;

function loadDomains() {
  const raw = mailchecker.blacklist();
  const domains = new Set();
  for (const entry of raw) {
    domains.add(String(entry).trim().toLowerCase());
  }
  return [...domains].sort();
}

function sqlQuoteLiteral(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

function buildInsertStatements(domains) {
  const statements = [];
  for (let i = 0; i < domains.length; i += CHUNK_SIZE) {
    const chunk = domains.slice(i, i + CHUNK_SIZE);
    const values = chunk.map((d) => `(${sqlQuoteLiteral(d)})`).join(',\n  ');
    statements.push(
      `INSERT INTO public.disposable_email_domains (domain) VALUES\n  ${values}\nON CONFLICT (domain) DO NOTHING;`
    );
  }
  return statements;
}

function buildMigrationSql(domains) {
  const insertStatements = buildInsertStatements(domains).join('\n\n');
  return `-- 051_create_disposable_email_domains.sql
-- Migration: global disposable/temporary-email-domain blocklist used to
-- reject signups at permanent-email-only accounts (design spec:
-- docs/superpowers/specs/2026-09-02-auth-abuse-protection-design.md).
--
-- Data source: the "mailchecker" npm package (FGRibreau/mailchecker),
-- snapshotted at generation time via
-- packages/database/scripts/generate-disposable-domains-migration.mjs --
-- ${domains.length} domains as of this snapshot. This is a one-time bulk
-- seed, not a live dependency: refreshing the list later means bumping
-- mailchecker, re-running the generator, and committing a new migration
-- with any newly added domains (the ON CONFLICT DO NOTHING below makes
-- re-running this exact file safe, but a *new* snapshot belongs in a new
-- migration file per this repo's append-only migration convention).
--
-- No organization/tenant scoping: this is a global platform list, not
-- tenant data, so there is no organization_id column.
--
-- RLS: enabled, default-deny for anon/authenticated (no policy for either --
-- migration 053 additionally revokes their default table-level grants
-- outright, since RLS alone does not cover TRUNCATE). This table is only
-- ever read by is_disposable_email_domain() below, or by service-role/
-- migration tooling -- never by a direct client query.
--
-- supabase_auth_admin (the role Supabase Auth uses to invoke the Before
-- User Created hook) DOES get an explicit SELECT policy below. Do not
-- remove it: is_disposable_email_domain() is LANGUAGE sql (not SECURITY
-- DEFINER), so its internal SELECT runs as the calling role, subject to
-- that role's own RLS -- supabase_auth_admin does not have BYPASSRLS, so
-- without this policy the function would silently always return false for
-- the hook, defeating the entire signup-blocking feature with no error
-- anywhere. This was found and fixed the hard way once already; regenerating
-- this file must never drop it again.

CREATE TABLE IF NOT EXISTS public.disposable_email_domains (
  domain text PRIMARY KEY,
  added_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.disposable_email_domains ENABLE ROW LEVEL SECURITY;

-- PostgreSQL has no CREATE POLICY IF NOT EXISTS -- guarded here so this file
-- stays safely re-runnable.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'disposable_email_domains'
      AND policyname = 'disposable_email_domains_select_auth_admin')
  THEN
    CREATE POLICY disposable_email_domains_select_auth_admin
      ON public.disposable_email_domains
      FOR SELECT
      TO supabase_auth_admin
      USING (true);
  END IF;
END$$;

GRANT SELECT ON public.disposable_email_domains TO supabase_auth_admin;

${insertStatements}

-- Exact-match only, never substring: this checks the full registrable
-- domain after '@' against the blocklist table with a plain equality
-- comparison, never LIKE/ILIKE or a substring/regex match. The local part
-- of the email (everything before '@') is never inspected, hashed,
-- stored, or compared here -- only lower(split_part(p_email, '@', 2)),
-- the domain, is used. Callers must not rely on this function to validate
-- email syntax; it only answers "is this exact domain on the disposable
-- blocklist?".
CREATE OR REPLACE FUNCTION public.is_disposable_email_domain(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.disposable_email_domains
    WHERE domain = lower(split_part(p_email, '@', 2))
  );
$$;

-- The function only ever returns a boolean about a domain string -- no row
-- data from disposable_email_domains is exposed by it -- so EXECUTE is safe
-- to grant broadly. supabase_auth_admin needs it so the Before User Created
-- auth hook (which runs as that role) can call it -- and, combined with the
-- SELECT policy above, actually get a correct answer rather than a silent
-- false. authenticated/anon also get EXECUTE for parity with the original
-- design, even though migration 053 revokes their table-level access: a
-- call from those roles now errors ("permission denied for table") instead
-- of returning false, which is a safer failure mode than either accepting a
-- silent false or leaving the function uncallable for them entirely.
GRANT EXECUTE ON FUNCTION public.is_disposable_email_domain(text)
  TO supabase_auth_admin, authenticated, anon;
`;
}

function buildTsSource(domains) {
  const literal = domains.map((d) => `  ${JSON.stringify(d)},`).join('\n');
  return `// GENERATED FILE -- do not edit by hand.
//
// Produced by packages/database/scripts/generate-disposable-domains-migration.mjs
// from the "mailchecker" npm package's blacklist(), the exact same snapshot
// used to seed supabase/migrations/051_create_disposable_email_domains.sql.
// Refresh both together: bump mailchecker, re-run the generator, commit both
// files plus a new migration for any newly added domains.
//
// ${domains.length} domains as of this snapshot.

export const DISPOSABLE_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
${literal}
]);
`;
}

function main() {
  const domains = loadDomains();
  if (domains.length === 0) {
    throw new Error('mailchecker.blacklist() returned zero domains -- refusing to write an empty blocklist.');
  }

  // MIGRATION_PATH points at 051, which has already been applied to production.
  // Re-running this script to refresh the blocklist would silently rewrite that
  // applied file in place: the new domains would live in a migration Postgres
  // has already recorded as run, so they would never actually reach any
  // database, and nothing would say so. Refuse instead of no-opping.
  if (fs.existsSync(MIGRATION_PATH)) {
    throw new Error(
      `Refusing to overwrite ${MIGRATION_PATH}: that migration already exists and has been applied.\n` +
        'Rewriting an applied migration in place means the refreshed blocklist never reaches any database.\n' +
        'To refresh the list, do one of:\n' +
        '  (a) temporarily point MIGRATION_PATH/TS_OUTPUT_PATH in this script at scratch paths, review the\n' +
        '      diff against the applied file, then commit the new domains as a NEW numbered migration; or\n' +
        '  (b) edit this script\'s MIGRATION_PATH constant to the next unused migration number (and\n' +
        '      TS_OUTPUT_PATH if you want the .generated.ts written elsewhere) for this one run.\n' +
        'Either way the result must be a new migration file -- this repo\'s migrations are append-only.'
    );
  }

  fs.mkdirSync(path.dirname(MIGRATION_PATH), { recursive: true });
  fs.writeFileSync(MIGRATION_PATH, buildMigrationSql(domains), 'utf8');
  console.log(`Wrote ${MIGRATION_PATH} (${domains.length} domains, ${buildInsertStatements(domains).length} INSERT statements)`);

  fs.mkdirSync(path.dirname(TS_OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(TS_OUTPUT_PATH, buildTsSource(domains), 'utf8');
  console.log(`Wrote ${TS_OUTPUT_PATH} (${domains.length} domains)`);
}

main();
