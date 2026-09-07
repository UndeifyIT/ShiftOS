import React from 'react';
import type { Shift, ShiftAssignment } from '../../../types/domain.js';

export interface ShiftCellProps {
  shift: Shift | null;
  assignment: ShiftAssignment | null;
  hasConflict: boolean;
  canEdit: boolean;
  onClick: () => void;
}

/** One employee/day cell in the weekly grid: shows the assigned shift's time block, or "OFF" when empty. */
export function ShiftCell({ shift, assignment, hasConflict, canEdit, onClick }: ShiftCellProps): React.ReactElement {
  const isOff = !shift || !assignment;

  return (
    <button
      type="button"
      onClick={canEdit ? onClick : undefined}
      disabled={!canEdit}
      className={[
        'relative flex min-h-[64px] flex-col items-start justify-center gap-0.5 border-b border-r border-neutral-200 p-2 text-left transition-colors',
        canEdit ? 'cursor-pointer hover:bg-brand-50/40' : 'cursor-default',
        isOff ? 'bg-neutral-50' : 'bg-white'
      ].join(' ')}
    >
      {isOff ? (
        <span className="text-xs font-medium text-neutral-400">OFF</span>
      ) : (
        <>
          <span className="text-xs font-semibold text-neutral-900">
            {shift.start_time.slice(0, 5)} – {shift.end_time.slice(0, 5)}
          </span>
          {assignment.notes ? <span className="truncate text-[10.5px] text-neutral-500">{assignment.notes}</span> : null}
        </>
      )}
      {hasConflict ? (
        <span
          title="Scheduling conflict"
          className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-error-500 text-[9px] font-bold text-white"
        >
          !
        </span>
      ) : null}
    </button>
  );
}
