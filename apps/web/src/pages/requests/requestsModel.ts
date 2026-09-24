import type { Department, Employee, LeaveRequest, Member, ShiftSwap } from '../../types/domain.js';
import { dateRange, LEAVE_TYPE_LABEL, weekdayDayMonth } from '../dashboard/manager/overviewModel.js';
import { fullName, type Tone } from '../scheduling/grid/scheduleFormat.js';

/*
 * The Requests page's pure helpers, after the design handoff's SWAPS and LEAVE
 * ("REQUESTS: SWAPS + TIME OFF"). A ShiftOS swap moves one shift from the
 * person who gives it up to the person who takes it over (or to anyone, when
 * it's open), so both sides of a card describe that one shift.
 */

export type RequestFilter = 'Pending' | 'Resolved' | 'All';
export const REQUEST_FILTERS: RequestFilter[] = ['Pending', 'Resolved', 'All'];
export type RequestTab = 'Swap requests' | 'Time off';
export const REQUEST_TABS: RequestTab[] = ['Swap requests', 'Time off'];

export interface SwapStep {
  label: string;
  state: 'done' | 'failed' | 'todo';
}

export interface SwapView {
  swap: ShiftSwap;
  ref: string;
  status: string;
  tone: Tone;
  age: string;
  fromName: string;
  fromRole: string;
  toName: string;
  toRole: string;
  shiftLine: string;
  shiftMeta: string;
  reason: string;
  steps: SwapStep[];
  /** Waiting on the approver (the handoff's "Awaiting your approval"). */
  awaitingApproval: boolean;
  outcome: string;
  filter: 'Pending' | 'Resolved';
}

export interface LeaveView {
  leave: LeaveRequest;
  name: string;
  dept: string;
  dates: string;
  days: string;
  type: string;
  reason: string;
  status: string;
  tone: Tone;
  filter: 'Pending' | 'Resolved';
}

