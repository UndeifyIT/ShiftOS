/**
 * In-memory backend for the Manager overview preview (`?path=/`), seeded to
 * reproduce the design handoff's HOME.Manager morning — Friday May 16, 2025
 * at 07:58 (see mockClock.ts): 20 people, 17 checked in, Sales Floor / Front
 * End / Warehouse / Bakery coverage, 3 coverage gaps, 2 swaps + 3 leave
 * waiting, 2 supervisor invitations, next week still a draft, and the
 * handoff's two announcements.
 */
import type { AttendanceRecord, Employee, EmployeeImport, Invitation, LeaveRequest, Shift, ShiftAssignment, ShiftSwap, Task, Announcement, AnnouncementAcknowledgement } from '../../src/types/domain.js';

const ORG = 'org-abc-supermarket';
const BRANCH = 'br-main';
const at = (day: number, hours: number, minutes: number): string => new Date(2025, 4, day, hours, minutes).toISOString();
const CREATED = at(9, 7, 12);

const stamp = <T,>(row: T) => ({ ...row, organization_id: ORG, created_at: CREATED, updated_at: CREATED, deleted_at: null });

const DEPARTMENTS: Array<[string, string]> = [
  ['dep-sales', 'Sales Floor'],
  ['dep-frontend', 'Front End'],
  ['dep-warehouse', 'Warehouse'],
  ['dep-bakery', 'Bakery'],
  ['dep-facilities', 'Facilities']
];

// [id, first, last, department, supervisor?, clocked in today at (minutes after 07:00) or null]
const PEOPLE: Array<[string, string, string, string, boolean, number | null]> = [
  ['p1', 'Sarah', 'Johnson', 'dep-sales', true, 21],
  ['p2', 'John', 'Doe', 'dep-sales', false, 49],
  ['p3', 'Amaka', 'Nwosu', 'dep-sales', false, 24],
  ['p4', 'Tunde', 'Adeyemi', 'dep-sales', false, 26],
  ['p5', 'Emeka', 'Obi', 'dep-sales', false, 27],
  ['p6', 'Chioma', 'Okafor', 'dep-sales', false, 28],
  ['p7', 'Michael', 'Okafor', 'dep-frontend', true, 20],
  ['p8', 'Mary', 'Johnson', 'dep-frontend', false, 52],
  ['p9', 'Osaro', 'Miracle', 'dep-frontend', false, 25],
  ['p10', 'Victoria', 'Odibenua', 'dep-frontend', false, null],
  ['p11', 'Funke', 'Adebayo', 'dep-frontend', false, 23],
  ['p12', 'Michael', 'Brown', 'dep-warehouse', false, 44],
  ['p13', 'Kelechi', 'Eze', 'dep-warehouse', false, 22],
  ['p14', 'Wilson', 'Ijeoma', 'dep-warehouse', false, null],
  ['p15', 'Chidimma', 'Obi', 'dep-warehouse', false, null],
  ['p16', 'Grace', 'Williams', 'dep-bakery', true, 19],
  ['p17', 'James', 'Carter', 'dep-bakery', false, 24],
  ['p18', 'Halima', 'Musa', 'dep-bakery', false, 25],
  ['p19', 'Ifeanyi', 'Nnamdi', 'dep-bakery', false, 26],
  ['p20', 'David', 'Wilson', 'dep-bakery', false, 29]
];

const emailOf = (first: string, last: string): string => `${first}.${last}@abc.example`.toLowerCase();

