import type { Department, Employee, OperationsSummaryReport } from '../../types/domain.js';
import { addDays, fullName, type Tone } from '../scheduling/grid/scheduleFormat.js';
import { weekdayDayMonth } from '../dashboard/manager/overviewModel.js';

/*
 * The Reports page's pure helpers, after the design handoff's reportMetrics,
 * reportBars and REPORTS ("Manager/Reports"): the last 30 days against the 30
 * before, attendance by department, and the four downloadable reports — all
 * from get_operations_summary_report.
 */

export interface Period {
  startDate: string;
  endDate: string;
}

/** The last 30 days up to today, and the 30 days before that. */
export function periods(today: string): { current: Period; previous: Period } {
  return {
    current: { startDate: addDays(today, -29), endDate: today },
    previous: { startDate: addDays(today, -59), endDate: addDays(today, -30) }
  };
}

export interface ReportMetric {
  label: string;
  value: string;
  delta: string;
  /** Handoff `up`: green when the change is good, amber when it isn't; null when there's nothing to compare with. */
  good: boolean | null;
}

const MINUS = '−';
const signed = (n: number): string => (n > 0 ? `+${n.toLocaleString('en-US')}` : n < 0 ? `${MINUS}${Math.abs(n).toLocaleString('en-US')}` : '±0');
const rate = (attended: number, recorded: number): number | null => (recorded ? Math.round((attended / recorded) * 100) : null);
const VS = 'vs previous 30 days';

export function reportMetrics(current: OperationsSummaryReport, previous: OperationsSummaryReport | undefined): ReportMetric[] {
  const nowRate = rate(current.attendance.attended, current.attendance.recorded);
  const thenRate = previous ? rate(previous.attendance.attended, previous.attendance.recorded) : null;
  const hours = Math.round(current.scheduledMinutes / 60);
  const thenHours = previous ? Math.round(previous.scheduledMinutes / 60) : null;
  const gaps = current.unfilledShifts.length;
  const thenGaps = previous ? previous.unfilledShifts.length : null;
  const swaps = current.swapRequests;
  const thenSwaps = previous ? previous.swapRequests : null;
  const compare = (now: number, then: number | null, unit: string, higherIsGood: boolean): Pick<ReportMetric, 'delta' | 'good'> =>
    then === null ? { delta: 'Nothing to compare yet', good: null } : { delta: `${signed(now - then)}${unit} ${VS}`, good: higherIsGood ? now >= then : now <= then };
  return [
    {
      label: 'Attendance rate',
      value: nowRate === null ? '—' : `${nowRate}%`,
      ...(nowRate === null || thenRate === null ? { delta: 'Nothing to compare yet', good: null } : compare(nowRate, thenRate, ' pts', true))
    },
    { label: 'Hours scheduled', value: hours.toLocaleString('en-US'), ...compare(hours, thenHours, '', true) },
    { label: 'Coverage gaps', value: String(gaps), ...compare(gaps, thenGaps, '', false) },
    { label: 'Swap requests', value: String(swaps), ...compare(swaps, thenSwaps, '', false) }
  ];
}

export interface DepartmentBar {
  key: string;
  label: string;
  pct: number;
  value: string;
  tag: 'Healthy' | 'Watch' | 'At risk';
  tone: Extract<Tone, 'ok' | 'warn' | 'bad'>;
}

/** Handoff reportBars: ≥85% Healthy, ≥70% Watch, below that At risk — best first. */
export function departmentBars(report: OperationsSummaryReport, departments: Department[]): DepartmentBar[] {
  const names = new Map(departments.map((d) => [d.id, d.name]));
  return report.departments
    .filter((row) => row.recorded > 0)
    .map((row): DepartmentBar => {
      const pct = Math.round((row.attended / row.recorded) * 100);
      const tone = pct >= 85 ? 'ok' : pct >= 70 ? 'warn' : 'bad';
      return {
        key: row.department_id ?? 'none',
        label: (row.department_id && names.get(row.department_id)) || 'No department',
        pct,
        value: `${pct}%`,
        tag: tone === 'ok' ? 'Healthy' : tone === 'warn' ? 'Watch' : 'At risk',
        tone
      };
    })
    .sort((a, b) => b.pct - a.pct || a.label.localeCompare(b.label));
}

