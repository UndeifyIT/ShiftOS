/** Replaces src/lib/apiClient.ts inside the schedule preview only (see vite.preview.config.ts). */
import { createMockBackend, type PreviewRole } from './mockBackend.js';
import { createOverviewBackend } from './overviewBackend.js';

const params = new URLSearchParams(window.location.search);

const asParam = params.get('as');
export const previewRole: PreviewRole = asParam === 'supervisor' || asParam === 'staff' ? asParam : 'manager';

// `?path=/` (Manager overview), `?path=/employees…`, `?path=/supervisors`, `?path=/admins`, `?path=/recent-activity`, `?path=/announcements`, `?path=/requests`, `?path=/reports` and `?path=/settings` run against the handoff's own morning; everything else is the schedule week.
const path = params.get('path') ?? '';
// The Supervisor's pages (everything but Schedules) run against the same morning, seen from Sarah Johnson's shift.
const supervisorMorning = previewRole === 'supervisor' && !path.startsWith('/schedules');
// Staff (`?as=staff`): every page is John Doe's side of that morning.
export const callRpc = previewRole === 'staff'
  ? createOverviewBackend({ staff: true })
  : supervisorMorning
  ? createOverviewBackend({ supervisor: true, staffLogins: path.startsWith('/announcements') })
  : path === '/' || path.startsWith('/employees') || path.startsWith('/supervisors') || path.startsWith('/admins') || path.startsWith('/recent-activity') || path.startsWith('/announcements') || path.startsWith('/requests') || path.startsWith('/reports') || path.startsWith('/settings')
    ? createOverviewBackend({ staffLogins: path.startsWith('/announcements') })
    : createMockBackend({
        role: previewRole,
        status: params.get('status') === 'draft' ? 'draft' : 'published'
      });
