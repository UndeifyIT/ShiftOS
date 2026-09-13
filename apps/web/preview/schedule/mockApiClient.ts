/** Replaces src/lib/apiClient.ts inside the schedule preview only (see vite.preview.config.ts). */
import { createMockBackend, type PreviewRole } from './mockBackend.js';
import { createOverviewBackend } from './overviewBackend.js';

const params = new URLSearchParams(window.location.search);

export const previewRole: PreviewRole = params.get('as') === 'supervisor' ? 'supervisor' : 'manager';

// `?path=/` previews the Manager overview against the handoff's own morning; everything else is the schedule week.
export const callRpc =
  params.get('path') === '/'
    ? createOverviewBackend()
    : createMockBackend({
        role: previewRole,
        status: params.get('status') === 'draft' ? 'draft' : 'published'
      });
