import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '../../auth/SessionProvider.js';
import { OverviewHeader } from '../dashboard/manager/ManagerOverview.js';
import { useNow } from '../dashboard/manager/useManagerOverview.js';
import { ScheduleIcon } from '../scheduling/grid/ScheduleIcon.js';
import { ScheduleSummaryBar } from '../scheduling/grid/ScheduleSummaryBar.js';
import { ScheduleToast, useScheduleToast } from '../scheduling/grid/ScheduleToast.js';
import { ShiftCard } from '../scheduling/grid/ShiftCard.js';
import { ShiftCell } from '../scheduling/grid/ShiftCell.js';
import {
  addDays,
  avatarTone,
  clockMinutes,
  fullName,
  initialsOf,
  isoWeekNumber,
  paidMinutes,
  shiftTone,
  timeLabel,
  todayDateString,
  TONES,
  weekDays,
  weekRangeLabel,
  weekStartOf
} from '../scheduling/grid/scheduleFormat.js';
import { blockOf, type EmployeeWeekHours } from '../scheduling/grid/useScheduleWeek.js';
import { StaffRequestDialog } from './StaffRequestDialog.js';
import { useStaffSchedule } from './useStaffSchedule.js';

/*
 * Staff's "My schedule", built to the design handoff (`ShiftOS
 * Dashboards.dc.html`: `PAGES["Staff/My Schedule"]` and the SCHEDULE markup
 * with schedIsStaff): the same week grid the Manager and Supervisor use, read
 * only, with one row — the signed-in person — and only published weeks. The
 * toolbar's one action is "Request swap"; the rail is the "Your week" note
 * instead of the AI assistant; the stats keep You / Scheduled / Total Hours.
 */

