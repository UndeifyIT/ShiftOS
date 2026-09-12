import React from 'react';
import type { ScheduleConflict } from '../../../types/domain.js';
import { shortDate } from './scheduleFormat.js';

export interface ScheduleConflictsPanelProps {
  conflicts: ScheduleConflict[];
  nameOf: (employeeId: string) => string;
  onSelect: (conflict: ScheduleConflict) => void;
  onViewAll: () => void;
}

/** Right-rail "Schedule Conflicts" card — design handoff lines 656-679 (first four conflicts, "May 16: Overlap with another shift"). */
export function ScheduleConflictsPanel({ conflicts, nameOf, onSelect, onViewAll }: ScheduleConflictsPanelProps): React.ReactElement {
  const count = conflicts.length;
  return (
    <section className="rounded-2xl border border-[#EBE7E3] bg-white p-[15px]">
      <div className="flex items-center gap-2">
        <h2 className="m-0 text-[13.5px] font-extrabold tracking-normal">Schedule Conflicts</h2>
        <span
          className={[
            'ml-auto inline-flex h-5 min-w-8 items-center justify-center rounded-full px-1.5 text-[10.5px] font-extrabold',
            count ? 'bg-[#FCEDEA] text-[#C93A22]' : 'bg-[#F6F3F0] text-[#A79C93]'
          ].join(' ')}
        >
          {count}
        </span>
      </div>
      <div className="mt-[11px] flex flex-col gap-0.5">
        {conflicts.slice(0, 4).map((conflict) => (
          <button
            key={`${conflict.employeeId}:${conflict.date}`}
            type="button"
            onClick={() => onSelect(conflict)}
            className="flex cursor-pointer items-center gap-[9px] rounded-[10px] border-0 bg-transparent px-2 py-[9px] text-left hover:bg-[#FDFCFB]"
          >
            <span className="size-[7px] flex-none rounded-full bg-[#E08A1E]" />
            <span className="min-w-0 flex-auto">
              <span className="block text-[12px] font-bold text-[#38312B]">{nameOf(conflict.employeeId)}</span>
              <span className="block text-[10.5px] text-[#A79C93]">
                {shortDate(conflict.date)}: {conflict.detail}
              </span>
            </span>
            <span className="text-[12px] text-[#C4BBB3]">›</span>
          </button>
        ))}
        {count === 0 ? (
          <p className="m-0 px-2 py-3.5 text-[11.5px] text-[#A79C93]">No conflicts. Nobody is double-booked and nobody breaks the 10-hour rule.</p>
        ) : null}
      </div>
      {count > 0 ? (
        <button type="button" onClick={onViewAll} className="mt-1.5 cursor-pointer border-0 bg-transparent p-2 text-[11.5px] font-bold text-[#C6420E]">
          View all conflicts
        </button>
      ) : null}
    </section>
  );
}
