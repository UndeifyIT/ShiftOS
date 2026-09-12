/** Replaces src/lib/apiClient.ts inside the schedule preview only (see vite.preview.config.ts). */
import { createMockBackend, type PreviewRole } from './mockBackend.js';

const params = new URLSearchParams(window.location.search);

export const previewRole: PreviewRole = params.get('as') === 'supervisor' ? 'supervisor' : 'manager';

export const callRpc = createMockBackend({
  role: previewRole,
  status: params.get('status') === 'draft' ? 'draft' : 'published'
});