export function createOverviewBackend(options: { staffLogins?: boolean } = {}) {
  // Employees page preview: handoff-style phone numbers, one person on leave and two inactive (EMP_STATS 17 active · 1 on leave).
  const STATUS_OF: Record<string, Employee['employment_status']> = { p10: 'on_leave', p14: 'inactive', p15: 'inactive' };
  const employees: Employee[] = PEOPLE.map(([id, first, last, departmentId], index) => ({
    ...stamp({
      id,
      branch_id: BRANCH,
      employee_number: `EMP-${id.slice(1).padStart(3, '0')}`,
      first_name: first,
      last_name: last,
      email: emailOf(first, last),
      phone: `+234 80${(index % 9) + 1} ${String(234 + index * 111).slice(-3)} ${String(5678 + index * 1111).slice(-4)}`,
      date_of_birth: null,
      hire_date: '2024-01-15',
      employment_status: STATUS_OF[id] ?? ('active' as const),
      notes: null,
      avatar_url: null,
      department_id: departmentId,
      is_active: true,
      gender: null,
      employment_type: index % 4 === 3 ? 'part_time' : 'full_time',
      reports_to_employee_id: id === 'p2' ? 'p1' : null
    }),
    created_at: at(index % 2 ? 12 : 28 - (index % 5) * 3, 9, 0)
  }));

  // Employee Profile preview: John Doe's month so far — the handoff's HISTORY_DAYS marks with its HISTORY_ROWS times — and the first half of April to compare with.
  // [month, day, clock in 'HH:MM' | null (absent), clock out, late minutes, notes]
  const HISTORY: Array<[number, number, string | null, string | null, number, string | null]> = [
    [5, 1, '09:00', '17:00', 0, null], [5, 2, '09:00', '17:00', 0, null], [5, 5, '09:00', '17:00', 0, null], [5, 6, '09:10', '17:00', 10, null],
    [5, 7, '09:00', '17:00', 0, null], [5, 8, '09:00', '17:00', 0, null], [5, 9, '09:16', '17:00', 16, null], [5, 11, null, null, 0, null],
    [5, 12, '09:20', '17:05', 20, null], [5, 13, '09:12', '17:37', 12, null], [5, 14, '08:55', '17:25', 0, 'Approved OT'], [5, 15, '09:00', '17:00', 0, null],
    [5, 16, '09:05', '17:25', 5, null],
    [4, 1, '09:00', '17:00', 0, null], [4, 2, '09:00', '17:00', 0, null], [4, 3, '09:25', '17:00', 25, null], [4, 4, '09:00', '17:00', 0, null],
    [4, 7, '09:00', '16:30', 0, null], [4, 8, '09:00', '17:00', 0, null], [4, 9, '09:30', '17:00', 30, null], [4, 10, '09:00', '17:00', 0, null],
    [4, 11, '09:18', '17:00', 18, null], [4, 14, null, null, 0, null], [4, 15, '09:00', '15:00', 0, null], [4, 16, '09:00', '17:00', 0, null]
  ];
  const minutesOf = (hm: string): number => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3));
  const history: AttendanceRecord[] = HISTORY.map(([month, day, clockIn, clockOut, late, notes]) => {
    const date = `2025-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const stampAt = (hm: string) => new Date(2025, month - 1, day, Number(hm.slice(0, 2)), Number(hm.slice(3))).toISOString();
    return {
      ...stamp({ id: `hist-${date}` }),
      created_at: stampAt(clockIn ?? '09:00'),
      updated_at: stampAt(clockOut ?? '09:00'),
      branch_id: BRANCH,
      shift_assignment_id: `asg-hist-${date}`,
      employee_id: 'p2',
      attendance_status: clockIn === null ? 'absent' : late > 0 ? 'late' : 'completed',
      clock_in_at: clockIn ? stampAt(clockIn) : null,
      clock_out_at: clockOut ? stampAt(clockOut) : null,
      break_minutes: 0,
      worked_minutes: clockIn && clockOut ? minutesOf(clockOut) - minutesOf(clockIn) : 0,
      overtime_minutes: 0,
      late_minutes: late,
      early_departure_minutes: 0,
      notes,
      recorded_by: 'user-me',
      updated_by: null,
      version: 1,
      shift_date: date,
      shift_start_time: '09:00:00',
      shift_end_time: '17:00:00',
      shift_title: 'Day Shift'
    };
  });
  const patchEmployee = (input: Record<string, unknown>): Employee => {
    const employee = employees.find((e) => e.id === input.employeeId);
    if (!employee) throw new Error('Employee not found');
    const fields: Record<string, keyof Employee> = {
      firstName: 'first_name', lastName: 'last_name', email: 'email', phone: 'phone', employmentStatus: 'employment_status', avatarUrl: 'avatar_url',
      departmentId: 'department_id', hireDate: 'hire_date', dateOfBirth: 'date_of_birth', gender: 'gender', employmentType: 'employment_type', reportsToEmployeeId: 'reports_to_employee_id'
    };
    for (const [key, column] of Object.entries(fields)) if (key in input) (employee as unknown as Record<string, unknown>)[column] = input[key];
    return employee;
  };
  const createEmployee = (input: Record<string, unknown>): Employee => {
    const id = `new-${Date.now()}`;
    const employee: Employee = {
      ...stamp({
        id,
        branch_id: BRANCH,
        employee_number: (input.employeeNumber as string) || `EMP-${String(employees.length + 1).padStart(3, '0')}`,
        first_name: String(input.firstName),
        last_name: String(input.lastName),
        email: (input.email as string) ?? null,
        phone: (input.phone as string) ?? null,
        date_of_birth: (input.dateOfBirth as string) ?? null,
        hire_date: String(input.hireDate),
        employment_status: 'active' as const,
        notes: null,
        avatar_url: null,
        department_id: (input.departmentId as string) ?? null,
        is_active: true,
        gender: (input.gender as string) ?? null,
        employment_type: (input.employmentType as string) ?? null,
        reports_to_employee_id: (input.reportsToEmployeeId as string) ?? null
      }),
      created_at: at(16, 7, 58)
    };
    employees.push(employee);
    return employee;
  };

  const members = [
    stamp({ id: 'mem-me', user_id: 'user-me', role_id: 'role-manager', joined_at: CREATED, is_active: true, user_email: 'daniel@abc.example', user_first_name: 'Daniel', user_last_name: 'Okonkwo', role_name: 'Manager' }),
    // Admins page: a second organization-wide login.
    stamp({ id: 'mem-admin', user_id: 'user-admin', role_id: 'role-admin', joined_at: at(14, 9, 0), is_active: true, user_email: 'ngozi.umeh@abc.example', user_first_name: 'Ngozi', user_last_name: 'Umeh', role_name: 'Admin' }),
    ...PEOPLE.filter(([, , , , supervisor]) => supervisor).map(([id, first, last]) =>
      stamp({ id: `mem-${id}`, user_id: `user-${id}`, role_id: 'role-supervisor', joined_at: CREATED, is_active: true, user_email: emailOf(first, last), user_first_name: first, user_last_name: last, role_name: 'Supervisor' })
    )
  ];

  // Announcements preview: staff have ShiftOS logins too — all but David Wilson, the handoff's "Not delivered" row.
  if (options.staffLogins) {
    for (const [id, first, last, , supervisor] of PEOPLE) {
      if (supervisor || id === 'p20') continue;
      members.push(
        stamp({ id: `mem-${id}`, user_id: `user-${id}`, role_id: 'role-employee', joined_at: CREATED, is_active: true, user_email: emailOf(first, last), user_first_name: first, user_last_name: last, role_name: 'Employee' })
      );
    }
  }

  // Announcements: the handoff's three notices and who has acknowledged each (ANNOUNCEMENTS + RECIPIENTS).
  const announcement = (id: string, title: string, content: string, published: string, author: string, branch: string | null, pinned = false): Announcement => ({
    ...stamp({ id }),
    created_at: published,
    branch_id: branch,
    title,
    content,
    announcement_type: branch ? 'operational' : 'policy',
    visibility_type: branch ? 'branch' : 'organization',
    is_published: true,
    is_pinned: pinned,
    published_at: published,
    expires_at: null,
    created_by: author
  });
  const announcements: Announcement[] = [
    announcement(
      'ann-stocktake',
      'Stocktake weekend — we close at 6 PM Saturday',
      "We close early on Saturday for the monthly stocktake. Supervisors should confirm their team's finish times by Friday afternoon.",
      at(15, 17, 40),
      'user-me',
      BRANCH,
      true
    ),
    announcement(
      'ann-promotion',
      'New promotion display goes live Friday',
      "Ensure all displays are updated and shelves are stocked before 10 AM. Ask Sarah if you're unsure where stock goes.",
      at(16, 7, 30),
      'user-p1',
      BRANCH
    ),
    announcement(
      'ann-threshold',
      'Late threshold moves to 10 minutes from 1 June',
      'The grace period shortens from 15 to 10 minutes. Please brief your teams before the change takes effect.',
      at(12, 9, 0),
      'user-me',
      null
    )
  ];
  const ack = (announcementId: string, employeeId: string, when: string): AnnouncementAcknowledgement => ({
    id: `ack-${announcementId}-${employeeId}`,
    organization_id: ORG,
    announcement_id: announcementId,
    employee_id: employeeId,
    acknowledged_at: when
  });
  const acknowledgements: AnnouncementAcknowledgement[] = [
    ack('ann-stocktake', 'p1', at(15, 18, 42)),
    ack('ann-stocktake', 'p7', at(15, 19, 10)),
    ack('ann-stocktake', 'p16', at(16, 6, 55)),
    ...['p2', 'p3', 'p4', 'p5', 'p6', 'p9', 'p11', 'p12', 'p13', 'p17', 'p18', 'p19'].map((id, index) => ack('ann-stocktake', id, at(16, 7, index + 1))),
    ack('ann-promotion', 'p2', at(16, 7, 33)),
    ack('ann-promotion', 'p12', at(16, 7, 35)),
    ...PEOPLE.filter(([id]) => !['p10', 'p14', 'p15', 'p20'].includes(id)).map(([id], index) => ack('ann-threshold', id, at(12 + (index % 3), 9, index)))
  ];

  const shifts: Shift[] = [];
  const assignments: ShiftAssignment[] = [];
  const attendance: AttendanceRecord[] = [];
  const addShift = (id: string, date: string, departmentId: string, start: string, end: string): Shift => {
    const shift: Shift = stamp({
      id,
      branch_id: BRANCH,
      template_id: null,
      department_id: departmentId,
      title: 'Shift',
      description: null,
      shift_date: date,
      start_time: `${start}:00`,
      end_time: `${end}:00`,
      crosses_midnight: false,
      break_minutes: 60,
      status: 'published' as const,
      published_at: CREATED,
      is_active: true
    });
    shifts.push(shift);
    return shift;
  };

  for (const [id, , , departmentId, , clockedIn] of PEOPLE) {
    const shift = addShift(`shf-${id}`, '2025-05-16', departmentId, '07:30', '17:00');
    const assignment: ShiftAssignment = stamp({
      id: `asg-${id}`,
      shift_id: shift.id,
      employee_id: id,
      assignment_status: 'assigned' as const,
      assigned_at: CREATED,
      confirmed_at: null,
      declined_at: null,
      cancelled_at: null,
      assigned_by: 'user-me',
      notes: null
    });
    assignments.push(assignment);
    if (clockedIn !== null) {
      // Shifts start 07:30; only Mary is past the 10-minute grace.
      const late = id === 'p8' ? clockedIn - 30 : 0;
      attendance.push({
        ...stamp({ id: `att-${id}` }),
        created_at: at(16, 7, clockedIn),
        updated_at: at(16, 7, clockedIn),
        branch_id: BRANCH,
        shift_assignment_id: assignment.id,
        employee_id: id,
        attendance_status: late > 0 ? 'late' : 'present',
        clock_in_at: at(16, 7, clockedIn),
        clock_out_at: null,
        break_minutes: 0,
        worked_minutes: 0,
        overtime_minutes: 0,
        late_minutes: late,
        early_departure_minutes: 0,
        notes: late > 0 ? 'traffic delay' : null,
        recorded_by: 'user-me',
        updated_by: null,
        version: 1
      });
    }
  }
  // Three published slots nobody is on yet — the week's coverage gaps.
  addShift('gap-1', '2025-05-17', 'dep-frontend', '07:30', '17:00');
  addShift('gap-2', '2025-05-17', 'dep-warehouse', '14:30', '22:30');
  addShift('gap-3', '2025-05-18', 'dep-bakery', '07:30', '17:00');

  const leave = (id: string, employeeId: string, start: string, end: string, type: LeaveRequest['leave_type'], reason: string, day: number): LeaveRequest =>
    ({
      ...stamp({ id }),
      created_at: at(day, 9, 0),
      branch_id: BRANCH,
      employee_id: employeeId,
      requested_by: `user-${employeeId}`,
      approved_by: null,
      leave_type: type,
      status: 'pending',
      start_date: start,
      end_date: end,
      total_days: 1,
      reason,
      manager_notes: null,
      cancellation_reason: null,
      last_status_changed_at: at(day, 9, 0),
      version: 1,
      created_by: `user-${employeeId}`,
      rejected_by: null,
      cancelled_by: null,
      approved_at: null,
      rejected_at: null,
      cancelled_at: null
    }) as LeaveRequest;

  const task = (id: string, title: string, patch: Partial<Task>): Task =>
    ({
      ...stamp({ id }),
      branch_id: BRANCH,
      title,
      description: null,
      due_date: '2025-05-16',
      due_time: null,
      priority: 'normal',
      task_status: 'assigned',
      assigned_supervisor_id: 'p12',
      assigned_by: 'user-me',
      assigned_at: null,
      completed_at: null,
      completed_by: null,
      completion_notes: null,
      verified_at: null,
      verified_by: null,
      verification_notes: null,
      verification_status: 'pending',
      created_by: 'user-me',
      updated_by: null,
      version: 1,
      ...patch
    }) as Task;

  const swap = (id: string, assignmentId: string, from: string, to: string): ShiftSwap => ({
    id,
    organization_id: ORG,
    branch_id: BRANCH,
    shift_assignment_id: assignmentId,
    requested_by_employee_id: from,
    target_employee_id: to,
    status: 'accepted',
    notes: null,
    responded_by_employee_id: to,
    responded_at: at(14, 12, 0),
    decision_by: null,
    decision_at: null,
    decision_notes: null,
    created_at: at(14, 10, 0),
    updated_at: at(14, 12, 0)
  });

  const withShift = (row: ShiftSwap, date: string, start: string, end: string, title: string, departmentId: string, patch: Partial<ShiftSwap> = {}): ShiftSwap => ({
    ...row,
    shift_date: date,
    shift_start_time: `${start}:00`,
    shift_end_time: `${end}:00`,
    shift_title: title,
    shift_department_id: departmentId,
    ...patch
  });
  const branchSwaps: ShiftSwap[] = [
    withShift(swap('sw-0148', 'asg-p2', 'p2', 'p12'), '2025-05-19', '14:00', '22:00', 'Evening Shift', 'dep-sales', {
      notes: "Family commitment on Monday evening. Michael has agreed to take the shift and I'll cover his Wednesday morning.",
      created_at: at(14, 7, 58),
      responded_at: at(14, 18, 0)
    }),
    withShift(swap('sw-0151', 'asg-p16', 'p16', 'p8'), '2025-05-24', '08:00', '16:00', 'Morning Shift', 'dep-frontend', {
      status: 'pending',
      notes: 'Swapping so I can attend a wedding on Saturday morning.',
      responded_by_employee_id: null,
      responded_at: null,
      created_at: at(16, 3, 58)
    }),
    withShift(swap('sw-0139', 'asg-p12', 'p12', 'p20'), '2025-05-16', '22:00', '06:00', 'Night Shift', 'dep-warehouse', {
      status: 'approved',
      notes: 'Medical appointment early Saturday morning.',
      decision_by: 'user-p1',
      decision_at: at(12, 11, 0),
      created_at: at(10, 9, 0)
    }),
    withShift(swap('sw-0132', 'asg-p8', 'p8', 'p17'), '2025-05-10', '08:00', '16:00', 'Morning Shift', 'dep-frontend', {
      status: 'rejected',
      notes: 'Wanted to switch departments for one shift.',
      decision_by: 'user-me',
      decision_at: at(9, 15, 0),
      decision_notes: 'Bakery cover cannot move to Front End',
      created_at: at(8, 9, 0)
    })
  ];
  const branchLeave: LeaveRequest[] = [
    leave('lv-1', 'p8', '2025-06-02', '2025-06-04', 'annual_leave', 'Family travel', 13),
    leave('lv-2', 'p16', '2025-05-28', '2025-05-28', 'unpaid_leave', 'Personal appointment', 14),
    leave('lv-3', 'p2', '2025-06-09', '2025-06-09', 'annual_leave', 'Graduation ceremony', 15),
    { ...leave('lv-4', 'p17', '2025-05-14', '2025-05-21', 'sick_leave', 'Medical certificate attached', 12), status: 'approved', approved_by: 'user-me', approved_at: at(12, 10, 0) },
    { ...leave('lv-5', 'p20', '2025-05-19', '2025-05-20', 'annual_leave', 'Short break', 11), status: 'rejected', rejected_by: 'user-me', rejected_at: at(12, 10, 0), manager_notes: 'Facilities is short that week' }
  ];
  const operationsReport = (current: boolean) => {
    // [department, attended, recorded] — Sales Floor 95%, Bakery 88%, Front End 78%, Warehouse 60% this period.
    const rates: Array<[string, number, number]> = current
      ? [['dep-sales', 190, 200], ['dep-bakery', 132, 150], ['dep-frontend', 117, 150], ['dep-warehouse', 60, 100]]
      : [['dep-sales', 186, 200], ['dep-bakery', 126, 150], ['dep-frontend', 111, 150], ['dep-warehouse', 58, 100]];
    const gapCount = current ? 11 : 15;
    return {
      startDate: current ? '2025-04-17' : '2025-03-18',
      endDate: current ? '2025-05-16' : '2025-04-16',
      attendance: { attended: rates.reduce((n, r) => n + r[1], 0), recorded: rates.reduce((n, r) => n + r[2], 0) },
      departments: rates.map(([department_id, attended, recorded]) => ({ department_id, attended, recorded })),
      scheduledMinutes: (current ? 6240 : 6060) * 60,
      shiftCount: 780,
      unfilledShifts: Array.from({ length: gapCount }, (_, i) => ({
        shift_id: `gap-${i}`,
        shift_date: `2025-05-${String(1 + i).padStart(2, '0')}`,
        start_time: '14:30:00',
        end_time: '22:30:00',
        title: 'Evening Shift',
        department_id: i % 2 ? 'dep-warehouse' : 'dep-frontend',
        paid_minutes: 420,
        assigned: 0
      })),
      swapRequests: current ? 18 : 12,
      hoursByEmployee: PEOPLE.map(([id]) => ({ employee_id: id, shifts: 20, worked_minutes: 20 * 450, overtime_minutes: 30, late_minutes: id === 'p8' ? 40 : 0 })),
      requestActivity: [
        { department_id: 'dep-sales', kind: 'swap', raised: 7, approved: 5, declined: 1 },
        { department_id: 'dep-frontend', kind: 'swap', raised: 11, approved: 8, declined: 2 },
        { department_id: 'dep-bakery', kind: 'leave', raised: 3, approved: 2, declined: 0 }
      ]
    };
  };
  const decideLeave = (id: string, status: 'approved' | 'rejected', notes: string | null): LeaveRequest => {
    const row = branchLeave.find((l) => l.id === id);
    if (!row) throw new Error('Leave request not found');
    Object.assign(row, { status, manager_notes: notes });
    return row;
  };
  const decideSwap = (id: string, status: 'approved' | 'rejected', notes: string | null): ShiftSwap => {
    const row = branchSwaps.find((s) => s.id === id);
    if (!row) throw new Error('Swap not found');
    Object.assign(row, { status, decision_by: 'user-me', decision_at: at(16, 7, 58), decision_notes: notes });
    return row;
  };

  const invitation = (id: string, email: string): Invitation => ({
    id,
    organization_id: ORG,
    email,
    first_name: null,
    last_name: null,
    role_id: 'role-supervisor',
    role_name: 'Supervisor',
    status: 'pending',
    invited_by: 'user-me',
    invited_by_first_name: 'Daniel',
    invited_by_last_name: 'Okonkwo',
    accepted_by: null,
    accepted_at: null,
    revoked_by: null,
    revoked_at: null,
    expires_at: at(19, 9, 0),
    created_at: at(12, 9, 0),
    updated_at: at(12, 9, 0)
  });

  // Import Employees preview: the handoff's three RECENT_IMPORTS, and a working in-memory import.
  const recentImport = (id: string, file: string, day: number, hours: number, minutes: number, status: EmployeeImport['status'], count: number): EmployeeImport => ({
    id,
    organization_id: ORG,
    branch_id: BRANCH,
    file_name: file,
    imported_by: 'user-p1',
    imported_by_name: 'Sarah Johnson',
    status,
    total_rows: count,
    imported_count: status === 'failed' ? 0 : count,
    failed_count: status === 'failed' ? count : 0,
    skipped_count: 0,
    invites_sent: status === 'failed' ? 0 : count,
    errors: status === 'failed' ? [{ row: 2, name: 'Linda Okafor', message: 'Email is required' }] : [],
    created_at: at(day, hours, minutes),
    deleted_at: null
  });
  const imports: EmployeeImport[] = [
    recentImport('imp-3', 'employees_may_2025.xlsx', 15, 14, 30, 'completed', 45),
    recentImport('imp-2', 'staff_list.csv', 10, 11, 15, 'completed', 38),
    recentImport('imp-1', 'team_import.xlsx', 5, 9, 45, 'failed', 12)
  ];
  const importEmployees = (input: Record<string, unknown>) => {
    const rows = (input.rows as Array<Record<string, unknown>>) ?? [];
    const imported = rows.map((row, index) => {
      const id = `imp-emp-${Date.now()}-${index}`;
      employees.push(
        stamp({
          id,
          branch_id: BRANCH,
          employee_number: `EMP-${String(employees.length + 1).padStart(3, '0')}`,
          first_name: String(row.firstName),
          last_name: String(row.lastName),
          email: (row.email as string) ?? null,
          phone: (row.phone as string) ?? null,
          date_of_birth: (row.dateOfBirth as string) ?? null,
          hire_date: String(row.hireDate),
          employment_status: 'active' as const,
          notes: null,
          avatar_url: null,
          department_id: (row.departmentId as string) ?? null,
          is_active: true
        })
      );
      return { row: Number(row.row), employeeId: id, name: `${row.firstName} ${row.lastName}` };
    });
    const invitesSent = input.sendInvites ? rows.filter((row) => row.roleId && row.email).length : 0;
    const record = recentImport(`imp-${Date.now()}`, String(input.fileName), 16, 7, 58, 'completed', imported.length);
    record.skipped_count = Number(input.skippedCount ?? 0);
    record.total_rows = imported.length + record.skipped_count;
    record.invites_sent = invitesSent;
    imports.unshift(record);
    return { import: record, imported, failed: [], invitesSent, inviteFailures: [] };
  };

  const handlers: Record<string, (input: Record<string, unknown>) => unknown> = {
    list_employee_imports: () => imports.slice(0, 5),
    import_employees: importEmployees,
    invite_member: () => ({}),
    // Supervisors page: the org's roles (org-wide ones are Admins, the rest are supervisors) and what each role may do.
    // [id, name, org-wide?] — Admin is branch-scoped on purpose (048), so it can be invited.
    list_roles: () =>
      [
        ['role-manager', 'Manager', true],
        ['role-admin', 'Admin', false],
        ['role-supervisor', 'Supervisor', false],
        ['role-employee', 'Employee', false]
      ].map(([id, name, orgWide]) => stamp({ id, name, description: null, is_system: true, is_active: true, grants_org_wide_branch_access: orgWide })),
    // The Employee role is a plain staff login: no management capability, so it is not a supervisor role.
    get_role_capabilities: (input) => {
      const supervisor = input.roleId === 'role-supervisor';
      return {
        manageSchedules: supervisor,
        markAttendance: supervisor,
        assignTasks: supervisor,
        approveSwaps: supervisor,
        postAnnouncements: false,
        viewReports: supervisor
      };
    },
    update_role_permissions: (input) => input.capabilities,
    list_invitable_roles: () =>
      ['Employee', 'Supervisor', 'Admin'].map((name) => stamp({ id: `role-${name.toLowerCase()}`, name, description: null, is_system: true, is_active: true, grants_org_wide_branch_access: false })),
    list_branches: () => [stamp({ id: BRANCH, name: 'Main Branch', address: null, settings: {}, is_active: true })],
    list_employees: () => employees,
    get_employee: (input) => {
      const employee = employees.find((e) => e.id === input.employeeId);
      if (!employee) throw new Error('Employee not found');
      return employee;
    },
    update_employee: patchEmployee,
    create_employee: createEmployee,
    list_attendance_for_employee: (input) => history.filter((r) => r.employee_id === input.employeeId),
    list_departments: () => DEPARTMENTS.map(([id, name]) => stamp({ id, branch_id: BRANCH, name, description: null, is_active: true })),
    list_members: () => members,
    list_invitations: () => [invitation('inv-1', 'chinedu.eze@abc.example'), invitation('inv-2', 'ngozi.balogun@abc.example')],
    list_schedules: () => [
      stamp({ id: 'sch-w20', branch_id: BRANCH, name: 'Week 20', start_date: '2025-05-12', end_date: '2025-05-18', status: 'published' as const }),
      stamp({ id: 'sch-w21', branch_id: BRANCH, name: 'Week 21', start_date: '2025-05-19', end_date: '2025-05-25', status: 'draft' as const })
    ],
    list_shifts_for_schedule: () => shifts,
    list_assignments_for_schedule: () => assignments,
    list_attendance_for_branch_and_range: () => attendance,
    list_pending_leave: () => [
      leave('lv-1', 'p8', '2025-06-02', '2025-06-04', 'annual_leave', 'Family travel', 13),
      leave('lv-2', 'p16', '2025-05-28', '2025-05-28', 'unpaid_leave', 'Personal appointment', 14),
      leave('lv-3', 'p2', '2025-06-09', '2025-06-09', 'annual_leave', 'Graduation ceremony', 15)
    ],
    list_pending_shift_swap_approvals: () => [swap('sw-1', 'asg-p8', 'p8', 'p11'), swap('sw-2', 'asg-p9', 'p9', 'p10')],
    // Requests: the handoff's SWAPS and LEAVE — two swaps and three leave requests waiting, and some already decided.
    // Reports: the handoff's last 30 days (91% attendance, 6,240 hours, 11 gaps, 18 swaps) and the 30 before.
    get_operations_summary_report: (input) => operationsReport(String(input.endDate) === '2025-05-16'),
    list_branch_shift_swaps: () => branchSwaps,
    list_branch_leave: () => branchLeave,
    approve_shift_swap: (input) => decideSwap(String(input.swapId), 'approved', null),
    reject_shift_swap: (input) => decideSwap(String(input.swapId), 'rejected', (input.decisionNotes as string) ?? null),
    approve_leave_request: (input) => decideLeave(String(input.leaveRequestId), 'approved', null),
    reject_leave_request: (input) => decideLeave(String(input.leaveRequestId), 'rejected', String(input.reason ?? '')),
    create_leave_request: (input) => {
      const created = leave(`lv-${branchLeave.length + 1}`, String(input.employeeId), String(input.startDate), String(input.endDate), input.leaveType as LeaveRequest['leave_type'], String(input.reason), 16);
      branchLeave.unshift(created);
      return created;
    },
    list_announcements: () => announcements,
    list_announcement_acknowledgements: (input) => acknowledgements.filter((row) => row.announcement_id === input.announcementId),
    has_acknowledged_announcement: (input) => ({ acknowledged: acknowledgements.some((row) => row.announcement_id === input.announcementId && row.employee_id === 'p1') }),
    create_announcement: (input) => {
      const created: Announcement = {
        ...announcement(`ann-${announcements.length + 1}`, String(input.title), String(input.content), at(16, 7, 58), 'user-me', (input.branchId as string | null) ?? null, Boolean(input.isPinned)),
        is_published: false,
        published_at: null
      };
      announcements.unshift(created);
      return created;
    },
    publish_announcement: (input) => {
      const row = announcements.find((a) => a.id === input.announcementId);
      if (!row) throw new Error('Announcement not found');
      Object.assign(row, { is_published: true, published_at: at(16, 7, 58) });
      return row;
    },
    remind_announcement: (input) => {
      const row = announcements.find((a) => a.id === input.announcementId);
      const acked = new Set(acknowledgements.filter((a) => a.announcement_id === input.announcementId).map((a) => a.employee_id));
      const logins = new Set(members.map((m) => m.user_email));
      const outstanding = employees.filter((e) => e.employment_status === 'active' && (!row?.branch_id || e.branch_id === row.branch_id) && !acked.has(e.id));
      const reached = outstanding.filter((e) => e.email && logins.has(e.email)).length;
      return { reminded: reached, undelivered: outstanding.length - reached };
    },
    // Recent Activity: the handoff's two task events — one completed, one assigned, both Michael Brown's.
    list_tasks: () => [
      task('tsk-cold-room', 'Check Cold Room Temperature', { assigned_at: at(16, 6, 50), completed_at: at(16, 7, 46), completed_by: null, task_status: 'completed' }),
      task('tsk-walkthrough', 'Morning Store Walkthrough', { assigned_at: at(16, 7, 20) })
    ]
  };

  return async function callRpc<TOutput>(operation: string, _organizationId?: string, input?: unknown): Promise<TOutput> {
    await new Promise((resolve) => setTimeout(resolve, 90));
    const handler = handlers[operation];
    return structuredClone(handler ? handler((input ?? {}) as Record<string, unknown>) : []) as TOutput;
  };
}
