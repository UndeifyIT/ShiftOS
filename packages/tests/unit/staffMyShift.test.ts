import { describe, it, expect } from 'vitest';
import { buildMyShift, dayChip, type MyShiftInput } from '../../../apps/web/src/pages/staff/myShiftModel.js';
import { workingDays } from '../../../apps/web/src/pages/requests/requestsModel.js';
import type { Announcement, AttendanceRecord, Employee, LeaveRequest, Shift, ShiftSwap } from '../../../apps/web/src/types/domain.js';

const BASE = { organization_id: 'org', created_at: '2025-05-01T09:00:00Z', updated_at: '2025-05-01T09:00:00Z', deleted_at: null };
const NOW = new Date(2025, 4, 16, 7, 58); // Friday May 16, 2025, 07:58 local — the handoff's morning

function person(id: string, first: string, last: string): Employee {
  return {
    ...BASE,
    id,
    branch_id: 'br',
    employee_number: id,
    first_name: first,
    last_name: last,
    email: `${first}@x.test`,
    phone: null,
    date_of_birth: null,
    hire_date: '2024-01-01',
    employment_status: 'active',
    notes: null,
    avatar_url: null,
    department_id: 'sales',
    is_active: true
  } as Employee;
}
const ME = person('me', 'John', 'Doe');
const MICHAEL = person('mb', 'Michael', 'Brown');

function shift(date: string, title: string, start: string, end: string, department = 'sales'): Shift {
  return {
    ...BASE,
    id: `s-${date}`,
    branch_id: 'br',
    template_id: null,
    department_id: department,
    title,
    description: null,
    shift_date: date,
    start_time: `${start}:00`,
    end_time: `${end}:00`,
    crosses_midnight: false,
    break_minutes: 30,
    status: 'published',
    published_at: null,
    is_active: true
  } as Shift;
}

function swap(id: string, status: ShiftSwap['status'], date: string, title: string, patch: Partial<ShiftSwap> = {}): ShiftSwap {
  return {
    id,
    organization_id: 'org',
    branch_id: 'br',
    shift_assignment_id: `a-${date}`,
    requested_by_employee_id: 'me',
    target_employee_id: 'mb',
    status,
    notes: null,
    responded_by_employee_id: null,
    responded_at: null,
    decision_by: null,
    decision_at: null,
    decision_notes: null,
    created_at: '2025-05-14T07:58:00Z',
    updated_at: '2025-05-14T07:58:00Z',
    shift_date: date,
    shift_start_time: '14:00:00',
    shift_end_time: '22:00:00',
    shift_title: title,
    ...patch
  };
}

function leave(status: LeaveRequest['status'], start: string, end: string, reason: string): LeaveRequest {
  return {
    ...BASE,
    id: `l-${start}`,
    branch_id: 'br',
    employee_id: 'me',
    requested_by: 'u-me',
    approved_by: null,
    leave_type: 'annual_leave',
    status,
    start_date: start,
    end_date: end,
    total_days: 1,
    reason,
    manager_notes: null,
    cancellation_reason: null,
    last_status_changed_at: '2025-05-15T09:00:00Z',
    version: 1,
    created_by: 'u-me',
    rejected_by: null,
    cancelled_by: null,
    approved_at: null,
    rejected_at: null,
    cancelled_at: null
  } as LeaveRequest;
}

function announcement(id: string, role: string): Announcement {
  return {
    ...BASE,
    id,
    branch_id: 'br',
    title: `Notice ${id}`,
    content: 'Body',
    announcement_type: 'operational',
    visibility_type: 'branch',
    is_published: true,
    is_pinned: false,
    published_at: '2025-05-16T06:30:00Z',
    expires_at: null,
    created_by: 'u-x',
    author_name: 'Sarah Johnson',
    author_role: role
  } as Announcement;
}

function worked(date: string, minutes: number): AttendanceRecord {
  return { ...BASE, id: `att-${date}`, branch_id: 'br', shift_assignment_id: `a-${date}`, employee_id: 'me', attendance_status: 'completed', clock_in_at: `${date}T08:00:00`, clock_out_at: `${date}T16:15:00`, worked_minutes: minutes } as AttendanceRecord;
}

