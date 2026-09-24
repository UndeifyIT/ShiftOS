import { describe, it, expect } from 'vitest';
import { departmentBars, hasData, periodLabel, periods, reportMetrics, reportRows } from '../../../apps/web/src/pages/reports/reportsModel.js';
import type { OperationsSummaryReport } from '../../../apps/web/src/types/domain.js';

const BASE = { organization_id: 'org', created_at: '2025-05-01T09:00:00Z', updated_at: '2025-05-01T09:00:00Z', deleted_at: null };
const DEPARTMENTS = [
  { ...BASE, id: 'd-sales', branch_id: 'br', name: 'Sales Floor', description: null, is_active: true },
  { ...BASE, id: 'd-ware', branch_id: 'br', name: 'Warehouse', description: null, is_active: true },
  { ...BASE, id: 'd-front', branch_id: 'br', name: 'Front End', description: null, is_active: true }
];

function report(patch: Partial<OperationsSummaryReport> = {}): OperationsSummaryReport {
  return {
    startDate: '2025-04-17',
    endDate: '2025-05-16',
    attendance: { attended: 91, recorded: 100 },
    departments: [
      { department_id: 'd-ware', attended: 60, recorded: 100 },
      { department_id: 'd-sales', attended: 95, recorded: 100 },
      { department_id: 'd-front', attended: 78, recorded: 100 },
      { department_id: null, attended: 0, recorded: 0 }
    ],
    scheduledMinutes: 6240 * 60,
    shiftCount: 40,
    unfilledShifts: [{ shift_id: 's', shift_date: '2025-05-17', start_time: '14:30:00', end_time: '22:30:00', title: 'Evening', department_id: 'd-front', paid_minutes: 420, assigned: 0 }],
    swapRequests: 18,
    hoursByEmployee: [{ employee_id: 'e1', shifts: 2, worked_minutes: 930, overtime_minutes: 30, late_minutes: 5 }],
    requestActivity: [{ department_id: 'd-sales', kind: 'leave', raised: 3, approved: 2, declined: 1 }],
    ...patch
  };
}

describe('Reports model (design handoff Manager/Reports)', () => {
  it('compares the last 30 days with the 30 before, green when the change is good', () => {
    const previous = report({ attendance: { attended: 88, recorded: 100 }, scheduledMinutes: 6060 * 60, unfilledShifts: [], swapRequests: 12 });
    expect(reportMetrics(report(), previous).map((m) => [m.label, m.value, m.delta, m.good])).toEqual([
      ['Attendance rate', '91%', '+3 pts vs previous 30 days', true],
      ['Hours scheduled', '6,240', '+180 vs previous 30 days', true],
      ['Coverage gaps', '1', '+1 vs previous 30 days', false],
      ['Swap requests', '18', '+6 vs previous 30 days', false]
    ]);
    expect(reportMetrics(report(), undefined)[0]).toMatchObject({ delta: 'Nothing to compare yet', good: null });
  });

  it('ranks departments best first with the handoff thresholds, skipping ones with nothing recorded', () => {
    expect(departmentBars(report(), DEPARTMENTS).map((b) => [b.label, b.value, b.tag, b.tone])).toEqual([
      ['Sales Floor', '95%', 'Healthy', 'ok'],
      ['Front End', '78%', 'Watch', 'warn'],
      ['Warehouse', '60%', 'At risk', 'bad']
    ]);
  });

  it('works out the periods and whether there is anything to report', () => {
    expect(periods('2025-05-16')).toEqual({ current: { startDate: '2025-04-17', endDate: '2025-05-16' }, previous: { startDate: '2025-03-18', endDate: '2025-04-16' } });
    expect(periodLabel({ startDate: '2025-04-17', endDate: '2025-05-16' })).toBe('17 Apr – 16 May 2025');
    expect(hasData(report())).toBe(true);
    expect(hasData(report({ attendance: { attended: 0, recorded: 0 }, shiftCount: 0 }))).toBe(false);
  });

  it('writes each download, narrowed to one department when asked', () => {
    const employees = [{ ...BASE, id: 'e1', branch_id: 'br', employee_number: 'EMP-001', first_name: 'John', last_name: 'Doe', email: null, phone: null, date_of_birth: null, hire_date: '2024-01-01', employment_status: 'active' as const, notes: null, avatar_url: null, department_id: 'd-sales', is_active: true }];
    expect(reportRows('attendance', report(), DEPARTMENTS, employees, 'd-sales')).toEqual([
      ['Period', 'Department', 'Attended', 'Recorded', 'Attendance rate'],
      ['2025-04-17 to 2025-05-16', 'Sales Floor', '95', '100', '95%']
    ]);
    expect(reportRows('payroll', report(), DEPARTMENTS, employees)[1]).toEqual(['2025-04-17 to 2025-05-16', 'EMP-001', 'John Doe', 'Sales Floor', '2', '15.50', '0.50', '5']);
    expect(reportRows('coverage', report(), DEPARTMENTS, employees)[1]).toEqual(['Sat 17 May', 'Evening', '14:30 – 22:30', 'Front End', '7.00']);
    expect(reportRows('activity', report(), DEPARTMENTS, employees)[1]).toEqual(['2025-04-17 to 2025-05-16', 'Sales Floor', 'Leave', '3', '2', '1']);
  });
});
