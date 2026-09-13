import React, { useEffect, useRef } from 'react';
import { TONES, shiftTone, timeLabel } from './scheduleFormat.js';
import type { ShiftBlock } from './useScheduleWeek.js';

export interface ShiftCardMenuItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

export interface ShiftCardProps {
  off: boolean;
  /** An undecided day: the dashed "+" placeholder, still carrying a "⋮" menu (assign / mark day off). */
  empty?: boolean;
  blocks: ShiftBlock[];
  note: string;
  /** Optional department name shown under the times. */
  department?: string;
  conflict: boolean;
  canEdit: boolean;
  menuOpen: boolean;
  menuItems: ShiftCardMenuItem[];
  onToggleMenu: (open: boolean) => void;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

/** One shift, OFF or empty-day card — design handoff cardView(): tone by start time, two-line times, department, note, conflict "!" and the "⋮" menu. */
export function ShiftCard({
  off,
  empty = false,
  blocks,
  note,
  department = '',
  conflict,
  canEdit,
  menuOpen,
  menuItems,
  onToggleMenu,
  onOpen,
  onDragStart,
  onDragEnd
}: ShiftCardProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) onToggleMenu(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen, onToggleMenu]);

  const [fg, bg] = off ? TONES.neutral : TONES[shiftTone(blocks[0]?.startTime ?? '09:00')];
  const multi = !off && blocks.length > 1;

  const menuButton = canEdit ? (
    <button
      type="button"
      aria-label="Shift options"
      aria-expanded={menuOpen}
      onClick={(event) => {
        event.stopPropagation();
        onToggleMenu(!menuOpen);
      }}
      className={[
        'absolute right-0.5 top-0.5 h-[18px] w-4 cursor-pointer border-0 bg-transparent text-[11px] font-extrabold leading-none',
        empty ? 'text-[#A79C93]' : 'text-current opacity-60'
      ].join(' ')}
    >
      ⋮
    </button>
  ) : null;

  const menu = menuOpen ? (
    <div
      role="menu"
      onClick={(event) => event.stopPropagation()}
      className="absolute right-0 top-5 z-30 flex w-[170px] flex-col rounded-[12px] border border-[#EBE7E3] bg-white p-[5px] text-left shadow-[0_18px_38px_-18px_rgba(56,49,43,.42)]"
    >
      {menuItems.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          onClick={(event) => {
            event.stopPropagation();
            onToggleMenu(false);
            item.onSelect();
          }}
          className={[
            'block w-full cursor-pointer rounded-[8px] border-0 bg-transparent px-[9px] py-2 text-left text-[11.5px] font-bold [line-height:normal]',
            item.danger ? 'text-[#C93A22]' : 'text-[#38312B]'
          ].join(' ')}
        >
          {item.label}
        </button>
      ))}
    </div>
  ) : null;

  if (empty) {
    return (
      <div
        ref={containerRef}
        onClick={(event) => {
          event.stopPropagation();
          if (canEdit) onOpen();
        }}
        className="relative flex h-9 w-full items-center justify-center rounded-[10px] border border-dashed border-[#EDE8E3] text-[14px] font-bold text-[#CFC7C0]"
      >
        +{menuButton}
        {menu}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      draggable={canEdit}
      onDragStart={(event) => {
        if (!canEdit) return;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', 'shift');
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={(event) => {
        event.stopPropagation();
        if (canEdit) onOpen();
      }}
      className={[
        'relative block w-full select-none rounded-[10px] py-1.5 pl-[7px] pr-4 text-center leading-[1.25]',
        off ? 'border border-dashed border-[#E4DED9] bg-[#F6F3F0] text-[#A79C93]' : 'border border-transparent',
        canEdit ? 'cursor-grab' : ''
      ].join(' ')}
      style={off ? undefined : { backgroundColor: bg, color: fg }}
    >
      {off ? (
        <span className="block text-[10px] font-extrabold tracking-[.06em]">OFF</span>
      ) : multi ? (
        blocks.map((block, index) => (
          <span key={index} className="block whitespace-nowrap text-[9px] font-bold">
            {timeLabel(block.startTime)} – {timeLabel(block.endTime)}
          </span>
        ))
      ) : (
        <>
          <span className="block whitespace-nowrap text-[10px] font-extrabold">{timeLabel(blocks[0].startTime)}</span>
          <span className="block whitespace-nowrap text-[10px] font-extrabold">- {timeLabel(blocks[0].endTime)}</span>
        </>
      )}
      {department && !off ? (
        <span className="mt-[3px] block overflow-hidden text-ellipsis whitespace-nowrap text-[9px] font-extrabold uppercase tracking-[.04em] opacity-80">
          {department}
        </span>
      ) : null}
      {note && !off ? (
        <span className="mt-[3px] block overflow-hidden text-ellipsis whitespace-nowrap text-[9.5px] font-bold opacity-75">{note}</span>
      ) : null}
      {conflict && !off ? (
        <span
          title="Scheduling conflict"
          className="absolute right-5 top-1 flex size-[13px] items-center justify-center rounded-full bg-[#C93A22] text-[9px] font-extrabold leading-none text-white"
        >
          !
        </span>
      ) : null}
      {menuButton}
      {menu}
    </div>
  );
}
