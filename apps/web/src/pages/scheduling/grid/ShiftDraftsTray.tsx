import React from 'react';

export interface ShiftDraftsTrayProps {
  hasDrafts: boolean;
  isDragOver: boolean;
  /** The draft cards, already rendered. */
  children?: React.ReactNode;
  onNewDraft: () => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
}

/** The "Shift drafts" tray beside "＋ Add Employee" (design handoff trayStyle/trayCards) — drafts aren't real shifts until dropped onto someone. */
export function ShiftDraftsTray({ hasDrafts, isDragOver, children, onNewDraft, onDragOver, onDragLeave, onDrop }: ShiftDraftsTrayProps): React.ReactElement {
  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver();
      }}
      onDragLeave={onDragLeave}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
      className={['min-h-[108px] px-4 py-[13px]', isDragOver ? 'bg-[#FDF0E9] shadow-[inset_0_0_0_2px_#F04E17]' : 'bg-white'].join(' ')}
    >
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#A79C93]">Shift drafts</span>
        <span className="text-[11px] text-[#A79C93]">
          {hasDrafts ? 'Drag a draft onto anyone, or press ⋮ to edit or duplicate it' : 'Build a shift once here, then drag it onto anyone'}
        </span>
      </span>
      <div className="mt-[9px] flex flex-wrap items-stretch gap-[9px]">
        {children}
        <button
          type="button"
          onClick={onNewDraft}
          aria-label="Create a shift draft"
          className="flex min-h-[52px] min-w-[86px] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-[11px] border border-dashed border-[#DDD6D0] bg-white text-[#C6420E] hover:border-[#F04E17] hover:bg-[#FDF0E9]"
        >
          <span className="text-[15px] font-extrabold leading-none">＋</span>
          <span className="text-[10px] font-bold">New shift</span>
        </button>
      </div>
    </div>
  );
}
