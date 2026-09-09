import React from 'react';
import type { Shift, ShiftAssignment } from '../../../types/domain.js';

export interface ShiftCellCard {
  shift: Shift;
  assignment: ShiftAssignment;
}

export interface ShiftCellProps {
  cards: ShiftCellCard[];
  hasConflict: boolean;
  canEdit: boolean;
  onCardClick: (card: ShiftCellCard) => void;
  onAddClick: () => void;
}

/** One employee/day cell in the weekly grid — holds zero or more shift cards (split shifts, spec §3.1). Empty renders "OFF"; canEdit shows a "+" affordance to add the first (or another) card. */
export function ShiftCell({ cards, hasConflict, canEdit, onCardClick, onAddClick }: ShiftCellProps): React.ReactElement {
  const isEmpty = cards.length === 0;

  return (
    <div
      className={[
        'relative flex min-h-[64px] flex-col gap-1 border-b border-r border-neutral-200 p-1.5',
        isEmpty ? 'bg-neutral-50' : 'bg-white'
      ].join(' ')}
    >
      {isEmpty ? (
        <span className="flex flex-1 items-center justify-center text-xs font-medium text-neutral-400">OFF</span>
      ) : (
        cards.map((card) => (
          <button
            key={card.assignment.id}
            type="button"
            onClick={canEdit ? () => onCardClick(card) : undefined}
            disabled={!canEdit}
            className={[
              'flex flex-col items-start justify-center gap-0.5 rounded-lg border border-transparent bg-brand-50 p-1.5 text-left transition-colors',
              canEdit ? 'cursor-pointer hover:border-brand-200' : 'cursor-default'
            ].join(' ')}
          >
            <span className="text-xs font-semibold text-neutral-900">
              {card.shift.start_time.slice(0, 5)} – {card.shift.end_time.slice(0, 5)}
            </span>
            {card.assignment.notes ? <span className="truncate text-[10.5px] text-neutral-500">{card.assignment.notes}</span> : null}
          </button>
        ))
      )}
      {canEdit ? (
        <button
          type="button"
          onClick={onAddClick}
          aria-label={isEmpty ? 'Assign shift' : 'Add another shift'}
          className="flex h-6 w-full items-center justify-center rounded-md border border-dashed border-neutral-300 text-xs font-bold text-neutral-400 hover:border-brand-400 hover:text-brand-600"
        >
          +
        </button>
      ) : null}
      {hasConflict ? (
        <span
          title="Scheduling conflict"
          className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-error-500 text-[9px] font-bold text-white"
        >
          !
        </span>
      ) : null}
    </div>
  );
}
