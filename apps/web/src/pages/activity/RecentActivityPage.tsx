import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PermissionDenied } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { OverviewEmpty, OverviewHeader, OverviewLoading } from '../dashboard/manager/ManagerOverview.js';
import { useNow } from '../dashboard/manager/useManagerOverview.js';
import { ScheduleIcon, type ScheduleIconName } from '../scheduling/grid/ScheduleIcon.js';
import { ScheduleToast, useScheduleToast } from '../scheduling/grid/ScheduleToast.js';
import { avatarTone, initialsOf, TONES, type Tone } from '../scheduling/grid/scheduleFormat.js';
import {
  ACTIVITY_RANGES,
  ACTIVITY_TYPES,
  activityStats,
  activitySubtitle,
  filterActivity,
  peopleIn,
  PER_PAGE,
  showingLabel,
  type ActivityEvent,
  type ActivityRange,
  type ActivitySort
} from './activityModel.js';
import { useRecentActivity } from './useRecentActivity.js';

/*
 * WEB-011 — Recent Activity, built to the design handoff
 * (`ShiftOS Dashboards.dc.html`: `PAGES["Manager/Recent Activity"]` and the
 * `kindActivity` markup at lines 1499-1590): four stat tiles over a timeline,
 * with Filters and Quick Actions in a 244px rail. Sizes are the prototype's
 * rendered ones. The rows are what actually happened in the branch — see
 * activityModel.ts.
 */

const card = 'rounded-[16px] border border-solid border-[#EBE7E3] bg-white';

function Tile({ tone, icon, size = 34 }: { tone: Tone; icon: ScheduleIconName; size?: number }): React.ReactElement {
  return (
    <span
      className="flex flex-none items-center justify-center"
      style={{ width: size, height: size, borderRadius: size >= 34 ? 11 : 10, color: TONES[tone][0], background: TONES[tone][1] }}
    >
      <ScheduleIcon name={icon} size={size >= 34 ? 16 : 15} />
    </span>
  );
}