export interface RequestsContext {
  employees: Employee[];
  departments: Department[];
  members: Member[];
  now: Date;
  /** The viewer's own employee record — their side of a swap reads "you" in outcomes. */
  meId?: string | null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dd = (at: Date): string => `${String(at.getDate()).padStart(2, '0')} ${MONTHS[at.getMonth()]}`;
const hm = (time: string | null | undefined): string => (time ? time.slice(0, 5) : '');

/** 'just now' / '4 hours ago' / '2 days ago' */
export function ago(iso: string, now: Date): string {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return minutes <= 1 ? 'just now' : `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}

/** Handoff SWP-2025-0148 — the year it was raised and the start of its id. */
export function swapRef(swap: ShiftSwap): string {
  return `SWP-${new Date(swap.created_at).getFullYear()}-${swap.id.replace(/-/g, '').slice(0, 4).toUpperCase()}`;
}

/** Monday–Friday days in an inclusive 'YYYY-MM-DD' range — the handoff's "6 working days". */
export function workingDays(start: string, end: string): number {
  const [y1, m1, d1] = start.split('-').map(Number);
  const [y2, m2, d2] = end.split('-').map(Number);
  const from = Date.UTC(y1, m1 - 1, d1);
  const to = Date.UTC(y2, m2 - 1, d2);
  let count = 0;
  for (let t = from; t <= to; t += 86_400_000) {
    const day = new Date(t).getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

const STEP_LABELS = ['Requested', 'Counterparty accepted', 'Supervisor approved'];

function steps(done: number, failedAt: number | null): SwapStep[] {
  return STEP_LABELS.map((label, index) => ({ label, state: index === failedAt ? 'failed' : index < done ? 'done' : 'todo' }));
}

export function buildSwapViews(swaps: ShiftSwap[], ctx: RequestsContext): SwapView[] {
  const employees = new Map(ctx.employees.map((e) => [e.id, e]));
  const departments = new Map(ctx.departments.map((d) => [d.id, d.name]));
  const members = new Map(ctx.members.map((m) => [m.user_id, `${m.user_first_name} ${m.user_last_name}`.trim()]));
  const deptOf = (employee: Employee | undefined): string =>
    (employee?.department_id && departments.get(employee.department_id)) || 'No department';
  const nameOf = (id: string | null): string => {
    if (!id) return 'Unmatched';
    if (ctx.meId && id === ctx.meId) return 'You';
    const employee = employees.get(id);
    return employee ? fullName(employee) : 'Former employee';
  };

  const unique = [...new Map(swaps.map((s) => [s.id, s])).values()];
  return unique
    .map((swap): SwapView => {
      const from = employees.get(swap.requested_by_employee_id);
      const to = swap.target_employee_id ? employees.get(swap.target_employee_id) : undefined;
      const fromName = nameOf(swap.requested_by_employee_id);
      const toName = nameOf(swap.target_employee_id);
      const decider = swap.decision_by ? members.get(swap.decision_by) : undefined;
      const decidedOn = dd(new Date(swap.decision_at ?? swap.updated_at));
      const shiftDept = (swap.shift_department_id && departments.get(swap.shift_department_id)) || deptOf(from);
      const base = {
        swap,
        ref: swapRef(swap),
        fromName,
        fromRole: deptOf(from),
        toName,
        toRole: swap.target_employee_id ? deptOf(to) : 'Open to the branch',
        shiftLine: swap.shift_date ? `${weekdayDayMonth(swap.shift_date)} · ${swap.shift_title || 'Shift'}` : 'Shift no longer scheduled',
        shiftMeta: swap.shift_start_time ? `${hm(swap.shift_start_time)} – ${hm(swap.shift_end_time)} · ${shiftDept}` : shiftDept,
        reason: swap.notes?.trim() || 'No reason given'
      };
      switch (swap.status) {
        case 'accepted':
          return {
            ...base,
            status: 'Awaiting your approval',
            tone: 'warn',
            age: `Raised ${ago(swap.created_at, ctx.now)}`,
            steps: steps(2, null),
            awaitingApproval: true,
            outcome: '',
            filter: 'Pending'
          };
        case 'pending':
          return {
            ...base,
            status: swap.target_employee_id ? 'Awaiting counterparty' : 'Open to anyone',
            tone: 'info',
            age: `Raised ${ago(swap.created_at, ctx.now)}`,
            steps: steps(1, null),
            awaitingApproval: false,
            outcome: swap.target_employee_id ? `Waiting for ${toName} to accept` : 'Waiting for someone to take it',
            filter: 'Pending'
          };
        case 'approved':
          return {
            ...base,
            status: 'Approved',
            tone: 'ok',
            age: `Approved ${decidedOn}`,
            steps: steps(3, null),
            awaitingApproval: false,
            outcome: `Approved${decider ? ` by ${decider}` : ''} · schedule updated`,
            filter: 'Resolved'
          };
        case 'rejected':
          return {
            ...base,
            status: 'Declined',
            tone: 'bad',
            age: `Declined ${decidedOn}`,
            steps: steps(2, 2),
            awaitingApproval: false,
            outcome: swap.decision_notes?.trim() ? `Declined — ${swap.decision_notes.trim()}` : `Declined${decider ? ` by ${decider}` : ''}`,
            filter: 'Resolved'
          };
        case 'declined':
          return {
            ...base,
            status: 'Declined',
            tone: 'bad',
            age: `Declined ${dd(new Date(swap.responded_at ?? swap.updated_at))}`,
            steps: steps(1, 1),
            awaitingApproval: false,
            outcome: `${toName} declined`,
            filter: 'Resolved'
          };
        default:
          return {
            ...base,
            status: 'Cancelled',
            tone: 'neutral',
            age: `Cancelled ${dd(new Date(swap.updated_at))}`,
            steps: steps(1, null),
            awaitingApproval: false,
            outcome: `Withdrawn by ${fromName}`,
            filter: 'Resolved'
          };
      }
    })
    .sort((a, b) => Number(b.awaitingApproval) - Number(a.awaitingApproval) || b.swap.created_at.localeCompare(a.swap.created_at));
}

const LEAVE_STATUS: Record<LeaveRequest['status'], { label: string; tone: Tone }> = {
  pending: { label: 'Pending', tone: 'warn' },
  approved: { label: 'Approved', tone: 'ok' },
  rejected: { label: 'Declined', tone: 'bad' },
  cancelled: { label: 'Cancelled', tone: 'neutral' }
};

export function buildLeaveViews(leave: LeaveRequest[], ctx: RequestsContext): LeaveView[] {
  const employees = new Map(ctx.employees.map((e) => [e.id, e]));
  const departments = new Map(ctx.departments.map((d) => [d.id, d.name]));
  const unique = [...new Map(leave.filter((l) => !l.deleted_at).map((l) => [l.id, l])).values()];
  return unique
    .map((request): LeaveView => {
      const employee = employees.get(request.employee_id);
      const days = workingDays(request.start_date, request.end_date);
      const status = LEAVE_STATUS[request.status] ?? LEAVE_STATUS.pending;
      return {
        leave: request,
        name: ctx.meId && request.employee_id === ctx.meId ? 'You' : employee ? fullName(employee) : 'Former employee',
        dept: (employee?.department_id && departments.get(employee.department_id)) || 'No department',
        dates: dateRange(request.start_date, request.end_date),
        days: `${days} working ${days === 1 ? 'day' : 'days'}`,
        type: LEAVE_TYPE_LABEL[request.leave_type] ?? request.leave_type,
        reason: request.reason,
        status: status.label,
        tone: status.tone,
        filter: request.status === 'pending' ? 'Pending' : 'Resolved'
      };
    })
    .sort((a, b) => Number(b.filter === 'Pending') - Number(a.filter === 'Pending') || b.leave.created_at.localeCompare(a.leave.created_at));
}

export function applyFilter<T extends { filter: 'Pending' | 'Resolved' }>(rows: T[], filter: RequestFilter): T[] {
  return filter === 'All' ? rows : rows.filter((row) => row.filter === filter);
}

/** '2 swaps and 3 leave requests need a decision' */
export function requestsSubtitle(swaps: SwapView[], leave: LeaveView[]): string {
  const s = swaps.filter((v) => v.filter === 'Pending').length;
  const l = leave.filter((v) => v.filter === 'Pending').length;
  if (!s && !l) return 'Nothing needs a decision right now';
  const parts = [s ? `${s} ${s === 1 ? 'swap' : 'swaps'}` : null, l ? `${l} leave ${l === 1 ? 'request' : 'requests'}` : null].filter(Boolean);
  return `${parts.join(' and ')} ${s + l === 1 ? 'needs' : 'need'} a decision`;
}

export const countLabel = (n: number, tab: RequestTab): string =>
  tab === 'Swap requests' ? `${n} swap ${n === 1 ? 'request' : 'requests'}` : `${n} leave ${n === 1 ? 'request' : 'requests'}`;
