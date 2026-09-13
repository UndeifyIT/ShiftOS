import React from 'react';

export interface ShiftCellProps {
  /** Rendered cards (already built by the grid) — including the empty-day card for an undecided day. */
  children?: React.ReactNode;
  canEdit: boolean;
  /** The day falls outside this schedule's own dates: nothing can be scheduled here. */
  outOfSchedule: boolean;
  isDragOver: boolean;
  /** Lifts the cell above its neighbours while one of its card menus is open. */
  raised: boolean;
  onClick: () => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
}

/** One employee/day cell — design handoff schedRows cells: stacked cards, or the empty-day card while nothing is decided yet. */
export function ShiftCell({ children, canEdit, outOfSchedule, isDragOver, raised, onClick, onDragOver, onDragLeave, onDrop }: ShiftCellProps): React.ReactElement {
  const interactive = canEdit && !outOfSchedule;
  return (
    <div
      onClick={interactive ? onClick : undefined}
      onDragOver={
        interactive
          ? (event) => {
              event.preventDefault();
              onDragOver();
            }
          : undefined
      }
      onDragLeave={interactive ? onDragLeave : undefined}
      onDrop={
        interactive
          ? (event) => {
              event.preventDefault();
              onDrop();
            }
          : undefined
      }
      title={outOfSchedule ? 'Outside this schedule’s dates' : undefined}
      className={[
        'relative flex min-h-[70px] flex-col justify-center gap-1 border-l border-[#F7F4F1] px-[5px] py-[7px]',
        raised ? 'z-[25]' : '',
        interactive ? 'cursor-pointer' : '',
        outOfSchedule ? 'bg-[repeating-linear-gradient(135deg,#FAF8F6_0_6px,#F4F1EE_6px_12px)]' : '',
        isDragOver ? 'bg-[#FDF0E9] shadow-[inset_0_0_0_2px_#F04E17]' : ''
      ].join(' ')}
    >
      {outOfSchedule ? null : children}
    </div>
  );
}
