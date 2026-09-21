/** Replaces src/lib/apiClient.ts inside the schedule preview only (see vite.preview.config.ts). */
import { createMockBackend, type PreviewRole } from './mockBackend.js';
import { createOverviewBackend } from './overviewBackend.js';

const params = new URLSearchParams(window.location.search);

export const previewRole: PreviewRole = params.get('as') === 'supervisor' ? 'supervisor' : 'manager';

// `?path=/` (Manager overview), `?path=/employees…`, `?path=/supervisors`, `?path=/admins` and `?path=/attendance` run against the handoff's own morning; everything else is the schedule week.
const path = params.get('path') ?? '';
export const callRpc =
  path === '/' || path.startsWith('/employees') || path.startsWith('/supervisors') || path.startsWith('/admins') || path.startsWith('/attendance') || path.startsWith('/tasks')
    ? createOverviewBackend()
    : createMockBackend({
        role: previewRole,
        status: params.get('status') === 'draft' ? 'draft' : 'published'
      });
