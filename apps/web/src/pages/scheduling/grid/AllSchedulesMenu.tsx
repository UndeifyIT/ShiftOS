import React, { useEffect, useRef, useState } from 'react';
import type { Schedule } from '../../../types/domain.js';
import { ScheduleIcon } from './ScheduleIcon.js';
import { addDays, shortDate, weekStartOf } from './scheduleFormat.js';

const STATUS_STYLE: Record<Schedule['status'], { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-[#FDF4E6] text-[#B77714]' },
  published: { label: 'Published', className: 'bg-[#E9F7EF] text-[#2E9E62]' },
  archived: { label: 'Archived', className: 'bg-[#F4F1EE] text-[#857A72]' }
};

function rangeLabel(schedule: Schedule): string {
  const endYear = schedule.end_date.slice(0, 4);
  return `${shortDate(schedule.start_date)} – ${shortDate(schedule.end_date)}, ${endYear}`;
}

export interface AllSchedulesMenuProps {
  schedules: Schedule[];
  weekStart: string;
  onSelectWeek: (weekStart: string) => void;
}

/**
 * Every schedule for the branch in one place — drafts included — so a draft
 * for another week is never out of reach of the week-by-week view. Picking one
 * opens the Mon–Sun week it starts in.
 */
export function AllSchedulesMenu({ schedules, weekStart, onSelectWeek }: AllSchedulesMenuProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const visible = schedules.filter((s) => !s.deleted_at);
  const sorted = [...visible].sort((a, b) => b.start_date.localeCompare(a.start_date));
  const draftCount = visible.filter((s) => s.status === 'draft').length;
  const weekEnd = addDays(weekStart, 6);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-10 cursor-pointer items-center gap-2 rounded-[11px] border border-[#EBE7E3] bg-white px-[13px] text-[12.5px] font-bold text-[#38312B] hover:border-[#DDD6D0]"
      >
        <ScheduleIcon name="calendar" size={15} />
        All schedules
        {draftCount ? (
          <span className="inline-flex h-5 items-center rounded-full bg-[#FDF4E6] px-2 text-[10.5px] font-extrabold text-[#B77714]">
            {draftCount} {draftCount === 1 ? 'draft' : 'drafts'}
          </span>
        ) : null}
        <span className="text-[10px] text-[#A79C93]">{open ? '▴' : '▾'}</span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[46px] z-40 flex max-h-[60vh] w-[320px] flex-col overflow-y-auto rounded-[14px] border border-[#EBE7E3] bg-white p-[6px] shadow-[0_18px_38px_-18px_rgba(56,49,43,.42)]"
        >
          {sorted.length === 0 ? <p className="m-0 px-3 py-4 text-[12px] text-[#A79C93]">No schedules yet for this branch.</p> : null}
          {sorted.map((schedule) => {
            const status = STATUS_STYLE[schedule.status];
            const isCurrent = schedule.start_date <= weekEnd && schedule.end_date >= weekStart;
            return (
              <button
                key={schedule.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onSelectWeek(weekStartOf(schedule.start_date));
                }}
                className={[
                  'flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] border-0 px-2.5 py-2 text-left',
                  isCurrent ? 'bg-[#FDF0E9]' : 'bg-transparent hover:bg-[#FDFCFB]'
                ].join(' ')}
              >
                <span className="min-w-0 flex-auto">
                  <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] font-bold text-[#38312B]">{schedule.name}</span>
                  <span className="block text-[11px] text-[#A79C93]">
                    {rangeLabel(schedule)}
                    {isCurrent ? ' · showing now' : ''}
                  </span>
                </span>
                <span className={['inline-flex flex-none rounded-full px-2 py-[3px] text-[10px] font-extrabold', status.className].join(' ')}>{status.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
