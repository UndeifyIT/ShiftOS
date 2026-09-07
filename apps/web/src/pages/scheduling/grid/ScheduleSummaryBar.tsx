import React from 'react';
import { Button, StatCard } from '@shiftos/ui';
import { Users, CalendarCheck, UserX, AlertTriangle, PieChart } from 'lucide-react';
import type { Employee, Shift, ShiftAssignment } from '../../../types/domain.js';
import { computeHoursSummary } from './hours.js';

export interface ScheduleSummaryBarProps {
  totalEmployees: number;
  rosterCount: number;
  scheduledCount: number;
  conflictCount: number;
  open: boolean;
  onToggle: () => void;
  shifts: Shift[];
  assignments: ShiftAssignment[];
  employeesById: Map<string, Employee>;
  rosterEmployeeIds: string[];
}

/**
 * Stats footer + expandable hours breakdown (design handoff line ~690-736).
 * Coverage here is (scheduled ÷ roster) — there is no "required staffing
 * level" concept in this schema, so it will not numerically match the
 * mock's illustrative 100% (spec §7.2).
 */
export function ScheduleSummaryBar({
  totalEmployees,
  rosterCount,
  scheduledCount,
  conflictCount,
  open,
  onToggle,
  shifts,
  assignments,
  employeesById,
  rosterEmployeeIds
}: ScheduleSummaryBarProps): React.ReactElement {
  const coverage = rosterCount === 0 ? 0 : Math.round((scheduledCount / rosterCount) * 100);
  const summaryRows = computeHoursSummary(shifts, assignments, rosterEmployeeIds).map((row) => ({
    ...row,
    employee: employeesById.get(row.employeeId)
  }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-3.5">
        <StatCard label="Total Employees" value={totalEmployees} icon={Users} className="min-w-[130px] flex-1 border-0 p-0 shadow-none" />
        <StatCard label="Scheduled" value={scheduledCount} icon={CalendarCheck} tone="brand" className="min-w-[130px] flex-1 border-0 p-0 shadow-none" />
        <StatCard
          label="Unscheduled"
          value={Math.max(rosterCount - scheduledCount, 0)}
          icon={UserX}
          className="min-w-[130px] flex-1 border-0 p-0 shadow-none"
        />
        <StatCard label="Conflicts" value={conflictCount} icon={AlertTriangle} className="min-w-[130px] flex-1 border-0 p-0 shadow-none" />
        <StatCard label="Coverage" value={`${coverage}%`} icon={PieChart} tone="brand" className="min-w-[130px] flex-1 border-0 p-0 shadow-none" />
        <Button variant="ghost" size="sm" onClick={onToggle} className="ml-auto">
          Schedule Summary {open ? '▲' : '▼'}
        </Button>
      </div>

      {open ? (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="flex items-center gap-2 border-b border-neutral-100 p-3.5">
            <h2 className="text-sm font-bold text-neutral-900">Hours per employee</h2>
            <span className="ml-auto text-xs text-neutral-400">Paid hours · breaks removed</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {summaryRows.map((row) => (
              <div key={row.employeeId} className="flex items-center gap-2.5 border-b border-r border-neutral-100 p-3">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-600">
                  {row.employee ? `${row.employee.first_name[0]}${row.employee.last_name[0]}` : '?'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="truncate text-xs font-semibold text-neutral-900">
                      {row.employee ? `${row.employee.first_name} ${row.employee.last_name}` : 'Unknown'}
                    </span>
                    <span className={['ml-auto text-xs font-bold', row.overtime ? 'text-warning-text' : 'text-neutral-900'].join(' ')}>
                      {row.hours.toFixed(1)}h
                    </span>
                  </span>
                  {row.overtime ? <span className="text-[10.5px] font-semibold text-warning-text">Over 40h</span> : null}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