/** Enough to report on: some settled attendance or some published shifts in the period. */
export const hasData = (report: OperationsSummaryReport): boolean => report.attendance.recorded > 0 || report.shiftCount > 0;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dm = (date: string): string => `${date.slice(8, 10)} ${MONTHS[Number(date.slice(5, 7)) - 1]}`;

/** '17 Apr – 16 May 2025' */
export function periodLabel(period: Period): string {
  return `${dm(period.startDate)} – ${dm(period.endDate)} ${period.endDate.slice(0, 4)}`;
}

export type ReportKey = 'attendance' | 'payroll' | 'coverage' | 'activity';

export const AVAILABLE_REPORTS: Array<{ key: ReportKey; title: string; body: string; status: 'Ready' | 'New'; tone: Tone; cta: 'Download' | 'Generate' }> = [
  { key: 'attendance', title: 'Attendance summary', body: 'Present, late and absent per department.', status: 'Ready', tone: 'ok', cta: 'Download' },
  { key: 'payroll', title: 'Payroll hours export', body: 'Confirmed hours per employee for the pay period.', status: 'Ready', tone: 'ok', cta: 'Download' },
  { key: 'coverage', title: 'Coverage vs schedule', body: 'Where published shifts went unfilled.', status: 'Ready', tone: 'ok', cta: 'Download' },
  { key: 'activity', title: 'Swap & leave activity', body: 'Requests raised, approved and declined per department.', status: 'New', tone: 'info', cta: 'Generate' }
];

const hoursText = (minutes: number): string => (minutes / 60).toFixed(2);

/** One report as CSV rows, optionally narrowed to one department. */
export function reportRows(key: ReportKey, report: OperationsSummaryReport, departments: Department[], employees: Employee[], departmentId: string | null = null): string[][] {
  const names = new Map(departments.map((d) => [d.id, d.name]));
  const dept = (id: string | null): string => (id && names.get(id)) || 'No department';
  const inScope = (id: string | null): boolean => departmentId === null || id === departmentId;
  const period = `${report.startDate} to ${report.endDate}`;
  switch (key) {
    case 'attendance':
      return [
        ['Period', 'Department', 'Attended', 'Recorded', 'Attendance rate'],
        ...report.departments
          .filter((row) => inScope(row.department_id))
          .map((row) => [period, dept(row.department_id), String(row.attended), String(row.recorded), row.recorded ? `${Math.round((row.attended / row.recorded) * 100)}%` : ''])
      ];
    case 'payroll': {
      const people = new Map(employees.map((e) => [e.id, e]));
      return [
        ['Period', 'Employee number', 'Employee', 'Department', 'Shifts worked', 'Hours worked', 'Overtime hours', 'Late minutes'],
        ...report.hoursByEmployee
          .filter((row) => inScope(people.get(row.employee_id)?.department_id ?? null))
          .map((row) => {
            const person = people.get(row.employee_id);
            return [
              period,
              person?.employee_number ?? '',
              person ? fullName(person) : row.employee_id,
              dept(person?.department_id ?? null),
              String(row.shifts),
              hoursText(row.worked_minutes),
              hoursText(row.overtime_minutes),
              String(row.late_minutes)
            ];
          })
      ];
    }
    case 'coverage':
      return [
        ['Date', 'Shift', 'Time', 'Department', 'Paid hours'],
        ...report.unfilledShifts
          .filter((row) => inScope(row.department_id))
          .map((row) => [weekdayDayMonth(row.shift_date), row.title, `${row.start_time.slice(0, 5)} – ${row.end_time.slice(0, 5)}`, dept(row.department_id), hoursText(row.paid_minutes)])
      ];
    default:
      return [
        ['Period', 'Department', 'Request', 'Raised', 'Approved', 'Declined'],
        ...report.requestActivity
          .filter((row) => inScope(row.department_id))
          .map((row) => [period, dept(row.department_id), row.kind === 'swap' ? 'Shift swap' : 'Leave', String(row.raised), String(row.approved), String(row.declined)])
      ];
  }
}
