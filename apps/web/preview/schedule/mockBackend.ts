/**
 * In-memory stand-in for the RPC backend, used only by the schedule preview
 * (apps/web/preview/schedule). Seeded with the design handoff's own demo week
 * (`ShiftOS Dashboards.dc.html` SCHED_ROSTER / SCHED_POOL / seedSupervisor) so
 * the real page can be compared against the handoff screen for screen.
 * Mutations work, so the grid can be clicked through — nothing is persisted.
 */
import { detectScheduleConflicts } from '../../../../packages/services/src/scheduling/scheduleConflictRules.js';
import type {
  Branch,
  Department,
  Employee,
  Schedule,
  ScheduleDayOff,
  ScheduleRosterEntry,
  ScheduleVersion,
  Shift,
  ShiftAssignment,
  ShiftTemplate
} from '../../src/types/domain.js';

const ORG = 'org-abc-supermarket';
const BRANCH = 'br-main';
// Local time on purpose, so the preview reads "May 9, 07:12 AM" in any timezone, like the handoff.
const NOW = '2025-05-09T07:12:00';

export type PreviewRole = 'manager' | 'supervisor';
export interface PreviewOptions {
  role: PreviewRole;
  status: 'published' | 'draft';
}

const DEPARTMENTS: Array<[string, string]> = [
  ['dep-store', 'Store'],
  ['dep-sales', 'Sales Floor'],
  ['dep-warehouse', 'Warehouse'],
  ['dep-frontend', 'Front End'],
  ['dep-bakery', 'Bakery'],
  ['dep-facilities', 'Facilities'],
  ['dep-fresh', 'Fresh Food']
];

// [id, first, last, departmentId, handoff pattern for week 20 — A/B/C presets, O = day off]
const PEOPLE: Array<[string, string, string, string, string | null]> = [
  ['e1', 'Christian', 'Chikwelu', 'dep-store', 'AAAAAAA'],
  ['e2', 'Sado', 'Courage Joel', 'dep-sales', 'ACOCACC'],
  ['e3', 'Wilson', 'Ijeoma', 'dep-warehouse', 'ACOCACC'],
  ['e4', 'Chidimma', '', 'dep-warehouse', 'CAOBAAA'],
  ['e5', 'Victoria', 'Odibenua', 'dep-frontend', 'ACABACA'],
  ['e6', 'Michael', 'Chiamaka', 'dep-frontend', 'CAOCCBA'],
  ['e7', 'Osaro', 'Miracle', 'dep-frontend', 'OBACBCA'],
  ['e8', 'Anaso', 'Jennifer', 'dep-frontend', 'CCOACAO'],
  ['e9', 'Grace', 'Williams', 'dep-frontend', null],
  ['e10', 'Michael', 'Brown', 'dep-warehouse', null],
  ['e11', 'James', 'Carter', 'dep-bakery', null],
  ['e12', 'Amaka', 'Nwosu', 'dep-sales', null],
  ['e13', 'Tunde', 'Adeyemi', 'dep-sales', null],
  ['e14', 'David', 'Wilson', 'dep-facilities', null],
  ['e15', 'Ngozi', 'Balogun', 'dep-fresh', null],
  ['e16', 'Emeka', 'Obi', 'dep-sales', null],
  ['e17', 'Funke', 'Adebayo', 'dep-frontend', null],
  ['e18', 'Kelechi', 'Eze', 'dep-warehouse', null],
  ['e19', 'Halima', 'Musa', 'dep-bakery', null],
  ['e20', 'Ifeanyi', 'Nnamdi', 'dep-fresh', null],
  ['e21', 'Bola', 'Akinwale', 'dep-facilities', null],
  ['e22', 'Chioma', 'Okafor', 'dep-sales', null],
  ['e23', 'Yusuf', 'Bello', 'dep-store', null]
];

const PRESETS: Record<string, { name: string; start: string; end: string }> = {
  A: { name: 'Morning', start: '07:30', end: '17:00' },
  B: { name: 'Mid', start: '11:30', end: '22:30' },
  C: { name: 'Close', start: '14:30', end: '22:30' }
};

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const value = new Date(Date.UTC(y, m - 1, d));
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

