import { defineConfig } from 'vitest/config';

/**
 * All tests (unit and integration) live in the standalone packages/tests/
 * workspace package, not colocated inside each package's own `src`. That's
 * deliberate: every other package's tsconfig `include`s all of `src` for its
 * own production `tsc -p tsconfig.json` build, and none of them declare
 * `vitest` as a dependency — a colocated `*.test.ts` importing `from
 * 'vitest'` would fail to resolve during that build. packages/tests is
 * excluded from every tsc project reference (see its own package.json) so
 * it can never affect the production build graph; vitest transpiles it
 * directly via esbuild instead.
 *
 * Integration tests import `@shiftos/api`/`@shiftos/database`, which
 * resolve to those packages' `dist/` output — the same thing the real
 * backend process runs, not `src` directly. Run `pnpm build` before
 * `pnpm test` (the root `pretest` script does this automatically).
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['packages/tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    // These integration tests talk to a real, remote Supabase pooler over
    // the internet (not a local/in-memory DB), and this repo's earlier
    // manual verification saw genuine per-call latency variance — a
    // generous timeout avoids flaking on that, not on a real hang.
    testTimeout: 60000,
    hookTimeout: 60000,
    // Run integration test files sequentially, not across parallel workers:
    // each file opens its own connection pool against the same small
    // Supabase project, and concurrent pools were observed to cause
    // connection-acquisition stalls.
    fileParallelism: false
  }
});
