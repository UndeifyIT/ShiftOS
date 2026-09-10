import React from 'react';
import type { Shift, ShiftAssignment } from '../../../types/domain.js';
import { ShiftCardMenu } from './ShiftCardMenu.js';

export interface ShiftCellCard {
  shift: Shift;
  assignment: ShiftAssignment;
}

export interface ShiftCellProps {
  cards: ShiftCellCard[];
  scheduleId: string;
  hasConflict: boolean;
  canEdit: boolean;
  onCardClick: (card: ShiftCellCard) => void;
  onAddClick: () => void;
  onMoveToDrafts: (card: ShiftCellCard) => void;
  onCardMenuError: (message: string) => void;
}

/** One employee/day cell in the weekly grid — holds zero or more shift cards (split shifts, spec §3.1). Empty renders "OFF"; canEdit shows a "+" affordance to add the first (or another) card. */
export function ShiftCell({ cards, scheduleId, hasConflict, canEdit, onCardClick, onAddClick, onMoveToDrafts, onCardMenuError }: ShiftCellProps): React.ReactElement {
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
          <div
            key={card.assignment.id}
            className="relative flex items-start gap-1 rounded-lg border border-transparent bg-brand-50 p-1.5 hover:border-brand-200"
          >
            <button
              type="button"
              onClick={canEdit ? () => onCardClick(card) : undefined}
              disabled={!canEdit}
              className={['flex min-w-0 flex-1 flex-col items-start justify-center gap-0.5 text-left', canEdit ? 'cursor-pointer' : 'cursor-default'].join(
                ' '
              )}
            >
              <span className="text-xs font-semibold text-neutral-900">
                {card.shift.start_time.slice(0, 5)} – {card.shift.end_time.slice(0, 5)}
              </span>
              {card.assignment.notes ? <span className="truncate text-[10.5px] text-neutral-500">{card.assignment.notes}</span> : null}
            </button>
            {canEdit ? (
              <ShiftCardMenu
                card={card}
                cellCards={cards}
                scheduleId={scheduleId}
                onEdit={() => onCardClick(card)}
                onDuplicated={() => undefined}
                onMoveToDrafts={onMoveToDrafts}
                onDeleted={() => undefined}
                onError={onCardMenuError}
              />
            ) : null}
          </div>
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
