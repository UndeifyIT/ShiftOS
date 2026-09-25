/**
 * The Staff preview (`?as=staff`): John Doe's side of the handoff's morning,
 * Friday May 16, 2025 at 07:58 — HOME.Staff. He is on the Morning Shift
 * today at 08:00 and tomorrow, rests on Sunday, and has asked Michael Brown
 * to take Monday's Evening Shift; Monday to Thursday are already worked
 * (31h); one notice from Sarah Johnson still needs his acknowledgement.
 */
import type { AnnouncementAcknowledgement, AttendanceRecord, LeaveRequest, Schedule, ScheduleDayOff, Shift, ShiftAssignment, ShiftSwap } from '../../src/types/domain.js';

const ME = 'p2';

interface StaffDeps {
  at: (day: number, hours: number, minutes: number) => string;
  stamp: <T>(row: T) => T & { organization_id: string; created_at: string; updated_at: string; deleted_at: null };
  BRANCH: string;
  branchSwaps: ShiftSwap[];
  branchLeave: LeaveRequest[];
  leave: (id: string, employeeId: string, start: string, end: string, type: LeaveRequest['leave_type'], reason: string, day: number) => LeaveRequest;
  swap: (id: string, assignmentId: string, from: string, to: string) => ShiftSwap;
  withShift: (row: ShiftSwap, date: string, start: string, end: string, title: string, departmentId: string, patch?: Partial<ShiftSwap>) => ShiftSwap;
  acknowledgements: AnnouncementAcknowledgement[];
  ack: (announcementId: string, employeeId: string, when: string) => AnnouncementAcknowledgement;
}

