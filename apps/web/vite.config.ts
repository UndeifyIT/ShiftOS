import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shiftos/config': '/packages/config/src',
      '@shiftos/ui': '/packages/ui/src',
      '@shiftos/utils': '/packages/utils/src',
      '@shiftos/types': '/packages/types/src',
      '@shiftos/constants': '/packages/constants/src'
    }
  }
});
