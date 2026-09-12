import { fileURLToPath, URL } from 'node:url';
import { defineConfig, mergeConfig, type Plugin } from 'vite';
import baseConfig from './vite.config';

/**
 * `pnpm --filter @shiftos/web preview:schedule` — the real Schedules page,
 * AppShell and all, running against an in-memory demo backend seeded with the
 * design handoff's own week (preview/schedule/mockBackend.ts). No Supabase,
 * no RPC server, nothing saved. Query params: `?as=manager|supervisor`,
 * `&status=published|draft`, `&week=YYYY-MM-DD`.
 */
const previewDir = fileURLToPath(new URL('./preview/schedule/', import.meta.url));

const MOCKED_MODULES: Array<[suffix: string, mock: string]> = [
  ['/src/lib/apiClient.ts', 'mockApiClient.ts'],
  ['/src/lib/supabase.ts', 'mockSupabase.ts'],
  ['/src/auth/SessionProvider.tsx', 'mockSession.tsx']
];

function schedulePreviewMocks(): Plugin {
  return {
    name: 'shiftos-schedule-preview-mocks',
    enforce: 'pre',
    async resolveId(source, importer) {
      if (!importer || importer.startsWith(previewDir.replace(/\\/g, '/'))) return null;
      const resolved = await this.resolve(source, importer, { skipSelf: true });
      if (!resolved) return null;
      const id = resolved.id.replace(/\\/g, '/');
      const match = MOCKED_MODULES.find(([suffix]) => id.endsWith(`apps/web${suffix}`));
      return match ? `${previewDir}${match[1]}` : null;
    }
  };
}

export default mergeConfig(
  baseConfig,
  defineConfig({
    root: previewDir,
    plugins: [schedulePreviewMocks()],
    server: { port: 5191, strictPort: true, fs: { allow: [fileURLToPath(new URL('../../', import.meta.url))] } }
  })
);