let counter = 0;
const nextId = (prefix: string): string => `${prefix}-${(counter += 1)}`;

interface Store {
  schedules: Schedule[];
  versions: ScheduleVersion[];
  roster: ScheduleRosterEntry[];
  shifts: Shift[];
  assignments: ShiftAssignment[];
  dayOffs: ScheduleDayOff[];
  templates: ShiftTemplate[];
}

function stamp<T>(row: T): T & { organization_id: string; created_at: string; updated_at: string; deleted_at: null } {
  return { ...row, organization_id: ORG, created_at: NOW, updated_at: NOW, deleted_at: null };
}

function makeSchedule(id: string, startDate: string, status: Schedule['status']): Schedule {
  const week = id.replace('sch-w', '');
  return stamp({ id, branch_id: BRANCH, name: `Week ${week}`, start_date: startDate, end_date: addDays(startDate, 6), status });
}

function seed(options: PreviewOptions): Store {
  const store: Store = { schedules: [], versions: [], roster: [], shifts: [], assignments: [], dayOffs: [], templates: [] };
  store.templates = Object.entries(PRESETS).map(([key, preset]) =>
    stamp({
      id: `tpl-${key}`,
      branch_id: BRANCH,
      name: preset.name,
      start_time: `${preset.start}:00`,
      end_time: `${preset.end}:00`,
      duration: '00:00:00',
      crosses_midnight: false,
      notes: null,
      status: 'active' as const
    })
  );

  const weeks: Array<[string, string, Schedule['status']]> = [
    ['sch-w19', '2025-05-05', 'published'],
    ['sch-w20', '2025-05-12', options.status]
  ];
  for (const [scheduleId, startDate, status] of weeks) {
    store.schedules.push(makeSchedule(scheduleId, startDate, status));
    if (status === 'published') {
      store.versions.push({ id: nextId('ver'), schedule_id: scheduleId, version: 1, changes_summary: null, published_at: NOW, published_by: 'user-sarah', created_at: NOW });
    }
    for (const [employeeId, , , , pattern] of PEOPLE) {
      if (!pattern) continue;
      store.roster.push(stamp({ id: nextId('ros'), schedule_id: scheduleId, employee_id: employeeId, added_by: 'user-sarah', added_at: NOW }));
      pattern.split('').forEach((code, dayIndex) => {
        const date = addDays(startDate, dayIndex);
        if (code === 'O') {
          store.dayOffs.push(stamp({ id: nextId('off'), schedule_id: scheduleId, employee_id: employeeId, off_date: date, created_by: 'user-sarah' }));
          return;
        }
        const departmentId = PEOPLE.find(([id]) => id === employeeId)?.[3] ?? null;
        addShift(store, employeeId, date, { templateId: `tpl-${code}`, startTime: PRESETS[code].start, endTime: PRESETS[code].end, breakMinutes: 60, notes: null, departmentId });
      });
    }
  }

  // seedSupervisor()'s two deliberate conflicts: Osaro's Tuesday runs 11h with no break, Michael's Friday gets an overlapping extra block.
  const osaroTuesday = cardsOn(store, 'e7', '2025-05-13');
  for (const card of osaroTuesday) removeAssignment(store, card.assignment.id);
  addShift(store, 'e7', '2025-05-13', { templateId: null, startTime: '11:30', endTime: '22:30', breakMinutes: 0, notes: 'Covering the till alone' });
  addShift(store, 'e6', '2025-05-16', { templateId: null, startTime: '20:00', endTime: '23:00', breakMinutes: 0, notes: 'Stock count support' });
  return store;
}

interface ShiftInput {
  templateId: string | null;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  notes: string | null;
  departmentId?: string | null;
}

