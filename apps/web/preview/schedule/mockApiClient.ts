/** Replaces src/lib/apiClient.ts inside the schedule preview only (see vite.preview.config.ts). */
import { createMockBackend, type PreviewRole } from './mockBackend.js';
import { createOverviewBackend } from './overviewBackend.js';

const params = new URLSearchParams(window.location.search);

export const previewRole: PreviewRole = params.get('as') === 'supervisor' ? 'supervisor' : 'manager';

/*
 * Two fixtures live here: the schedule week (mockBackend) and the handoff's
 * own Friday morning (overviewBackend), which every other screen reads.
 *
 * The app runs on a MemoryRouter, so the address bar never changes: clicking
 * through the sidebar has to keep working on whatever backend was chosen at
 * load. The schedule builder is the specialised one, so it is the exception —
 * everything else gets the seeded morning, and the pages the sidebar leads to
 * have data whichever one you started on.
 */
// Mirrors main.tsx's landing route: `?path=/schedules…`, or a bare `?week=`.
const path = params.get('path') ?? (params.get('week') ? '/schedules' : '/');
const scheduleBuilder = path.startsWith('/schedules');

export const callRpc = scheduleBuilder
  ? createMockBackend({
      role: previewRole,
      status: params.get('status') === 'draft' ? 'draft' : 'published'
    })
  : createOverviewBackend();
