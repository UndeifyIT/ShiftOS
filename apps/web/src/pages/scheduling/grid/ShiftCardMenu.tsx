import React, { useEffect, useRef, useState } from 'react';
import { useRpcMutation } from '../../../lib/useRpc.js';
import type { ShiftAssignment } from '../../../types/domain.js';
import type { ShiftCellCard } from './ShiftCell.js';

export interface ShiftCardMenuProps {
  card: ShiftCellCard;
  scheduleId: string;
  onEdit: () => void;
  onDuplicated: () => void;
  onMoveToDrafts: (card: ShiftCellCard) => void;
  onDeleted: () => void;
}

/** The "⋮" per-card menu (design handoff cardView's menuItem list): Edit shift, Duplicate, Move to drafts, Mark day off, Delete. */
export function ShiftCardMenu({ card, scheduleId, onEdit, onDuplicated, onMoveToDrafts, onDeleted }: ShiftCardMenuProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const duplicateMutation = useRpcMutation<{ shift: unknown; assignment: ShiftAssignment }, Record<string, unknown>>(
    'add_shift_to_employee_on_date',
    {
      invalidates: ['list_assignments_for_schedule', 'get_schedule_conflicts', 'list_shifts_for_schedule'],
      onSuccess: onDuplicated
    }
  );
  const removeMutation = useRpcMutation<unknown, { assignmentId: string }>('remove_assigned_shift_on_date', {
    invalidates: ['list_assignments_for_schedule', 'get_schedule_conflicts', 'list_shifts_for_schedule'],
    onSuccess: onDeleted
  });

  const handleDuplicate = (): void => {
    setOpen(false);
    duplicateMutation.mutate({
      scheduleId,
      employeeId: card.assignment.employee_id,
      date: card.shift.shift_date,
      startTime: card.shift.start_time.slice(0, 5),
      endTime: card.shift.end_time.slice(0, 5),
      crossesMidnight: card.shift.crosses_midnight,
      breakMinutes: card.shift.break_minutes,
      notes: card.assignment.notes
    });
  };

  const item = (label: string, onClick: () => void, danger = false): React.ReactElement => (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={['block w-full rounded-md px-2.5 py-1.5 text-left text-xs font-semibold hover:bg-neutral-50', danger ? 'text-error-500' : 'text-neutral-800'].join(
        ' '
      )}
    >
      {label}
    </button>
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Shift options"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex h-4 w-4 items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
      >
        ⋮
      </button>
      {open ? (
        <div className="absolute right-0 top-5 z-30 flex w-36 flex-col gap-0.5 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg">
          {item('Edit shift', () => {
            setOpen(false);
            onEdit();
          })}
          {item('Duplicate', handleDuplicate)}
          {item('Move to drafts', () => {
            setOpen(false);
            onMoveToDrafts(card);
          })}
          {item('Delete', () => {
            setOpen(false);
            removeMutation.mutate({ assignmentId: card.assignment.id });
          }, true)}
        </div>
      ) : null}
    </div>
  );
}