export function staffHandlers(deps: StaffDeps): Record<string, (input: Record<string, unknown>) => unknown> {
  const { at, stamp, BRANCH, branchSwaps, branchLeave, leave, swap, withShift, acknowledgements, ack } = deps;

  // Sarah's "New promotion display" is the one notice John hasn't acknowledged yet.
  const unread = acknowledgements.findIndex((row) => row.announcement_id === 'ann-promotion' && row.employee_id === ME);
  if (unread >= 0) acknowledgements.splice(unread, 1);

  const schedules: Schedule[] = [
    stamp({ id: 'sch-w20', branch_id: BRANCH, name: 'Week 20', start_date: '2025-05-12', end_date: '2025-05-18', status: 'published' as const }),
    stamp({ id: 'sch-w21', branch_id: BRANCH, name: 'Week 21', start_date: '2025-05-19', end_date: '2025-05-25', status: 'published' as const })
  ] as Schedule[];

  // [date, title, department, start, end] — the Morning Shift is 08:00–16:00, the Evening Shift 14:00–22:00.
  const WEEK: Array<[string, string, string, string, string]> = [
    ['2025-05-12', 'Evening Shift', 'dep-sales', '14:00', '22:00'],
    ['2025-05-13', 'Morning Shift', 'dep-sales', '08:00', '16:00'],
    ['2025-05-14', 'Morning Shift', 'dep-sales', '08:00', '16:00'],
    ['2025-05-15', 'Morning Shift', 'dep-sales', '08:00', '16:00'],
    ['2025-05-16', 'Morning Shift', 'dep-sales', '08:00', '16:00'],
    ['2025-05-17', 'Morning Shift', 'dep-sales', '08:00', '16:00'],
    ['2025-05-19', 'Evening Shift', 'dep-frontend', '14:00', '22:00'],
    ['2025-05-20', 'Morning Shift', 'dep-sales', '08:00', '16:00'],
    ['2025-05-21', 'Morning Shift', 'dep-sales', '08:00', '16:00']
  ];
  const shifts: Shift[] = WEEK.map(([date, title, departmentId, start, end]) =>
    stamp({
      id: `shf-me-${date}`,
      branch_id: BRANCH,
      template_id: null,
      department_id: departmentId,
      title,
      description: null,
      shift_date: date,
      start_time: `${start}:00`,
      end_time: `${end}:00`,
      crosses_midnight: false,
      break_minutes: 30,
      status: 'published' as const,
      published_at: at(9, 7, 12),
      is_active: true
    })
  );
  const assignments: ShiftAssignment[] = shifts.map((shift) =>
    stamp({
      id: `asg-me-${shift.shift_date}`,
      shift_id: shift.id,
      employee_id: ME,
      assignment_status: 'assigned' as const,
      assigned_at: at(9, 7, 12),
      confirmed_at: null,
      declined_at: null,
      cancelled_at: null,
      assigned_by: 'user-p1',
      notes: null
    })
  );
  const dayOffs: ScheduleDayOff[] = [
    stamp({ id: 'off-me-18', schedule_id: 'sch-w20', employee_id: ME, off_date: '2025-05-18', created_by: 'user-p1' })
  ];
  const inSchedule = (scheduleId: unknown) => {
    const schedule = schedules.find((s) => s.id === scheduleId);
    return (shift: Shift) => Boolean(schedule) && shift.shift_date >= schedule!.start_date && shift.shift_date <= schedule!.end_date;
  };

  // Monday to Thursday worked: 7h45 each after the break, 31h in all.
  const attendance: AttendanceRecord[] = shifts
    .filter((shift) => shift.shift_date < '2025-05-16')
    .map((shift) => {
      const day = Number(shift.shift_date.slice(8));
      const startHour = Number(shift.start_time.slice(0, 2));
      return {
        ...stamp({ id: `att-me-${shift.shift_date}` }),
        branch_id: BRANCH,
        shift_assignment_id: `asg-me-${shift.shift_date}`,
        employee_id: ME,
        attendance_status: 'completed' as const,
        clock_in_at: at(day, startHour - 1, 58),
        clock_out_at: at(day, startHour + 8, 13),
        break_minutes: 30,
        worked_minutes: 465,
        overtime_minutes: 0,
        late_minutes: 0,
        early_departure_minutes: 0,
        notes: null,
        recorded_by: 'user-me',
        updated_by: null,
        version: 1
      };
    });

  // His Monday swap is the branch's SWP-2025-0148 (with Michael Brown, awaiting Sarah); an older one was approved on the 12th.
  const monday = branchSwaps.find((s) => s.id === 'sw-0148');
  if (monday) monday.shift_assignment_id = 'asg-me-2025-05-19';
  branchSwaps.push(
    withShift(swap('sw-0127', 'asg-me-night', ME, 'p13'), '2025-05-16', '22:00', '06:00', 'Night Shift', 'dep-sales', {
      status: 'approved',
      notes: 'Covering the Saturday morning delivery instead.',
      decision_by: 'user-p1',
      decision_by_name: 'Sarah Johnson',
      decision_at: at(12, 11, 0),
      created_at: at(10, 8, 30)
    })
  );
  const mySwaps = () => branchSwaps.filter((s) => s.requested_by_employee_id === ME || s.target_employee_id === ME);

  return {
    list_schedules: () => schedules,
    list_shifts_for_employee_in_schedule: (input) => shifts.filter(inSchedule(input.scheduleId)),
    list_my_shift_assignments_in_schedule: (input) => {
      const ids = new Set(shifts.filter(inSchedule(input.scheduleId)).map((s) => s.id));
      return assignments.filter((a) => ids.has(a.shift_id));
    },
    list_schedule_day_offs: (input) => dayOffs.filter((d) => d.schedule_id === input.scheduleId),
    list_my_attendance: () => attendance,
    list_my_shift_swaps: mySwaps,
    list_open_shift_swaps: () => [],
    list_my_leave: () => branchLeave.filter((l) => l.employee_id === ME),
    request_shift_swap: (input) => {
      const assignment = assignments.find((a) => a.id === input.shiftAssignmentId);
      const shift = shifts.find((s) => s.id === assignment?.shift_id);
      const created = withShift(
        swap(`sw-new-${branchSwaps.length}`, String(input.shiftAssignmentId), ME, (input.targetEmployeeId as string) ?? null),
        shift?.shift_date ?? '2025-05-20',
        (shift?.start_time ?? '08:00').slice(0, 5),
        (shift?.end_time ?? '16:00').slice(0, 5),
        shift?.title ?? 'Shift',
        shift?.department_id ?? 'dep-sales',
        { status: 'pending', notes: (input.notes as string) ?? null, responded_by_employee_id: null, responded_at: null, created_at: at(16, 7, 58) }
      );
      branchSwaps.unshift(created);
      return created;
    },
    cancel_shift_swap: (input) => {
      const row = branchSwaps.find((s) => s.id === input.swapId);
      if (!row) throw new Error('Swap not found');
      return Object.assign(row, { status: 'cancelled' });
    },
    create_leave_request: (input) => {
      const created = leave(`lv-${branchLeave.length + 1}`, ME, String(input.startDate), String(input.endDate), input.leaveType as LeaveRequest['leave_type'], String(input.reason), 16);
      branchLeave.unshift(created);
      return created;
    },
    cancel_leave_request: (input) => {
      const row = branchLeave.find((l) => l.id === input.leaveRequestId);
      if (!row) throw new Error('Leave request not found');
      return Object.assign(row, { status: 'cancelled', cancelled_at: at(16, 7, 58) });
    },
    acknowledge_announcement: (input) => {
      if (!acknowledgements.some((row) => row.announcement_id === input.announcementId && row.employee_id === ME)) {
        acknowledgements.push(ack(String(input.announcementId), ME, at(16, 7, 58)));
      }
      return { acknowledged: true };
    }
  };
}