export default function MySchedulePage(): React.ReactElement {
  const navigate = useNavigate();
  const now = useNow();
  const { hasPermission } = useSession();
  const [searchParams] = useSearchParams();
  const { toast, show, dismiss } = useScheduleToast();
  const thisWeek = weekStartOf(todayDateString(now));
  const weekStart = weekStartOf(searchParams.get('week') ?? thisWeek);
  const weekEnd = addDays(weekStart, 6);
  const staff = useStaffSchedule(weekStart, weekEnd);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);

  const days = weekDays(weekStart);
  const me = staff.me;
  const name = me ? fullName(me) : '';
  const meta = me?.department_id ? staff.departments.get(me.department_id) ?? '' : '';
  const shiftsByDate = useMemo(() => {
    const map = new Map<string, typeof staff.shifts>();
    for (const shift of [...staff.shifts].sort((a, b) => clockMinutes(a.start_time) - clockMinutes(b.start_time))) {
      map.set(shift.shift_date, [...(map.get(shift.shift_date) ?? []), shift]);
    }
    return map;
  }, [staff.shifts]);

  const totalPaid = staff.shifts.reduce((total, shift) => total + paidMinutes(shift.start_time, shift.end_time, shift.break_minutes), 0);
  const hours = new Map<string, EmployeeWeekHours>(
    me
      ? [
          [
            me.id,
            {
              employeeId: me.id,
              paidMinutes: totalPaid,
              shiftDays: shiftsByDate.size,
              offDays: staff.dayOffs.size,
              minutesByDate: new Map([...shiftsByDate].map(([date, list]) => [date, list.reduce((t, s) => t + paidMinutes(s.start_time, s.end_time, s.break_minutes), 0)]))
            }
          ]
        ]
      : []
  );

  // Handoff schedLegend: the week's most common shift times, then OFF.
  const legend = useMemo(() => {
    const counts = new Map<string, { start: string; end: string; count: number }>();
    for (const shift of staff.shifts) {
      const key = `${shift.start_time}-${shift.end_time}`;
      counts.set(key, { start: shift.start_time, end: shift.end_time, count: (counts.get(key)?.count ?? 0) + 1 });
    }
    return [...counts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .sort((a, b) => clockMinutes(a.start) - clockMinutes(b.start))
      .map((item) => ({ label: `${timeLabel(item.start)} - ${timeLabel(item.end)}`, color: TONES[shiftTone(item.start)][0] }));
  }, [staff.shifts]);

  const goToWeek = (start: string): void => navigate(start === thisWeek ? '/my-schedule' : `/my-schedule?week=${start}`);
  const published = staff.schedules.length > 0;
  const zone = staff.timeZone ? ` (${staff.timeZone})` : '';

  const navigator = (
    <div className="flex items-center gap-1 rounded-[14px] border border-[#EBE7E3] bg-white p-[5px]">
      <button
        type="button"
        onClick={() => goToWeek(addDays(weekStart, -7))}
        aria-label="Previous week"
        className="size-8 cursor-pointer rounded-[10px] border border-[#EBE7E3] bg-white text-[14px] text-[#57504A] hover:border-[#DDD6D0]"
      >
        ‹
      </button>
      <span className="flex items-center gap-[9px] px-3">
        <span className="text-[#A79C93]">
          <ScheduleIcon name="calendar" size={16} />
        </span>
        <span className="leading-[1.25]">
          <span className="block text-[13.5px] font-extrabold">{weekRangeLabel(weekStart)}</span>
          <span className="block text-[11px] text-[#A79C93]">Week {isoWeekNumber(weekStart)}</span>
        </span>
      </span>
      <button
        type="button"
        onClick={() => goToWeek(addDays(weekStart, 7))}
        aria-label="Next week"
        className="size-8 cursor-pointer rounded-[10px] border border-[#EBE7E3] bg-white text-[14px] text-[#57504A] hover:border-[#DDD6D0]"
      >
        ›
      </button>
    </div>
  );

  const body = (): React.ReactNode => {
    if (staff.loading) {
      return (
        <p className="m-0 text-[12px] text-[#A79C93]" aria-live="polite">
          Loading My schedule…
        </p>
      );
    }
    if (!me) {
      return (
        <section className="flex flex-col items-center rounded-[20px] border border-[#EBE7E3] bg-white px-8 py-[54px] text-center">
          <h2 className="m-0 text-[19px] font-extrabold tracking-[-0.02em]">No workforce profile yet</h2>
          <p className="mb-0 mt-2 max-w-[440px] text-[13px] text-[#857A72]">
            Your login isn&apos;t linked to an employee record, so there&apos;s no schedule to show. Ask your supervisor to add you with this email address.
          </p>
        </section>
      );
    }
    if (!published) {
      return (
        <>
          <div className="flex flex-wrap items-center gap-3">{navigator}</div>
          <section className="flex flex-col items-center rounded-[20px] border border-[#EBE7E3] bg-white px-8 py-[54px] text-center">
            <span className="flex size-16 items-center justify-center rounded-[20px] bg-[#FDF0E9] text-[#C6420E]">
              <ScheduleIcon name="calendar" size={28} strokeWidth={1.7} />
            </span>
            <h2 className="mb-0 mt-[18px] text-[19px] font-extrabold tracking-[-0.02em]">Nothing published yet</h2>
            <p className="mb-0 mt-2 max-w-[440px] text-[13px] text-[#857A72] [text-wrap:pretty]">
              Your supervisor hasn&apos;t published {weekRangeLabel(weekStart)}. You&apos;ll be notified as soon as it&apos;s available.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              <button
                type="button"
                onClick={() => goToWeek(weekStart === thisWeek ? addDays(thisWeek, -7) : thisWeek)}
                className="h-11 cursor-pointer rounded-[12px] border-0 bg-[#F04E17] px-5 text-[13px] font-bold text-white shadow-[0_12px_24px_-14px_rgba(240,78,23,.8)]"
              >
                {weekStart === thisWeek ? 'View last week' : 'View this week'}
              </button>
            </div>
          </section>
        </>
      );
    }
    return (
      <>
        <div className="flex flex-wrap items-center gap-3">
          {navigator}
          {hasPermission('swaps.request') ? (
            <div className="ml-auto flex flex-wrap items-center gap-2.5">
              <button type="button" onClick={() => setSwapOpen(true)} className="h-[42px] cursor-pointer rounded-[12px] border-0 bg-[#F04E17] px-[18px] text-[12.5px] font-bold text-white">
                Request swap
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-[14px] border border-[#EBE7E3] bg-white px-4 py-[11px]">
          <span className="flex flex-col gap-1">
            <span className="text-[11px] text-[#857A72]">↦ &nbsp;These shifts are published — they cannot be changed here</span>
            <span className="text-[11px] text-[#857A72]">⇅ &nbsp;Ask your supervisor for a swap if a shift does not work</span>
          </span>
          <span className="ml-auto flex flex-wrap gap-x-[18px] gap-y-2">
            {legend.map((item) => (
              <span key={item.label} className="flex items-center gap-[7px] text-[11.5px] font-bold text-[#57504A]">
                <span className="size-[9px] flex-none rounded-[3px]" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
            ))}
            <span className="flex items-center gap-[7px] text-[11.5px] font-bold text-[#57504A]">
              <span className="size-[11px] flex-none rounded-[3px] border border-[#E4DED9] bg-[#F0ECE8]" />
              OFF
            </span>
          </span>
        </div>

        <div className="flex flex-wrap items-start gap-4">
          <section className="min-w-0 flex-[1_1_640px] rounded-2xl border border-[#EBE7E3] bg-white">
            <div className="overflow-x-auto">
              <div className="min-w-[860px]">
                <div className="grid grid-cols-[184px_repeat(7,minmax(94px,1fr))] border-b border-[#F2EEEA]">
                  <span className="px-4 py-[13px] text-[11px] font-extrabold tracking-[.02em] text-[#38312B]">Employee</span>
                  {days.map((day) => (
                    <span key={day.date} className="px-2 py-[11px] text-center leading-[1.3]">
                      <span className="block text-[11.5px] font-extrabold text-[#38312B]">{day.weekday}</span>
                      <span className="block text-[11px] text-[#A79C93]">{day.label}</span>
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-[184px_repeat(7,minmax(94px,1fr))] border-b border-[#F7F4F1]">
                  <span className="flex min-w-0 items-center gap-2.5 py-2.5 pl-4 pr-3.5">
                    <span className="flex size-8 flex-none items-center justify-center rounded-full text-[10.5px] font-extrabold" style={avatarTone(name)}>
                      {initialsOf(name)}
                    </span>
                    <span className="min-w-0 flex-auto">
                      <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] font-bold">{name}</span>
                      <span className="block text-[11px] text-[#A79C93]">{meta}</span>
                    </span>
                  </span>
                  {days.map((day) => (
                    <ShiftCell
                      key={day.date}
                      canEdit={false}
                      outOfSchedule={!staff.publishedDates.has(day.date)}
                      isDragOver={false}
                      raised={false}
                      onClick={() => undefined}
                      onDragOver={() => undefined}
                      onDragLeave={() => undefined}
                      onDrop={() => undefined}
                    >
                      {(shiftsByDate.get(day.date) ?? []).map((shift) => (
                        <ShiftCard
                          key={shift.id}
                          off={false}
                          blocks={[blockOf(shift)]}
                          note=""
                          department={shift.department_id ? staff.departments.get(shift.department_id) ?? '' : ''}
                          conflict={false}
                          canEdit={false}
                          menuOpen={false}
                          menuItems={[]}
                          onToggleMenu={() => undefined}
                          onOpen={() => undefined}
                          onDragStart={() => undefined}
                          onDragEnd={() => undefined}
                        />
                      ))}
                      {staff.dayOffs.has(day.date) && !shiftsByDate.has(day.date) ? (
                        <ShiftCard
                          off
                          blocks={[]}
                          note=""
                          conflict={false}
                          canEdit={false}
                          menuOpen={false}
                          menuItems={[]}
                          onToggleMenu={() => undefined}
                          onOpen={() => undefined}
                          onDragStart={() => undefined}
                          onDragEnd={() => undefined}
                        />
                      ) : null}
                    </ShiftCell>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <aside className="flex min-w-[240px] flex-[0_0_268px] flex-col gap-3.5">
            <section className="rounded-2xl border border-[#EBE7E3] bg-white p-[15px]">
              <h2 className="m-0 text-[13.5px] font-extrabold tracking-normal">Your week</h2>
              <p className="mb-0 mt-[7px] text-[11.5px] text-[#857A72] [text-wrap:pretty]">You only see published shifts. Times are in your branch time zone{zone}.</p>
            </section>
          </aside>
        </div>

        <ScheduleSummaryBar
          staff
          rosterRows={[{ employee: me, name, meta }]}
          branchEmployeeCount={1}
          scheduledPeople={staff.shifts.length ? 1 : 0}
          conflictCount={0}
          totalPaidMinutes={totalPaid}
          coverage={0}
          hours={hours}
          open={summaryOpen}
          onToggle={() => setSummaryOpen((open) => !open)}
          onExport={() => undefined}
        />
      </>
    );
  };

  return (
    // 13px base size and the browser's default line height are what the handoff renders with (it has no CSS reset).
    <div className="flex min-h-full flex-col text-[13px] text-[#38312B] [line-height:normal]">
      <OverviewHeader title="My schedule" subtitle="Your published shifts for this week." now={now} />
      <div className="flex flex-auto flex-col gap-[18px] bg-[#FDFCFB] px-7 pb-10 pt-[22px] max-[859px]:gap-3.5 max-[859px]:px-3.5 max-[859px]:pb-[84px] max-[859px]:pt-4">{body()}</div>

      <StaffRequestDialog
        open={swapOpen}
        kind="swap"
        now={now}
        onClose={() => setSwapOpen(false)}
        onDone={(message) => {
          setSwapOpen(false);
          show(message);
        }}
      />
      <ScheduleToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