function addShift(store: Store, employeeId: string, date: string, input: ShiftInput): { shift: Shift; assignment: ShiftAssignment } {
  const start = input.startTime.slice(0, 5);
  const end = input.endTime.slice(0, 5);
  const shift: Shift = stamp({
    id: nextId('shf'),
    branch_id: BRANCH,
    template_id: input.templateId,
    department_id: input.departmentId ?? null,
    title: 'Shift',
    description: null,
    shift_date: date,
    start_time: `${start}:00`,
    end_time: `${end}:00`,
    crosses_midnight: end <= start,
    break_minutes: input.breakMinutes,
    status: 'scheduled' as const,
    published_at: null,
    is_active: true
  });
  const assignment: ShiftAssignment = stamp({
    id: nextId('asg'),
    shift_id: shift.id,
    employee_id: employeeId,
    assignment_status: 'assigned' as const,
    assigned_at: NOW,
    confirmed_at: null,
    declined_at: null,
    cancelled_at: null,
    assigned_by: 'user-sarah',
    notes: input.notes
  });
  store.shifts.push(shift);
  store.assignments.push(assignment);
  store.dayOffs = store.dayOffs.filter((off) => !(off.employee_id === employeeId && off.off_date === date));
  return { shift, assignment };
}

function cardsOn(store: Store, employeeId: string, date: string): Array<{ shift: Shift; assignment: ShiftAssignment }> {
  return store.assignments
    .filter((a) => a.employee_id === employeeId && a.assignment_status === 'assigned')
    .map((assignment) => ({ assignment, shift: store.shifts.find((s) => s.id === assignment.shift_id)! }))
    .filter((card) => card.shift.shift_date === date);
}

function removeAssignment(store: Store, assignmentId: string): void {
  const assignment = store.assignments.find((a) => a.id === assignmentId);
  if (!assignment) throw new Error('Shift assignment not found');
  assignment.assignment_status = 'cancelled';
}

function scheduleOf(store: Store, scheduleId: string): Schedule {
  const schedule = store.schedules.find((s) => s.id === scheduleId);
  if (!schedule) throw new Error('Schedule not found');
  return schedule;
}

function shiftsIn(store: Store, schedule: Schedule): Shift[] {
  return store.shifts.filter((s) => s.shift_date >= schedule.start_date && s.shift_date <= schedule.end_date);
}

function activeAssignmentsIn(store: Store, schedule: Schedule): ShiftAssignment[] {
  const ids = new Set(shiftsIn(store, schedule).map((s) => s.id));
  return store.assignments.filter((a) => ids.has(a.shift_id) && a.assignment_status === 'assigned');
}

type Input = Record<string, unknown>;