function input(patch: Partial<MyShiftInput> = {}): MyShiftInput {
  const published = new Set<string>();
  for (let d = 12; d <= 25; d += 1) published.add(`2025-05-${String(d).padStart(2, '0')}`);
  return {
    now: NOW,
    shifts: [
      shift('2025-05-12', 'Evening Shift', '14:00', '22:00'),
      shift('2025-05-13', 'Morning Shift', '08:00', '16:00'),
      shift('2025-05-14', 'Morning Shift', '08:00', '16:00'),
      shift('2025-05-15', 'Morning Shift', '08:00', '16:00'),
      shift('2025-05-16', 'Morning Shift', '08:00', '16:00'),
      shift('2025-05-17', 'Morning Shift', '08:00', '16:00'),
      shift('2025-05-19', 'Evening Shift', '14:00', '22:00', 'front')
    ],
    publishedDates: published,
    swaps: [
      swap('sw-mon', 'accepted', '2025-05-19', 'Evening Shift'),
      swap('sw-old', 'approved', '2025-05-16', 'Night Shift', { decision_at: '2025-05-12T11:00:00', decision_by_name: 'Sarah Johnson' })
    ],
    leave: [leave('pending', '2025-06-09', '2025-06-09', 'Graduation ceremony')],
    announcements: [announcement('a1', 'Supervisor'), announcement('a2', 'Manager')],
    acknowledged: new Map([['a2', true]]),
    attendance: ['2025-05-12', '2025-05-13', '2025-05-14', '2025-05-15'].map((d) => worked(d, 465)),
    employees: [ME, MICHAEL],
    departments: new Map([
      ['sales', 'Sales Floor'],
      ['front', 'Front End']
    ]),
    timeZone: 'Africa/Lagos',
    ...patch
  };
}

describe('Staff My Shift (handoff HOME.Staff)', () => {
  it('greets by time of day and counts down to today’s shift', () => {
    const view = buildMyShift(input(), ME);
    expect(view.title).toBe('Good morning, John');
    expect(view.subtitle).toBe("You're on the Morning Shift today — starts in 2 minutes");
  });

  it('builds the four stats from my own week', () => {
    const [next, shifts, hours, unread] = buildMyShift(input(), ME).stats;
    expect([next.value, next.meta]).toEqual(['08:00', 'Today · Morning Shift']);
    expect([shifts.value, shifts.meta]).toEqual(['6', '1 rest day remaining']);
    expect([hours.value, hours.meta]).toEqual(['31h', '4 shifts worked']);
    expect([unread.value, unread.meta]).toEqual(['1', 'From your supervisor']);
  });

  it('shows today and the next three days, with the rest day and the pending swap', () => {
    const week = buildMyShift(input(), ME).week;
    expect(week.map((r) => [r.chip, r.name, r.sub, r.middle, r.barLabel, r.status])).toEqual([
      ['FRI\n16', 'Today', 'Morning Shift · Sales Floor', '08:00 – 16:00', 'Starts in 2 min', 'Up next'],
      ['SAT\n17', 'Tomorrow', 'Morning Shift · Sales Floor', '08:00 – 16:00', 'Published', 'Scheduled'],
      ['SUN\n18', 'Rest day', 'No shift assigned', '—', '', 'Off'],
      ['MON\n19', 'Monday', 'Evening Shift · Front End', '14:00 – 22:00', 'Swap requested', 'Pending']
    ]);
  });

  it('marks an unpublished day and a shift in progress honestly', () => {
    const later = new Date(2025, 4, 16, 9, 0);
    const view = buildMyShift(input({ now: later, publishedDates: new Set(['2025-05-16', '2025-05-17']) }), ME);
    expect(view.week[0].status).toBe('On shift');
    expect(view.week[0].barLabel).toBe('Until 16:00');
    expect(view.week[2]).toMatchObject({ name: 'Sunday', sub: 'Schedule not published yet', status: 'Not published' });
    expect(view.subtitle).toBe("You're on the Morning Shift today — until 16:00");
  });

  it('lists open requests first, then what was decided, with who decided it', () => {
    const view = buildMyShift(input(), ME);
    expect(view.openRequests).toBe(2);
    expect(view.requests.map((r) => [r.title, r.meta, r.tag, r.done])).toEqual([
      ['Swap Mon 19 May · Evening Shift', 'With Michael Brown · awaiting supervisor', 'Swap', false],
      ['Time off · 09 June', 'Graduation ceremony · pending', 'Leave', false],
      ['Swap Fri 16 May · Night Shift', 'Approved 12 May by Sarah Johnson', 'Approved', true]
    ]);
  });

  it('offers a swap on the next shift that has none yet', () => {
    const swapAction = buildMyShift(input(), ME).actions.find((a) => a.action === 'swap');
    expect(swapAction?.body).toBe('Fri 16 · Morning Shift');
  });

  it('says so when nothing is published', () => {
    const view = buildMyShift(input({ shifts: [], publishedDates: new Set() }), ME);
    expect(view.hasSchedule).toBe(false);
    expect(view.next).toBeNull();
    expect(view.subtitle).toBe('Nothing on your published schedule yet');
    expect(view.stats[0]).toMatchObject({ value: '—', meta: 'Nothing published yet' });
  });

  it('formats day chips and counts working days', () => {
    expect(dayChip('2025-05-19')).toBe('MON\n19');
    expect(workingDays('2025-06-06', '2025-06-10')).toBe(3);
    expect(workingDays('2025-06-10', '2025-06-06')).toBe(0);
  });
});
