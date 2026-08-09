import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function workspacePackage(name: string): string {
  return fileURLToPath(new URL(`../../packages/${name}/src`, import.meta.url));
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shiftos/config': workspacePackage('config'),
      '@shiftos/ui': workspacePackage('ui'),
      '@shiftos/utils': workspacePackage('utils'),
      '@shiftos/types': workspacePackage('types'),
      '@shiftos/constants': workspacePackage('constants')
    }
  },
  server: {
    proxy: {
      // Forwards to the local RPC server (packages/backend/src/server.ts, `pnpm dev:backend`)
      // so the browser calls same-origin /rpc/* paths and never needs CORS handling.
      '/rpc': {
        target: process.env.SHIFTOS_API_PROXY_TARGET ?? 'http://localhost:8787',
        changeOrigin: true
      }
    }
  }
});
