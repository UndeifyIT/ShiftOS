import React from 'react';
import { ScheduleIcon, type ScheduleIconName } from './ScheduleIcon.js';
import { HANDOFF, avatarTone, durationText, initialsOf } from './scheduleFormat.js';
import type { EmployeeWeekHours, RosterRow } from './useScheduleWeek.js';

/** Hours flags from the handoff's summary footer: over 45h is flagged red, a week under 10h amber. */
export const OVER_HOURS_MINUTES = 45 * 60;
export const LIGHT_WEEK_MINUTES = 10 * 60;

export interface ScheduleSummaryBarProps {
  rosterRows: RosterRow[];
  branchEmployeeCount: number;
  scheduledPeople: number;
  conflictCount: number;
  totalPaidMinutes: number;
  coverage: number;
  hours: Map<string, EmployeeWeekHours>;
  open: boolean;
  onToggle: () => void;
  onExport: () => void;
}

function statTile(color: string, backgroundColor: string): React.CSSProperties {
  return { color, backgroundColor };
}

/** Stats footer + "Hours per employee" panel — design handoff lines 690-736 (schedStats / schedSummaryRows). */
export function ScheduleSummaryBar({
  rosterRows,
  branchEmployeeCount,
  scheduledPeople,
  conflictCount,
  totalPaidMinutes,
  coverage,
  hours,
  open,
  onToggle,
  onExport
}: ScheduleSummaryBarProps): React.ReactElement {
  const stats: Array<{ label: string; value: string; meta: string; icon: ScheduleIconName; style: React.CSSProperties }> = [
    { label: 'On this schedule', value: String(rosterRows.length), meta: `of ${branchEmployeeCount} employees`, icon: 'users', style: statTile(HANDOFF.info, HANDOFF.infoSoft) },
    { label: 'Scheduled', value: String(scheduledPeople), meta: 'have shifts', icon: 'calendar', style: statTile(HANDOFF.ok, HANDOFF.okSoft) },
    { label: 'Unscheduled', value: String(Math.max(0, rosterRows.length - scheduledPeople)), meta: 'nothing assigned', icon: 'user', style: statTile(HANDOFF.warn, HANDOFF.warnSoft) },
    { label: 'Conflicts', value: String(conflictCount), meta: conflictCount ? 'needs attention' : 'all clear', icon: 'alert', style: statTile(HANDOFF.bad, HANDOFF.badSoft) },
    { label: 'Total Hours', value: durationText(totalPaidMinutes), meta: 'paid hours, breaks out', icon: 'clock', style: statTile(HANDOFF.violet, HANDOFF.violetSoft) },
    { label: 'Coverage', value: `${coverage}%`, meta: 'days with a decision', icon: 'checkCircle', style: statTile(HANDOFF.deep, HANDOFF.soft) }
  ];

  return (
    <>
      <section className="flex flex-wrap items-center gap-x-5 gap-y-3.5 rounded-2xl border border-[#EBE7E3] bg-white px-[18px] py-[13px]">
        {stats.map((stat) => (
          <span key={stat.label} className="flex flex-[0_1_auto] items-center gap-[11px]">
            <span className="flex size-[34px] flex-none items-center justify-center rounded-[11px]" style={stat.style}>
              <ScheduleIcon name={stat.icon} size={17} />
            </span>
            <span className="leading-[1.3]">
              <span className="block text-[10.5px] text-[#A79C93]">{stat.label}</span>
              <span className="block text-[17px] font-extrabold tracking-[-0.02em]">{stat.value}</span>
              <span className="block text-[10px] text-[#C4BBB3]">{stat.meta}</span>
            </span>
          </span>
        ))}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className={[
            'ml-auto flex h-10 cursor-pointer items-center gap-2 rounded-[11px] px-[15px] text-[12.5px] font-bold',
            open ? 'border border-[#F04E17] bg-[#FDF0E9] text-[#C6420E]' : 'border border-[#EBE7E3] bg-white text-[#38312B]'
          ].join(' ')}
        >
          <ScheduleIcon name="activity" size={15} />
          <span>Schedule Summary</span>
          <span>{open ? '▴' : '▾'}</span>
        </button>
      </section>

      {open ? (
        <section className="overflow-hidden rounded-2xl border border-[#EBE7E3] bg-white">
          <div className="flex flex-wrap items-center gap-2.5 border-b border-[#F2EEEA] px-[18px] py-3.5">
            <h2 className="m-0 text-[14px] font-extrabold tracking-normal">Hours per employee</h2>
            <span className="text-[11.5px] text-[#A79C93]">
              {rosterRows.length} {rosterRows.length === 1 ? 'person' : 'people'} · {durationText(totalPaidMinutes)} total
            </span>
            <span className="ml-auto text-[11px] text-[#A79C93]">Paid hours · breaks removed</span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(272px,1fr))]">
            {rosterRows.map((row) => {
              const summary = hours.get(row.employee.id);
              const minutes = summary?.paidMinutes ?? 0;
              const over = minutes > OVER_HOURS_MINUTES;
              const none = minutes === 0;
              const light = minutes > 0 && minutes < LIGHT_WEEK_MINUTES;
              const hoursColor = over ? HANDOFF.bad : none ? HANDOFF.faint : light ? HANDOFF.warn : HANDOFF.ink;
              const percent = Math.min(100, Math.round((minutes / OVER_HOURS_MINUTES) * 100));
              const shiftDays = summary?.shiftDays ?? 0;
              const offDays = summary?.offDays ?? 0;
              return (
                <div key={row.employee.id} className="flex min-w-0 items-center gap-[11px] border-b border-r border-[#F7F4F1] px-[18px] py-3">
                  <span className="flex size-8 flex-none items-center justify-center rounded-full text-[10.5px] font-extrabold" style={avatarTone(row.name)}>
                    {initialsOf(row.name)}
                  </span>
                  <span className="min-w-0 flex-auto">
                    <span className="flex items-baseline gap-2">
                      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] font-bold">{row.name}</span>
                      <span className="ml-auto text-[12.5px] font-extrabold" style={{ color: hoursColor }}>
                        {none ? '0h' : durationText(minutes)}
                      </span>
                    </span>
                    <span className="mt-[5px] block h-[5px] overflow-hidden rounded-full bg-[#F2EEEA]">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${Math.max(percent, minutes ? 4 : 0)}%`,
                          backgroundColor: over ? HANDOFF.bad : none ? 'transparent' : light ? HANDOFF.warn : HANDOFF.ok
                        }}
                      />
                    </span>
                    <span className="mt-[5px] flex items-baseline gap-2">
                      <span className="text-[10.5px] text-[#A79C93]">
                        {row.meta} · {shiftDays} {shiftDays === 1 ? 'shift day' : 'shift days'}
                        {offDays ? ` · ${offDays} off` : ''}
                      </span>
                      <span className="ml-auto text-[10.5px] font-bold" style={{ color: over ? HANDOFF.bad : light ? HANDOFF.warn : HANDOFF.faint }}>
                        {over ? 'Over 45h' : none ? 'No shifts yet' : light ? 'Light week' : ''}
                      </span>
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2.5 px-[18px] py-3">
            <p className="m-0 text-[11.5px] text-[#A79C93]">Full-time target is 40h. Anyone over 45h or under 10h is flagged so you can rebalance before publishing.</p>
            <button
              type="button"
              onClick={onExport}
              className="ml-auto h-[34px] cursor-pointer rounded-[10px] border border-[#EBE7E3] bg-white px-[13px] text-[11.5px] font-bold text-black"
            >
              Export hours
            </button>
          </div>
        </section>
      ) : null}
    </>
  );
}