/** One row of the timeline (handoff markup lines 1526-1546). */
function Row({ event, last, onMenu }: { event: ActivityEvent; last: boolean; onMenu: () => void }): React.ReactElement {
  return (
    <li className="grid grid-cols-[76px_36px_minmax(0,1fr)_168px_30px] items-center gap-2.5 px-[18px] py-[13px]">
      <span className="text-[11.5px] font-bold text-[#857A72]">{event.time}</span>
      <span className="relative flex justify-center">
        {last ? null : <span className="absolute top-[30px] h-7 w-[1.5px] bg-[#F2EEEA]" />}
        <span
          className="relative flex size-[30px] flex-none items-center justify-center rounded-full"
          style={{ color: TONES[event.tone][0], background: TONES[event.tone][1] }}
        >
          <ScheduleIcon name={event.icon} size={14} />
        </span>
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-bold">
          {event.title} {event.accent ? <span className="font-extrabold text-[#C93A22]">{event.accent}</span> : null}
        </span>
        <span className="mt-0.5 block text-[11.5px] text-[#857A72]">{event.desc}</span>
      </span>
      <span className="flex min-w-0 items-center gap-[9px]">
        <span className="flex size-[30px] flex-none items-center justify-center rounded-full text-[10.5px] font-extrabold" style={avatarTone(event.person)}>
          {initialsOf(event.person)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[12px] font-bold">{event.person}</span>
          <span className="block truncate text-[11px] text-[#A79C93]">{event.role}</span>
        </span>
      </span>
      <button
        type="button"
        onClick={onMenu}
        aria-label={`Activity options for ${event.title}`}
        className="size-[26px] cursor-pointer justify-self-end rounded-[8px] border-0 bg-transparent p-0 text-[14px] font-extrabold text-[#A79C93]"
      >
        ⋮
      </button>
    </li>
  );
}

/** A filter in the rail: the handoff's 40px button, made a real select. */
function RailFilter({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }): React.ReactElement {
  return (
    <label className="block">
      <span className="mb-[5px] block text-[11.5px] font-bold text-[#857A72]">{label}</span>
      <select
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full cursor-pointer appearance-none rounded-[10px] border border-solid border-[#E4DED9] bg-white px-3 text-left text-[12.5px] font-semibold text-[#38312B] outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export default function RecentActivityPage(): React.ReactElement {
  const now = useNow();
  const navigate = useNavigate();
  const { toast, show, dismiss } = useScheduleToast();
  const { hasPermission } = useSession();
  const canRead = hasPermission('attendance.read');

  const { loading, events } = useRecentActivity(now);

  const [type, setType] = useState('All Types');
  const [person, setPerson] = useState('All People');
  const [range, setRange] = useState<ActivityRange>('Today');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<ActivitySort>('Newest first');
  const [page, setPage] = useState(0);

  const shown = useMemo(() => filterActivity(events, { type, person, range, query, sort }, now), [events, type, person, range, query, sort, now]);
  const stats = activityStats(shown);
  const pageCount = Math.max(1, Math.ceil(shown.length / PER_PAGE));
  const current = Math.min(page, pageCount - 1);
  const visible = shown.slice(current * PER_PAGE, current * PER_PAGE + PER_PAGE);
  const people = useMemo(() => peopleIn(events), [events]);

  if (!canRead) {
    return (
      <div className="px-7 py-6">
        <PermissionDenied />
      </div>
    );
  }

  const exportCsv = (): void => {
    const lines = [
      ['Time', 'Activity', 'Detail', 'Person', 'Role', 'Type'].join(','),
      ...shown.map((event) => [event.time, `${event.title}${event.accent ? ` ${event.accent}` : ''}`, event.desc, event.person, event.role, event.type].map(csvEscape).join(','))
    ];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity-${now.toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    show(`${shown.length} ${shown.length === 1 ? 'row' : 'rows'} exported`);
  };

  const actions = [
    { title: 'Start shift', body: "Open today's shift", icon: 'clock' as ScheduleIconName, tone: 'primary' as Tone, act: () => navigate('/attendance') },
    { title: 'Export activity', body: 'Download as CSV', icon: 'download' as ScheduleIconName, tone: 'info' as Tone, act: exportCsv },
    { title: 'View reports', body: 'Attendance & coverage', icon: 'activity' as ScheduleIconName, tone: 'ok' as Tone, act: () => navigate('/reports') }
  ];

  const body = (): React.ReactNode => {
    if (loading) return <OverviewLoading />;
    if (events.length === 0) {
      return (
        <OverviewEmpty
          title="No activity yet today"
          body="Check-ins, task updates and system events appear here as they happen."
          cta={{ label: 'Start shift', onClick: () => navigate('/attendance') }}
          secondary={{ label: 'View timeline', onClick: () => setRange('Last 7 days') }}
        />
      );
    }

    return (
      <div className="grid grid-cols-[minmax(0,1fr)_244px] items-start gap-4 max-[1100px]:grid-cols-[minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3.5">
            {stats.map((stat) => (
              <div key={stat.label} className={`${card} p-4`}>
                <div className="flex items-center gap-[11px]">
                  <Tile tone={stat.tone} icon={stat.icon} />
                  <p className="m-0 text-[12px] font-bold text-[#857A72]">{stat.label}</p>
                </div>
                <p className="mb-0 mt-[11px] text-[28px] font-extrabold leading-none tracking-[-0.03em]">{stat.value}</p>
                <p className="mb-0 mt-[5px] text-[11.5px] text-[#A79C93]">{stat.meta}</p>
              </div>
            ))}
          </div>

          <section className={card}>
            <div className="flex flex-wrap items-center gap-2.5 border-b border-solid border-[#F2EEEA] px-[18px] py-[15px]">
              <h2 className="m-0 text-[14.5px] font-extrabold tracking-normal">Activity Timeline</h2>
              <label className="ml-auto min-w-[150px] flex-[0_1_220px]">
                <span className="sr-only">Search activities</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(0);
                  }}
                  placeholder="Search activities..."
                  className="box-border h-[38px] w-full rounded-[10px] border border-solid border-[#E4DED9] px-3 text-[12.5px] outline-none focus:border-[#F04E17]"
                />
              </label>
              <button
                type="button"
                onClick={() => setSort(sort === 'Newest first' ? 'Oldest first' : 'Newest first')}
                className="flex h-[38px] cursor-pointer items-center gap-[7px] rounded-[10px] border border-solid border-[#E4DED9] bg-white px-[13px] text-[12.5px] font-bold text-black"
              >
                {sort} <span className="text-[#A79C93]">⌄</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <ul className="m-0 min-w-[720px] list-none py-1.5 pl-0">
                {visible.map((event, index) => (
                  <Row key={event.id} event={event} last={index === visible.length - 1} onMenu={() => show(`${event.title} · ${event.desc}`)} />
                ))}
                {visible.length === 0 ? <li className="px-[18px] py-3.5 text-[12.5px] text-[#A79C93]">Nothing matches these filters.</li> : null}
              </ul>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 border-t border-solid border-[#F2EEEA] px-[18px] py-[13px]">
              <p className="m-0 text-[11.5px] text-[#A79C93]">{showingLabel(shown.length, current)}</p>
              <span className="ml-auto flex gap-[5px]">
                {Array.from({ length: pageCount }, (_, index) => index).map((index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setPage(index)}
                    aria-label={`Page ${index + 1}`}
                    aria-current={index === current}
                    className={[
                      'size-8 cursor-pointer rounded-[9px] border border-solid text-[12px]',
                      index === current ? 'border-[#F04E17] bg-[#FDF0E9] font-extrabold text-[#C6420E]' : 'border-[#EBE7E3] bg-white font-bold text-[#857A72]'
                    ].join(' ')}
                  >
                    {index + 1}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage(Math.min(pageCount - 1, current + 1))}
                  aria-label="Next page"
                  className="size-8 cursor-pointer rounded-[9px] border border-solid border-[#EBE7E3] bg-white text-[12px] font-bold text-[#857A72]"
                >
                  →
                </button>
              </span>
            </div>
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <section className={`${card} p-4`}>
            <h2 className="mb-3 mt-0 text-[14px] font-extrabold tracking-normal">Filters</h2>
            <div className="flex flex-col gap-3">
              <RailFilter
                label="Type"
                value={type}
                options={['All Types', ...ACTIVITY_TYPES]}
                onChange={(value) => {
                  setType(value);
                  setPage(0);
                }}
              />
              <RailFilter
                label="Person"
                value={person}
                options={['All People', ...people]}
                onChange={(value) => {
                  setPerson(value);
                  setPage(0);
                }}
              />
              <RailFilter
                label="Date range"
                value={range}
                options={[...ACTIVITY_RANGES]}
                onChange={(value) => {
                  setRange(value as ActivityRange);
                  setPage(0);
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setType('All Types');
                  setPerson('All People');
                  setRange('Today');
                  setQuery('');
                  setPage(0);
                  show('Filters cleared');
                }}
                className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-solid border-[#E4DED9] bg-white text-[12.5px] font-bold text-[#57504A]"
              >
                ↻ Clear Filters
              </button>
            </div>
          </section>

          <section className={`${card} p-4`}>
            <h2 className="mb-3 mt-0 text-[14px] font-extrabold tracking-normal">Quick Actions</h2>
            <div className="flex flex-col gap-[9px]">
              {actions.map((action) => (
                <button
                  key={action.title}
                  type="button"
                  onClick={action.act}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-[11px] border border-solid border-[#EBE7E3] bg-white px-3 py-2.5 text-left"
                >
                  <Tile tone={action.tone} icon={action.icon} size={32} />
                  <span className="min-w-0 text-left">
                    <span className="block text-[12.5px] font-extrabold text-[#38312B]">{action.title}</span>
                    <span className="block text-[11px] text-[#857A72]">{action.body}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-full flex-col text-[13px] text-[#38312B] [line-height:normal]">
      <OverviewHeader title="Recent Activity" subtitle={activitySubtitle(now, range)} now={now} actions={null} />
      <div className="flex flex-auto flex-col gap-[18px] bg-[#FDFCFB] px-7 pb-10 pt-[22px] max-[859px]:gap-3.5 max-[859px]:px-3.5 max-[859px]:pb-[84px] max-[859px]:pt-4">{body()}</div>
      <ScheduleToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
