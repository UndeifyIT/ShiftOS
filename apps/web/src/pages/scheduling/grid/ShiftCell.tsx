import React from 'react';

export interface ShiftCellProps {
  /** Rendered cards (already built by the grid). */
  children?: React.ReactNode;
  isEmpty: boolean;
  canEdit: boolean;
  isDragOver: boolean;
  /** Lifts the cell above its neighbours while one of its card menus is open. */
  raised: boolean;
  onClick: () => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
}

/** One employee/day cell — design handoff schedRows cells: stacked cards, or a dashed "+" placeholder while nothing is decided yet. */
export function ShiftCell({ children, isEmpty, canEdit, isDragOver, raised, onClick, onDragOver, onDragLeave, onDrop }: ShiftCellProps): React.ReactElement {
  return (
    <div
      onClick={canEdit ? onClick : undefined}
      onDragOver={
        canEdit
          ? (event) => {
              event.preventDefault();
              onDragOver();
            }
          : undefined
      }
      onDragLeave={canEdit ? onDragLeave : undefined}
      onDrop={
        canEdit
          ? (event) => {
              event.preventDefault();
              onDrop();
            }
          : undefined
      }
      className={[
        'relative flex min-h-[70px] flex-col justify-center gap-1 border-l border-[#F7F4F1] px-[5px] py-[7px]',
        raised ? 'z-[25]' : '',
        canEdit ? 'cursor-pointer' : '',
        isDragOver ? 'bg-[#FDF0E9] shadow-[inset_0_0_0_2px_#F04E17]' : ''
      ].join(' ')}
    >
      {children}
      {canEdit && isEmpty ? (
        <span className="flex h-9 items-center justify-center rounded-[10px] border border-dashed border-[#EDE8E3] text-[14px] font-bold text-[#CFC7C0]">+</span>
      ) : null}
    </div>
  );
}
