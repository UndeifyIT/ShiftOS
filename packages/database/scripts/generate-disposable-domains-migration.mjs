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
-- RLS: enabled with deliberately NO permissive policy for anon/authenticated
-- -- this table is only ever read by is_disposable_email_domain() below
-- (executed by supabase_auth_admin from the Before User Created auth hook,
-- or by service-role/migration tooling), never by a direct client query.
-- RLS defaults to deny with no matching policy, which is exactly the
-- behavior wanted here.

CREATE TABLE IF NOT EXISTS public.disposable_email_domains (
  domain text PRIMARY KEY,
  added_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.disposable_email_domains ENABLE ROW LEVEL SECURITY;

-- Deliberately no CREATE POLICY here: no permissive policy means RLS
-- default-deny applies to anon and authenticated alike. Do not add a
-- SELECT policy for either role -- see comment block above.

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
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.disposable_email_domains
    WHERE domain = lower(split_part(p_email, '@', 2))
  );
$$;

-- The function only ever returns a boolean about a domain string -- no row
-- data from disposable_email_domains is exposed by it -- so it is safe to
-- grant broadly even though the underlying table stays locked down (no
-- policy) per the comment above. supabase_auth_admin needs EXECUTE so the
-- Before User Created auth hook (which runs as that role) can call it.
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

  fs.mkdirSync(path.dirname(MIGRATION_PATH), { recursive: true });
  fs.writeFileSync(MIGRATION_PATH, buildMigrationSql(domains), 'utf8');
  console.log(`Wrote ${MIGRATION_PATH} (${domains.length} domains, ${buildInsertStatements(domains).length} INSERT statements)`);

  fs.mkdirSync(path.dirname(TS_OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(TS_OUTPUT_PATH, buildTsSource(domains), 'utf8');
  console.log(`Wrote ${TS_OUTPUT_PATH} (${domains.length} domains)`);
}

main();
