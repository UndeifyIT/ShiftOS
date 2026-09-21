/**
 * In-memory backend for the Manager overview preview (`?path=/`), seeded to
 * reproduce the design handoff's HOME.Manager morning â€” Friday May 16, 2025
 * at 07:58 (see mockClock.ts): 20 people, 17 checked in, Sales Floor / Front
 * End / Warehouse / Bakery coverage, 3 coverage gaps, 2 swaps + 3 leave
 * waiting, 2 supervisor invitations, next week still a draft, and the
 * handoff's two announcements.
 */
import type { AttendanceRecord, Employee, EmployeeImport, Invitation, LeaveRequest, Shift, ShiftAssignment, ShiftSwap, Task } from '../../src/types/domain.js';

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

/**
 * `?data=edge` serves the same screens with the shapes real databases
 * actually contain â€” a member whose user row has no email, an employee with
 * no department, phone, email or hire date, attendance with no shift joined â€”
 * so a page that only survives tidy fixtures fails here instead of in front
 * of someone.
 */
const MESSY = new URLSearchParams(window.location.search).get('data') === 'edge';

export function createOverviewBackend() {
  // Employees page preview: handoff-style phone numbers, one person on leave and two inactive (EMP_STATS 17 active Â· 1 on leave).
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

  // Employee Profile preview: John Doe's month so far â€” the handoff's HISTORY_DAYS marks with its HISTORY_ROWS times â€” and the first half of April to compare with.
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
  // Three published slots nobody is on yet â€” the week's coverage gaps.
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

  if (MESSY) {
    // p2 keeps an email, so the member lookup really runs against the null-email row below.
    const target = employees.find((e) => e.id === 'p2');
    if (target) Object.assign(target, { department_id: null, phone: null, hire_date: null, avatar_url: 'employees/org/p2/missing.png', reports_to_employee_id: 'nobody' });
    const noEmail = employees.find((e) => e.id === 'p3');
    if (noEmail) Object.assign(noEmail, { email: null, department_id: null });
    members.push(
      stamp({ id: 'mem-ghost', user_id: 'user-ghost', role_id: 'role-supervisor', joined_at: CREATED, is_active: true, user_email: null as unknown as string, user_first_name: 'Ghost', user_last_name: 'Row', role_name: 'Supervisor' })
    );
    history.push({
      ...stamp({ id: 'hist-messy' }),
      branch_id: BRANCH,
      shift_assignment_id: 'asg-missing',
      employee_id: 'p2',
      attendance_status: 'present' as const,
      clock_in_at: at(16, 9, 0),
      clock_out_at: null,
      break_minutes: 0,
      worked_minutes: 0,
      overtime_minutes: 0,
      late_minutes: 0,
      early_departure_minutes: 0,
      notes: null,
      recorded_by: 'user-me',
      updated_by: null,
      version: 1,
      shift_date: null,
      shift_start_time: null,
      shift_end_time: null,
      shift_title: null
    });
  }

  // Tasks board: the handoff's own six tasks (TASKS_BRANCH), owned by people
  // from this branch â€” a card's department is its owner's, so it reads from
  // the same employee rows the rest of the preview uses.
  const NOW = at(16, 7, 58);
  const task = (
    id: string,
    title: string,
    priority: Task['priority'],
    status: Task['task_status'],
    ownerId: string | null,
    dueTime: string | null,
    when: string | null
  ): Task => ({
    ...stamp({ id }),
    branch_id: BRANCH,
    title,
    description: null,
    due_date: '2025-05-16',
    due_time: dueTime,
    priority,
    task_status: status,
    assigned_supervisor_id: ownerId,
    assigned_by: ownerId ? 'user-me' : null,
    assigned_at: ownerId ? when ?? at(16, 7, 30) : null,
    completed_at: status === 'completed' ? when : null,
    completed_by: status === 'completed' ? ownerId : null,
    completion_notes: null,
    verified_at: null,
    verified_by: null,
    verification_notes: null,
    verification_status: 'pending',
    created_by: 'user-me',
    updated_by: null,
    version: 1
  });
  const tasks: Task[] = [
    task('t1', 'Restock beverages in aisle 4', 'normal', 'assigned', 'p16', '10:00:00', null),
    task('t2', 'Bakery preparation check', 'low', 'draft', null, '11:00:00', null),
    task('t3', 'Floor cleanliness check', 'low', 'assigned', 'p20', '14:00:00', null),
    task('t4', 'Weekly stock count', 'high', 'in_progress', 'p12', null, at(16, 9, 10)),
    task('t5', 'Check cold room temperature', 'high', 'completed', 'p12', '08:00:00', at(16, 8, 15)),
    task('t6', 'Morning store walkthrough', 'normal', 'completed', 'p1', '08:00:00', at(16, 8, 25))
  ];
  const taskOr = (id: unknown): Task => {
    const found = tasks.find((row) => row.id === id);
    if (!found) throw new Error('Task not found');
    return found;
  };

  const handlers: Record<string, (input: Record<string, unknown>) => unknown> = {
    list_employee_imports: () => imports.slice(0, 5),
    import_employees: importEmployees,
    invite_member: () => ({}),
    // Supervisors page: the org's roles (org-wide ones are Admins, the rest are supervisors) and what each role may do.
    // [id, name, org-wide?] â€” Admin is branch-scoped on purpose (048), so it can be invited.
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
    // Attendance screen: marking someone writes the record the same way the real RPC does.
    mark_attendance: (input) => {
      const assignmentId = String(input.shiftAssignmentId);
      const status = String(input.status);
      const existing = attendance.find((record) => record.shift_assignment_id === assignmentId);
      const assignment = assignments.find((row) => row.id === assignmentId);
      const arrived = status === 'present' || status === 'late';
      const record = existing ?? {
        ...stamp({ id: `att-new-${assignmentId}` }),
        branch_id: BRANCH,
        shift_assignment_id: assignmentId,
        employee_id: assignment?.employee_id ?? '',
        attendance_status: 'scheduled' as const,
        clock_in_at: null,
        clock_out_at: null,
        break_minutes: 0,
        worked_minutes: 0,
        overtime_minutes: 0,
        late_minutes: 0,
        early_departure_minutes: 0,
        notes: null,
        recorded_by: 'user-me',
        updated_by: 'user-me',
        version: 1
      };
      record.attendance_status = status as AttendanceRecord['attendance_status'];
      record.clock_in_at = arrived ? (input.at as string) ?? record.clock_in_at ?? at(16, 7, 58) : null;
      record.notes = (input.notes as string) ?? null;
      if (!existing) attendance.push(record);
      return record;
    },
    list_pending_leave: () => [
      leave('lv-1', 'p8', '2025-06-02', '2025-06-04', 'annual_leave', 'Family travel', 13),
      leave('lv-2', 'p16', '2025-05-28', '2025-05-28', 'unpaid_leave', 'Personal appointment', 14),
      leave('lv-3', 'p2', '2025-06-09', '2025-06-09', 'annual_leave', 'Graduation ceremony', 15)
    ],
    list_pending_shift_swap_approvals: () => [swap('sw-1', 'asg-p8', 'p8', 'p11'), swap('sw-2', 'asg-p9', 'p9', 'p10')],
    list_announcements: () => [
      {
        ...stamp({ id: 'ann-stocktake' }),
        branch_id: BRANCH,
        title: 'Stocktake weekend â€” we close at 6 PM Saturday',
        content: "We close early on Saturday for the monthly stocktake. Supervisors should confirm their team's finish times by Friday afternoon.",
        announcement_type: 'operational',
        visibility_type: 'branch',
        is_published: true,
        published_at: at(15, 17, 40),
        expires_at: null,
        created_by: 'user-me'
      },
      {
        ...stamp({ id: 'ann-promotion' }),
        branch_id: BRANCH,
        title: 'New promotion display goes live Friday',
        content: "Ensure all displays are updated and shelves are stocked before 10 AM. Ask Sarah if you're unsure where stock goes.",
        announcement_type: 'general',
        visibility_type: 'branch',
        is_published: true,
        published_at: at(16, 7, 30),
        expires_at: null,
        created_by: 'user-p1'
      }
    ],
    // Tasks screen: creating, assigning, completing and reopening all move the
    // same rows the board reads, exactly as the real RPCs do.
    list_tasks: () => tasks,
    create_task: (input) => {
      const row = task(
        `task-${Date.now()}`,
        String(input.title),
        (input.priority as Task['priority']) ?? 'normal',
        'draft',
        null,
        (input.dueTime as string) ?? null,
        null
      );
      row.due_date = (input.dueDate as string) ?? row.due_date;
      row.description = (input.description as string) ?? null;
      tasks.push(row);
      return row;
    },
    assign_task: (input) => {
      const row = taskOr(input.taskId);
      row.task_status = 'assigned';
      row.assigned_supervisor_id = String(input.supervisorEmployeeId);
      row.assigned_by = 'user-me';
      row.assigned_at = NOW;
      return row;
    },
    complete_task: (input) => {
      const row = taskOr(input.taskId);
      row.task_status = 'completed';
      row.completed_at = NOW;
      row.completed_by = 'user-me';
      row.completion_notes = (input.notes as string) ?? null;
      return row;
    },
    reopen_task: (input) => {
      const row = taskOr(input.taskId);
      row.task_status = 'in_progress';
      row.completed_at = null;
      row.completed_by = null;
      row.completion_notes = null;
      return row;
    }
  };

  return async function callRpc<TOutput>(operation: string, _organizationId?: string, input?: unknown): Promise<TOutput> {
    await new Promise((resolve) => setTimeout(resolve, 90));
    const handler = handlers[operation];
    return structuredClone(handler ? handler((input ?? {}) as Record<string, unknown>) : []) as TOutput;
  };
}
