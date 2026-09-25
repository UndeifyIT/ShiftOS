/** Replaces src/lib/apiClient.ts inside the schedule preview only (see vite.preview.config.ts). */
import { createMockBackend, type PreviewRole } from './mockBackend.js';
import { createOverviewBackend } from './overviewBackend.js';

const params = new URLSearchParams(window.location.search);

export const previewRole: PreviewRole = params.get('as') === 'supervisor' ? 'supervisor' : 'manager';

<<<<<<< HEAD
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
=======
// `?path=/` (Manager overview), `?path=/employees…`, `?path=/supervisors`, `?path=/admins`, `?path=/recent-activity`, `?path=/announcements`, `?path=/requests`, `?path=/reports` and `?path=/settings` run against the handoff's own morning; everything else is the schedule week.
const path = params.get('path') ?? '';
export const callRpc =
  path === '/' || path.startsWith('/employees') || path.startsWith('/supervisors') || path.startsWith('/admins') || path.startsWith('/recent-activity') || path.startsWith('/announcements') || path.startsWith('/requests') || path.startsWith('/reports') || path.startsWith('/settings')
    ? createOverviewBackend({ staffLogins: path.startsWith('/announcements') })
    : createMockBackend({
        role: previewRole,
        status: params.get('status') === 'draft' ? 'draft' : 'published'
      });
>>>>>>> origin/main