export function createMockBackend(options: PreviewOptions) {
  const store = seed(options);

  const employees: Employee[] = PEOPLE.map(([id, first, last, departmentId]) =>
    stamp({
      id,
      branch_id: BRANCH,
      employee_number: `EMP-${id.slice(1).padStart(3, '0')}`,
      first_name: first,
      last_name: last,
      email: null,
      phone: null,
      date_of_birth: null,
      hire_date: '2024-01-15',
      employment_status: 'active' as Employee['employment_status'],
      notes: null,
      avatar_url: null,
      department_id: departmentId,
      is_active: true
    })
  );
  const departments: Department[] = DEPARTMENTS.map(([id, name]) => stamp({ id, branch_id: BRANCH, name, description: null, is_active: true }));
  const branches: Branch[] = [stamp({ id: BRANCH, name: 'Main Branch' }) as unknown as Branch];

  const handlers: Record<string, (input: Input) => unknown> = {
    list_branches: () => branches,
    list_departments: () => departments,
    create_department: (input) => {
      const row = stamp({ id: nextId('dep'), branch_id: String(input.branchId), name: String(input.name), description: null, is_active: true });
      departments.push(row);
      return row;
    },
    list_employees: () => employees,
    list_notifications: () => [],
    list_members: () => [
      stamp({ id: 'mem-sarah', user_id: 'user-sarah', role_id: 'role-supervisor', joined_at: NOW, is_active: true, user_email: 'sarah@example.com', user_first_name: 'Sarah', user_last_name: 'Johnson', role_name: 'Supervisor' }),
      stamp({ id: 'mem-me', user_id: 'user-me', role_id: 'role-owner', joined_at: NOW, is_active: true, user_email: 'daniel@example.com', user_first_name: 'Daniel', user_last_name: 'Okonkwo', role_name: 'Owner' })
    ],
    list_schedules: () => store.schedules.filter((s) => !s.deleted_at),
    get_schedule: (input) => scheduleOf(store, String(input.scheduleId)),
    create_schedule: (input) => {
      const startDate = String(input.startDate);
      const created = stamp({
        id: nextId('sch'),
        branch_id: String(input.branchId),
        name: String(input.name),
        start_date: startDate,
        end_date: String(input.endDate),
        status: 'draft' as const
      });
      store.schedules.push(created);
      return created;
    },
    publish_schedule: (input) => {
      const schedule = scheduleOf(store, String(input.scheduleId));
      schedule.status = 'published';
      store.versions.push({
        id: nextId('ver'),
        schedule_id: schedule.id,
        version: store.versions.filter((v) => v.schedule_id === schedule.id).length + 1,
        changes_summary: (input.changesSummary as string | undefined) ?? null,
        published_at: new Date().toISOString(),
        published_by: 'user-me',
        created_at: new Date().toISOString()
      });
      return schedule;
    },
    unpublish_schedule: (input) => {
      const schedule = scheduleOf(store, String(input.scheduleId));
      schedule.status = 'draft';
      return schedule;
    },
    list_schedule_versions: (input) => store.versions.filter((v) => v.schedule_id === input.scheduleId).sort((a, b) => b.version - a.version),
    list_schedule_roster: (input) => store.roster.filter((r) => r.schedule_id === input.scheduleId && !r.deleted_at),
    add_employee_to_schedule: (input) => {
      const row = stamp({ id: nextId('ros'), schedule_id: String(input.scheduleId), employee_id: String(input.employeeId), added_by: 'user-me', added_at: NOW });
      store.roster.push(row);
      return row;
    },
    remove_employee_from_schedule: (input) => {
      const schedule = scheduleOf(store, String(input.scheduleId));
      store.roster = store.roster.filter((r) => !(r.schedule_id === schedule.id && r.employee_id === input.employeeId));
      for (const a of activeAssignmentsIn(store, schedule)) if (a.employee_id === input.employeeId) a.assignment_status = 'cancelled';
      store.dayOffs = store.dayOffs.filter((off) => !(off.schedule_id === schedule.id && off.employee_id === input.employeeId));
      return null;
    },
    list_shifts_for_schedule: (input) => shiftsIn(store, scheduleOf(store, String(input.scheduleId))),
    list_assignments_for_schedule: (input) => activeAssignmentsIn(store, scheduleOf(store, String(input.scheduleId))),
    list_schedule_day_offs: (input) => store.dayOffs.filter((off) => off.schedule_id === input.scheduleId),
    mark_day_off: (input) => {
      const schedule = scheduleOf(store, String(input.scheduleId));
      const employeeId = String(input.employeeId);
      const date = String(input.date);
      for (const card of cardsOn(store, employeeId, date)) removeAssignment(store, card.assignment.id);
      const existing = store.dayOffs.find((off) => off.schedule_id === schedule.id && off.employee_id === employeeId && off.off_date === date);
      if (existing) return existing;
      const row = stamp({ id: nextId('off'), schedule_id: schedule.id, employee_id: employeeId, off_date: date, created_by: 'user-me' });
      store.dayOffs.push(row);
      return row;
    },
    clear_day_off: (input) => {
      store.dayOffs = store.dayOffs.filter((off) => !(off.schedule_id === input.scheduleId && off.employee_id === input.employeeId && off.off_date === input.date));
      return null;
    },
    get_schedule_conflicts: (input) => {
      const schedule = scheduleOf(store, String(input.scheduleId));
      const shiftsById = new Map(shiftsIn(store, schedule).map((s) => [s.id, s]));
      return detectScheduleConflicts(
        activeAssignmentsIn(store, schedule).map((a) => {
          const shift = shiftsById.get(a.shift_id)!;
          return { employeeId: a.employee_id, date: shift.shift_date, startTime: shift.start_time, endTime: shift.end_time, breakMinutes: shift.break_minutes };
        })
      );
    },
    list_shift_templates: () => store.templates,
    create_shift_template: (input) => {
      const row = stamp({
        id: nextId('tpl'),
        branch_id: BRANCH,
        name: String(input.name),
        start_time: `${String(input.startTime).slice(0, 5)}:00`,
        end_time: `${String(input.endTime).slice(0, 5)}:00`,
        duration: '00:00:00',
        crosses_midnight: Boolean(input.crossesMidnight),
        notes: null,
        status: 'active' as const
      });
      store.templates.push(row);
      return row;
    },
    assign_shift_to_employee_on_date: (input) => {
      const employeeId = String(input.employeeId);
      const date = String(input.date);
      for (const card of cardsOn(store, employeeId, date)) removeAssignment(store, card.assignment.id);
      return addShift(store, employeeId, date, toShiftInput(input));
    },
    add_shift_to_employee_on_date: (input) => addShift(store, String(input.employeeId), String(input.date), toShiftInput(input)),
    update_assigned_shift_on_date: (input) => {
      const assignment = store.assignments.find((a) => a.id === input.assignmentId);
      if (!assignment) throw new Error('Shift assignment not found');
      const shift = store.shifts.find((s) => s.id === assignment.shift_id)!;
      if (input.startTime) shift.start_time = `${String(input.startTime).slice(0, 5)}:00`;
      if (input.endTime) shift.end_time = `${String(input.endTime).slice(0, 5)}:00`;
      shift.crosses_midnight = shift.end_time <= shift.start_time;
      if (typeof input.breakMinutes === 'number') shift.break_minutes = input.breakMinutes;
      if (input.departmentId !== undefined) shift.department_id = (input.departmentId as string | null) ?? null;
      if (input.notes !== undefined) assignment.notes = (input.notes as string | null) ?? null;
      return { shift, assignment };
    },
    remove_assigned_shift_on_date: (input) => {
      removeAssignment(store, String(input.assignmentId));
      return null;
    },
    duplicate_schedule_shifts: (input) => {
      const source = scheduleOf(store, String(input.sourceScheduleId));
      const target = scheduleOf(store, String(input.targetScheduleId));
      const offset = Math.round((Date.parse(target.start_date) - Date.parse(source.start_date)) / 86400000);
      for (const row of store.roster.filter((r) => r.schedule_id === source.id)) {
        store.roster.push(stamp({ id: nextId('ros'), schedule_id: target.id, employee_id: row.employee_id, added_by: 'user-me', added_at: NOW }));
      }
      const shiftsById = new Map(shiftsIn(store, source).map((s) => [s.id, s]));
      let copiedCount = 0;
      for (const a of activeAssignmentsIn(store, source)) {
        const shift = shiftsById.get(a.shift_id)!;
        addShift(store, a.employee_id, addDays(shift.shift_date, offset), {
          templateId: shift.template_id,
          departmentId: shift.department_id ?? null,
          startTime: shift.start_time,
          endTime: shift.end_time,
          breakMinutes: shift.break_minutes,
          notes: null
        });
        copiedCount += 1;
      }
      for (const off of store.dayOffs.filter((d) => d.schedule_id === source.id)) {
        store.dayOffs.push(stamp({ id: nextId('off'), schedule_id: target.id, employee_id: off.employee_id, off_date: addDays(off.off_date, offset), created_by: 'user-me' }));
      }
      return { copiedCount };
    }
  };

  return async function callRpc<TOutput>(operation: string, _organizationId: string, input?: unknown): Promise<TOutput> {
    await new Promise((resolve) => setTimeout(resolve, 90));
    const handler = handlers[operation];
    if (!handler) {
      console.warn(`[schedule preview] no mock for "${operation}" — returning an empty list`);
      return [] as TOutput;
    }
    return structuredClone(handler((input ?? {}) as Input)) as TOutput;
  };
}

function toShiftInput(input: Input): ShiftInput {
  return {
    templateId: (input.templateId as string | null | undefined) ?? null,
    startTime: String(input.startTime),
    endTime: String(input.endTime),
    breakMinutes: typeof input.breakMinutes === 'number' ? input.breakMinutes : 0,
    notes: (input.notes as string | null | undefined) ?? null,
    departmentId: (input.departmentId as string | null | undefined) ?? null
  };
}

export const PREVIEW_ORGANIZATION_ID = ORG;
export const PREVIEW_BRANCH_ID = BRANCH;
