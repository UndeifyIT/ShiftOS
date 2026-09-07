import React from 'react';
import { Panel } from '@shiftos/ui';
import type { Employee, ScheduleConflict } from '../../../types/domain.js';

export interface ScheduleConflictsPanelProps {
  conflicts: ScheduleConflict[];
  employeesById: Map<string, Employee>;
  onSelectConflict: (conflict: ScheduleConflict) => void;
}

/** Right-rail "Schedule Conflicts" card — lists up to 4 conflicts, clicking one jumps to that cell (design handoff line ~656-679). */
export function ScheduleConflictsPanel({ conflicts, employeesById, onSelectConflict }: ScheduleConflictsPanelProps): React.ReactElement {
  return (
    <Panel
      title="Schedule Conflicts"
      actions={
        conflicts.length > 0 ? (
          <span className="rounded-full bg-error-50 px-2 py-0.5 text-xs font-bold text-error-text">{conflicts.length}</span>
        ) : null
      }
    >
      {conflicts.length === 0 ? (
        <p className="text-xs text-neutral-500">No conflicts. Nobody is double-booked and nobody breaks the 10-hour rule.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {conflicts.slice(0, 4).map((conflict, index) => {
            const employee = employeesById.get(conflict.employeeId);
            return (
              <button
                key={`${conflict.employeeId}-${conflict.date}-${index}`}
                type="button"
                onClick={() => onSelectConflict(conflict)}
                className="flex items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-neutral-50"
              >
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-warning-500" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-neutral-900">
                    {employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown employee'}
                  </span>
                  <span className="block truncate text-[10.5px] text-neutral-500">{conflict.detail}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
