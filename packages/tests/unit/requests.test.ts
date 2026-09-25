import { describe, it, expect } from 'vitest';
import {
  ago,
  applyFilter,
  buildLeaveViews,
  buildSwapViews,
  countLabel,
  requestsSubtitle,
  workingDays,
  type RequestsContext
} from '../../../apps/web/src/pages/requests/requestsModel.js';
import type { LeaveRequest, ShiftSwap } from '../../../apps/web/src/types/domain.js';

const BASE = { organization_id: 'org', created_at: '2025-05-01T09:00:00Z', updated_at: '2025-05-01T09:00:00Z', deleted_at: null };
const NOW = new Date(2025, 4, 16, 8, 0);
const at = (day: number, h: number, m = 0): string => new Date(2025, 4, day, h, m).toISOString();

function person(id: string, first: string, department: string) {
  return {
    ...BASE,
    id,
    branch_id: 'br',
    employee_number: id,
    first_name: first,
    last_name: 'Test',
    email: null,
    phone: null,
    date_of_birth: null,
    hire_date: '2024-01-01',
    employment_status: 'active' as const,
    notes: null,
    avatar_url: null,
    department_id: department,
    is_active: true
  };
}

const CTX: RequestsContext = {
  employees: [person('e1', 'John', 'd-sales'), person('e2', 'Michael', 'd-ware')],
  departments: [
    { ...BASE, id: 'd-sales', branch_id: 'br', name: 'Sales Floor', description: null, is_active: true },
    { ...BASE, id: 'd-ware', branch_id: 'br', name: 'Warehouse', description: null, is_active: true }
  ],
  members: [{ ...BASE, id: 'm', user_id: 'u-sarah', role_id: 'r', joined_at: BASE.created_at, is_active: true, user_email: 's@x.test', user_first_name: 'Sarah', user_last_name: 'Johnson', role_name: 'Supervisor' }],
  now: NOW
};

function swap(id: string, status: ShiftSwap['status'], patch: Partial<ShiftSwap> = {}): ShiftSwap {
  return {
    id,
    organization_id: 'org',
    branch_id: 'br',
    shift_assignment_id: 'a1',
    requested_by_employee_id: 'e1',
    target_employee_id: 'e2',
    status,
    notes: 'Family commitment',
    responded_by_employee_id: null,
    responded_at: null,
    decision_by: null,
    decision_at: null,
    decision_notes: null,
    created_at: at(14, 8),
    updated_at: at(14, 8),
    shift_date: '2025-05-19',
    shift_start_time: '14:00:00',
    shift_end_time: '22:00:00',
    shift_title: 'Evening Shift',
    shift_department_id: 'd-sales',
    ...patch
  };
}

function leave(id: string, status: LeaveRequest['status'], start: string, end: string): LeaveRequest {
  return {
    ...BASE,
    id,
    branch_id: 'br',
    employee_id: 'e2',
    requested_by: 'u',
    approved_by: null,
    leave_type: 'sick_leave',
    status,
    start_date: start,
    end_date: end,
    total_days: 1,
    reason: 'Medical certificate attached',
    manager_notes: null,
    cancellation_reason: null,
    last_status_changed_at: BASE.created_at,
    version: 1,
    created_by: 'u',
    rejected_by: null,
    cancelled_by: null,
    approved_at: null,
    rejected_at: null,
    cancelled_at: null
  };
}

