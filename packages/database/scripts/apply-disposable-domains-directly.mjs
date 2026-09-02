// Reusable helper: apply a large migration file's statements directly via a
// live Postgres connection, one statement at a time, splitting on the file's
// own statement boundaries. Not part of the app's runtime or build --
// intended as a documented fallback for when a migration is too large to
// push through the normal MCP apply_migration path in one go (e.g. a
// multi-hundred-thousand-token bulk data seed like
// supabase/migrations/051_create_disposable_email_domains.sql, which is what
// this script was originally written for and used to finish applying).
//
// Reuses this package's own reviewed connection helper (createPostgresClient),
// including its existing PG_ALLOW_INSECURE_TLS opt-in for Supabase's pooler
// cert, instead of constructing a raw pg.Client with its own TLS handling.
//
// Usage:
//   DATABASE_URL=... node apply-disposable-domains-directly.mjs <path-to-migration-file>
//
// <path-to-migration-file> may be absolute or relative to the current
// working directory. No filename is hardcoded -- this can be pointed at any
// future migration that needs the same large-file fallback.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createPostgresClient } from '../dist/index.js';

const migrationArg = process.argv[2];
if (!migrationArg) {
  console.error(
    'Usage: DATABASE_URL=... node apply-disposable-domains-directly.mjs <path-to-migration-file>\n' +
      '  <path-to-migration-file> may be absolute or relative to the current working directory.'
  );
  process.exit(1);
}

const migrationPath = resolve(process.cwd(), migrationArg);
const sql = readFileSync(migrationPath, 'utf8');

// A block is skipped only if it is PURELY comments/whitespace (no actual SQL
// at all) -- not merely because it *starts* with a comment line, since a
// documented statement (e.g. several lines of "-- why" above a CREATE
// POLICY) is still real SQL that must be applied. Leading/trailing comments
// on a kept block are sent to Postgres as-is; comments inside a statement
// are harmless.
function isCommentOnly(block) {
  return block
    .split('\n')
    .every((line) => line.trim().length === 0 || line.trim().startsWith('--'));
}

// Splits on top-level ';' only -- NOT inside a $tag$...$tag$ dollar-quoted
// body. A naive `sql.split(/;\s*\n/)` (this script's original approach)
// breaks any CREATE FUNCTION/DO block whose body contains its own internal
// semicolons (e.g. `AS $$ SELECT ...; $$;`) into invalid fragments -- a real
// bug this script never hit before because it only ever ran a hand-filtered
// subset of statements (bulk INSERTs) that happened to contain no dollar
// quoting. Fixed here for dollar-quoted bodies (including function bodies),
// which is what every migration in this repo so far actually uses.
//
// A ';' inside a `-- line comment` is not a statement terminator either --
// found live: this script's own migration 053 originally had a semicolon in
// two prose comments ("...supabase_auth_admin; it did not touch..."), which
// this splitter (before this fix) treated as real statement boundaries,
// producing a fragment starting mid-sentence and a genuine Postgres syntax
// error. Fixed by skipping to end-of-line whenever `--` is seen outside a
// dollar-quoted body or an ordinary string.
//
// That first fix introduced a real regression of its own, caught in review:
// a `--` inside an ordinary '...' string literal (e.g. a COMMENT ON TABLE
// whose text happens to contain "--", which 053 itself has) would also get
// treated as a comment opener, swallowing the string's own closing quote
// and the statement's real ';' terminator -- silently merging two
// statements into one instead of raising an error. Migration 053 only
// happened to survive this by accident (that COMMENT is the file's last
// statement, so the swallowed ';' was recovered by the trailing-tail
// fallback) -- a second statement after it would have broken. Fixed
// properly this time: ordinary '...' strings are now tracked as their own
// state (with '' as the standard SQL escape for a literal quote inside one),
// and `--`/`;`/`$tag$` are all ignored while inside one, the same way they
// already are inside a dollar-quoted body.
//
// Postgres dollar-quote tags follow identifier rules: letters/underscore
// first, letters/digits/underscores after (e.g. `$body_v2$` is valid).
const DOLLAR_TAG_RE = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/;

function splitSqlStatements(text) {
  const statements = [];
  let segmentStart = 0; // start index of the statement currently being built
  let i = 0;
  let dollarTag = null; // e.g. '$$' or '$body$' while inside a dollar-quoted string
  let inString = false; // true while inside an ordinary '...' string literal

  while (i < text.length) {
    if (dollarTag) {
      const closeIndex = text.indexOf(dollarTag, i);
      i = closeIndex === -1 ? text.length : closeIndex + dollarTag.length;
      dollarTag = null;
      continue;
    }

    if (inString) {
      const ch = text[i];
      if (ch === "'") {
        // '' inside a string is an escaped literal quote, not the closer --
        // stays in the string and consumes both characters.
        if (text[i + 1] === "'") {
          i += 2;
          continue;
        }
        inString = false;
      }
      i += 1;
      continue;
    }

    if (text[i] === '-' && text[i + 1] === '-') {
      const newlineIndex = text.indexOf('\n', i);
      i = newlineIndex === -1 ? text.length : newlineIndex + 1;
      continue;
    }

    const ch = text[i];
    if (ch === "'") {
      inString = true;
      i += 1;
      continue;
    }

    if (ch === '$') {
      // Only check a short lookahead window for a dollar-quote tag opener
      // (tags are a handful of chars, e.g. $$ or $body$) -- never slice the
      // whole remaining file, which is what made the naive version O(n^2)
      // on a multi-MB input.
      const window = text.slice(i, i + 32);
      const tagMatch = DOLLAR_TAG_RE.exec(window);
      if (tagMatch) {
        dollarTag = tagMatch[0];
        i += dollarTag.length;
        continue;
      }
    }

    if (ch === ';') {
      statements.push(text.slice(segmentStart, i + 1));
      segmentStart = i + 1;
    }
    i += 1;
  }
  if (segmentStart < text.length) {
    const tail = text.slice(segmentStart);
    if (tail.trim().length > 0) statements.push(tail);
  }
  return statements;
}

const statements = splitSqlStatements(sql)
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !isCommentOnly(s));

console.log(`Read ${migrationPath}: ${statements.length} statements to apply.`);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL not set');

const client = createPostgresClient({ connectionString });

try {
  for (let i = 0; i < statements.length; i++) {
    const result = await client.query(statements[i]);
    const rowInfo = Array.isArray(result) ? `${result.length} row(s) returned` : 'ok';
    console.log(`Statement ${i + 1}/${statements.length} applied — ${rowInfo}`);
  }
  console.log('All statements applied successfully.');
} finally {
  await client.close();
}