describe('Requests model (design handoff Manager/Requests)', () => {
  it('describes a swap waiting on the approver the way the handoff card does', () => {
    const [view] = buildSwapViews([swap('0148aaaa-0000-0000-0000-000000000000', 'accepted')], CTX);
    expect(view).toMatchObject({
      ref: 'SWP-2025-0148',
      status: 'Awaiting your approval',
      tone: 'warn',
      age: 'Raised 2 days ago',
      fromName: 'John Test',
      fromRole: 'Sales Floor',
      toName: 'Michael Test',
      toRole: 'Warehouse',
      shiftLine: 'Mon 19 May · Evening Shift',
      shiftMeta: '14:00 – 22:00 · Sales Floor',
      awaitingApproval: true,
      filter: 'Pending'
    });
    expect(view.steps.map((s) => s.state)).toEqual(['done', 'done', 'todo']);
  });

  it('maps every other swap state to its pill, age, steps and outcome', () => {
    const views = buildSwapViews(
      [
        swap('s-pending', 'pending', { created_at: at(16, 4) }),
        swap('s-open', 'pending', { target_employee_id: null, created_at: at(16, 7, 30) }),
        swap('s-approved', 'approved', { decision_by: 'u-sarah', decision_at: at(12, 11) }),
        swap('s-rejected', 'rejected', { decision_at: at(9, 15), decision_notes: 'Bakery cover cannot move' }),
        swap('s-declined', 'declined', { responded_at: at(13, 9) })
      ],
      CTX
    );
    const byId = Object.fromEntries(views.map((v) => [v.swap.id, v]));
    expect([byId['s-pending'].status, byId['s-pending'].age, byId['s-pending'].outcome]).toEqual(['Awaiting counterparty', 'Raised 4 hours ago', 'Waiting for Michael Test to accept']);
    expect([byId['s-open'].status, byId['s-open'].toName, byId['s-open'].toRole]).toEqual(['Open to anyone', 'Unmatched', 'Open to the branch']);
    expect([byId['s-approved'].age, byId['s-approved'].outcome]).toEqual(['Approved 12 May', 'Approved by Sarah Johnson · schedule updated']);
    expect(byId['s-rejected'].steps.map((s) => s.state)).toEqual(['done', 'done', 'failed']);
    expect(byId['s-rejected'].outcome).toBe('Declined — Bakery cover cannot move');
    expect([byId['s-declined'].status, byId['s-declined'].outcome]).toEqual(['Declined', 'Michael Test declined']);
    expect(applyFilter(views, 'Resolved').map((v) => v.swap.id).sort()).toEqual(['s-approved', 's-declined', 's-rejected']);
  });

  it('builds leave rows with working days and the handoff statuses', () => {
    const rows = buildLeaveViews([leave('l1', 'approved', '2025-05-14', '2025-05-21'), leave('l2', 'rejected', '2025-05-28', '2025-05-28'), leave('l3', 'pending', '2025-06-02', '2025-06-04')], CTX);
    expect(rows.map((r) => [r.leave.id, r.name, r.dept, r.dates, r.days, r.type, r.status])).toEqual([
      ['l3', 'Michael Test', 'Warehouse', '02 – 04 Jun', '3 working days', 'Sick leave', 'Pending'],
      ['l1', 'Michael Test', 'Warehouse', '14 – 21 May', '6 working days', 'Sick leave', 'Approved'],
      ['l2', 'Michael Test', 'Warehouse', '28 May', '1 working day', 'Sick leave', 'Declined']
    ]);
  });

  it('writes the header subtitle and counts', () => {
    const swaps = buildSwapViews([swap('a', 'accepted'), swap('b', 'pending'), swap('c', 'approved')], CTX);
    const leaveRows = buildLeaveViews([leave('l1', 'pending', '2025-06-02', '2025-06-02'), leave('l2', 'approved', '2025-05-02', '2025-05-02')], CTX);
    expect(requestsSubtitle(swaps, leaveRows)).toBe('2 swaps and 1 leave request need a decision');
    expect(requestsSubtitle([], [])).toBe('Nothing needs a decision right now');
    expect(countLabel(1, 'Time off')).toBe('1 leave request');
    expect(countLabel(2, 'Swap requests')).toBe('2 swap requests');
    expect(workingDays('2025-05-17', '2025-05-18')).toBe(0);
    expect(ago(at(16, 7, 59), NOW)).toBe('just now');
  });
});
