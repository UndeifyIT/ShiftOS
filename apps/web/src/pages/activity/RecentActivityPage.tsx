import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HandoffModal, ModalField, ModalFields, modalControl } from '../../components/HandoffModal.js';
import { downloadText, toCsv } from '../../lib/spreadsheet.js';
import { OverviewEmpty, OverviewHeader, OverviewLoading } from '../dashboard/manager/ManagerOverview.js';
import type { ActivityEvent } from '../dashboard/manager/overviewModel.js';
import { pillDate } from '../dashboard/manager/overviewModel.js';
import { useManagerOverview } from '../dashboard/manager/useManagerOverview.js';
import { ScheduleIcon, type ScheduleIconName } from '../scheduling/grid/ScheduleIcon.js';
import { ScheduleToast, useScheduleToast } from '../scheduling/grid/ScheduleToast.js';
import { avatarTone, initialsOf, TONES, type Tone } from '../scheduling/grid/scheduleFormat.js';
import {
  activityCsvRows,
  activityStats,
  CATEGORIES,
  DATE_RANGES,
  DEFAULT_FILTERS,
  filterActivity,
  inRange,
  PAGE_SIZE,
  pageCount,
  pagerPages,
  peopleIn,
  rangeLabel,
  showingLine,
  type ActivityFilters
} from './activityModel.js';

/*
 * The Manager's Recent Activity page, built to the design handoff
 * (`ShiftOS Dashboards.dc.html`: `PAGES["Manager/Recent Activity"]`, the
 * "RECENT ACTIVITY" markup at lines 1498-1596 and its renderVals at
 * 5354-5395). ShiftOS has no activity log table, so the rows are the same
 * events the overview derives — check-ins, lateness and absences, task
 * completions and assignments, announcements, published schedules and leave
 * requests — from the last 7 days. The prototype has no CSS reset, so the
 * values below are what it renders (13px base, `line-height: normal`).
 */

const card = 'rounded-[16px] border border-solid border-[#EBE7E3] bg-white';

function toneTile(tone: Tone): React.CSSProperties {
  return { color: TONES[tone][0], backgroundColor: TONES[tone][1] };
}

const ROW_LINK_LABEL: Record<string, string> = {
  '/attendance': 'Open attendance',
  '/tasks': 'Open tasks',
  '/announcements': 'Open announcements',
  '/schedules': 'Open schedules',
  '/requests': 'Open requests'
};

/** Closes a popover on an outside click or Escape. */
function useDismiss(open: boolean, close: () => void): React.RefObject<HTMLDivElement> {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);
  return ref;
}

const menuSheet =
  'absolute z-30 mt-1.5 flex max-h-[260px] flex-col overflow-y-auto rounded-[12px] border border-solid border-[#EBE7E3] bg-white p-1.5 shadow-[0_18px_40px_-22px_rgba(56,49,43,.45)]';
const menuItem = (selected: boolean): string =>
  [
    'cursor-pointer rounded-[8px] border-0 px-2.5 py-2 text-left font-[inherit] text-[12.5px] hover:bg-[#FBF8F6]',
    selected ? 'bg-[#FDF0E9] font-bold text-[#C6420E]' : 'bg-transparent font-semibold text-[#38312B]'
  ].join(' ');

/** Handoff activityFilters: a label over a 40px select-style button; the choices open underneath. */
function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  return (
    <div className="relative block" ref={ref}>
      <span className="mb-[5px] block text-[11.5px] font-bold text-[#857A72]">{label}</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
        className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-[10px] border border-solid border-[#E4DED9] bg-white px-3 font-[inherit] text-[12.5px] font-semibold text-[#38312B] hover:border-[#DDD6D0]"
      >
        <span className="flex-auto text-left">{value}</span>
        <span className="text-[#A79C93]">⌄</span>
      </button>
      {open ? (
        <div role="listbox" aria-label={label} className={`${menuSheet} left-0 right-0`}>
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={option === value}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={menuItem(option === value)}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RowMenu({ event, onOpen }: { event: ActivityEvent; onOpen: (href: string) => void }): React.ReactElement {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  return (
    <div className="relative justify-self-end" ref={ref}>
      <button
        type="button"
        aria-label="Activity options"
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
        className="size-[26px] cursor-pointer rounded-[8px] border-0 bg-transparent p-0 font-[inherit] text-[14px] font-extrabold text-[#A79C93] hover:bg-[#F7F4F1]"
      >
        ⋮
      </button>
      {open ? (
        <div className={`${menuSheet} right-0 w-[180px]`}>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onOpen(event.href);
            }}
            className={menuItem(false)}
          >
            {ROW_LINK_LABEL[event.href] ?? 'Open'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ActivityRow({ event, last, onOpen }: { event: ActivityEvent; last: boolean; onOpen: (href: string) => void }): React.ReactElement {
  return (
    <li className="grid grid-cols-[76px_36px_minmax(0,1fr)_168px_30px] items-center gap-2.5 px-[18px] py-[13px]">
      <span className="text-[11.5px] font-bold text-[#857A72]">{event.time}</span>
      <span className="relative flex justify-center">
        {last ? null : <span className="absolute top-[30px] h-[28px] w-[1.5px] bg-[#F2EEEA]" />}
        <span className="relative flex size-[30px] flex-none items-center justify-center rounded-full" style={toneTile(event.tone)}>
          <ScheduleIcon name={event.icon} size={14} />
        </span>
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-bold">
          {event.headline}{' '}
          {event.accent ? <span className="font-extrabold text-[#C93A22]">{event.accent}</span> : null}
        </span>
        <span className="mt-0.5 block text-[11.5px] text-[#857A72]">{event.desc}</span>
      </span>
      <span className="flex min-w-0 items-center gap-[9px]">
        <span className="flex size-[30px] flex-none items-center justify-center rounded-full text-[10.5px] font-extrabold" style={avatarTone(event.person)}>
          {initialsOf(event.person)}
        </span>
        <span className="min-w-0">
          <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-bold">{event.person}</span>
          <span className="block text-[11px] text-[#A79C93]">{event.role}</span>
        </span>
      </span>
      <RowMenu event={event} onOpen={onOpen} />
    </li>
  );
}

const pagerButton = (current: boolean): string =>
  [
    'size-8 cursor-pointer rounded-[9px] border border-solid p-0 font-[inherit] text-[12px]',
    current ? 'border-[#F04E17] bg-[#FDF0E9] font-extrabold text-[#C6420E]' : 'border-[#EBE7E3] bg-white font-bold text-[#857A72] disabled:cursor-default disabled:opacity-50'
  ].join(' ');

const QUICK_ACTIONS: Array<{ key: 'start' | 'export' | 'reports'; title: string; body: string; icon: ScheduleIconName; tone: Tone }> = [
  { key: 'start', title: 'Start shift', body: "Open today's shift", icon: 'clock', tone: 'primary' },
  { key: 'export', title: 'Export activity', body: 'Download as CSV', icon: 'download', tone: 'info' },
  { key: 'reports', title: 'View reports', body: 'Attendance & coverage', icon: 'activity', tone: 'ok' }
];

export default function RecentActivityPage(): React.ReactElement {
  const navigate = useNavigate();
  const { status, now, overview } = useManagerOverview();
  const { toast, show, dismiss } = useScheduleToast();
  const [filters, setFilters] = useState<ActivityFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [exportOpen, setExportOpen] = useState(false);

  const events = useMemo(() => overview?.activity ?? [], [overview]);
  const ranged = useMemo(() => inRange(events, filters.range, now), [events, filters.range, now]);
  const stats = activityStats(ranged, filters.range);
  const people = useMemo(() => peopleIn(ranged), [ranged]);
  const rows = useMemo(() => filterActivity(events, filters, now), [events, filters, now]);
  const pages = pageCount(rows.length);
  const current = Math.min(page, pages);
  const shown = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const update = (patch: Partial<ActivityFilters>): void => {
    setFilters((was) => ({ ...was, ...patch }));
    setPage(1);
  };

  const exportRows = (): void => {
    downloadText(`shiftos-activity-${filters.range === 'Today' ? 'today' : 'last-7-days'}.csv`, toCsv(activityCsvRows(rows)));
    setExportOpen(false);
    show('Export ready · downloading');
  };

  const quickAction = (key: 'start' | 'export' | 'reports'): void => {
    if (key === 'start') navigate('/attendance');
    else if (key === 'export') setExportOpen(true);
    else navigate('/reports');
  };

  const subtitle = `All real-time activities and updates from today's shift · ${pillDate(now)}`;

  const body = (): React.ReactNode => {
    if (status === 'loading') return <OverviewLoading title="Recent Activity" />;
    // Handoff isEmpty: nothing has happened today. "View timeline" widens to the last 7 days when there's something there.
    if (status === 'no-branch' || (filters.range === 'Today' && ranged.length === 0)) {
      return (
        <OverviewEmpty
          title="No activity yet today"
          body="Check-ins, task updates and system events appear here as they happen."
          cta={{ label: 'Start shift', onClick: () => navigate('/attendance') }}
          secondary={events.length ? { label: 'View timeline', onClick: () => update({ range: 'Last 7 days', person: 'All People' }) } : null}
        />
      );
    }
    return (
      <div className="grid grid-cols-[minmax(0,1fr)_244px] items-start gap-4 max-[859px]:grid-cols-1">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3.5">
            {stats.map((stat) => (
              <div key={stat.label} className={`${card} p-4`}>
                <div className="flex items-center gap-[11px]">
                  <span className="flex size-[34px] flex-none items-center justify-center rounded-[11px]" style={toneTile(stat.tone)}>
                    <ScheduleIcon name={stat.icon} size={16} />
                  </span>
                  <p className="m-0 text-[12px] font-bold text-[#857A72]">{stat.label}</p>
                </div>
                <p className="mb-0 mt-[11px] text-[28px] font-extrabold leading-none tracking-[-0.03em]">{stat.value}</p>
                <p className="mb-0 mt-[5px] text-[11.5px] text-[#A79C93]">{stat.meta}</p>
              </div>
            ))}
          </div>

          <section className={card}>
            <div className="flex flex-wrap items-center gap-2.5 border-0 border-b border-solid border-[#F2EEEA] px-[18px] py-[15px]">
              <h2 className="m-0 text-[14.5px] font-extrabold tracking-normal">Activity Timeline</h2>
              <label className="ml-auto min-w-[150px] flex-[0_1_220px]">
                <span className="sr-only">Search activities</span>
                <input
                  type="search"
                  value={filters.query}
                  onChange={(event) => update({ query: event.target.value })}
                  placeholder="Search activities..."
                  className="box-border h-[38px] w-full rounded-[10px] border border-solid border-[#E4DED9] bg-white px-3 font-[inherit] text-[12.5px] text-black outline-none placeholder:text-[#757575] focus:border-[#F04E17]"
                />
              </label>
              <button
                type="button"
                onClick={() => update({ sort: filters.sort === 'Newest first' ? 'Oldest first' : 'Newest first' })}
                className="flex h-[38px] cursor-pointer items-center gap-[7px] rounded-[10px] border border-solid border-[#E4DED9] bg-white px-[13px] font-[inherit] text-[12.5px] font-bold text-black"
              >
                {filters.sort} <span className="text-[#A79C93]">⌄</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              {shown.length ? (
                <ul className="m-0 min-w-[720px] list-none py-1.5">
                  {shown.map((event, index) => (
                    <ActivityRow key={event.key} event={event} last={index === shown.length - 1} onOpen={navigate} />
                  ))}
                </ul>
              ) : (
                <p className="m-0 px-[18px] py-10 text-center text-[12.5px] text-[#857A72]">No activity matches these filters.</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2.5 border-0 border-t border-solid border-[#F2EEEA] px-[18px] py-[13px]">
              <p className="m-0 text-[11.5px] text-[#A79C93]">{showingLine(current, rows.length)}</p>
              <span className="ml-auto flex gap-[5px]">
                {pagerPages(current, pages).map((n) => (
                  <button key={n} type="button" aria-label={`Page ${n}`} aria-current={n === current ? 'page' : undefined} onClick={() => setPage(n)} className={pagerButton(n === current)}>
                    {n}
                  </button>
                ))}
                <button type="button" aria-label="Next page" disabled={current >= pages} onClick={() => setPage(current + 1)} className={pagerButton(false)}>
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
              <FilterSelect label="Type" value={filters.type} options={['All Types', ...CATEGORIES]} onChange={(type) => update({ type })} />
              <FilterSelect label="Person" value={filters.person} options={['All People', ...people]} onChange={(person) => update({ person })} />
              <FilterSelect label="Date range" value={filters.range} options={DATE_RANGES} onChange={(range) => update({ range, person: 'All People' })} />
              <button
                type="button"
                onClick={() => {
                  setFilters(DEFAULT_FILTERS);
                  setPage(1);
                  show('Filters cleared');
                }}
                className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-solid border-[#E4DED9] bg-white font-[inherit] text-[12.5px] font-bold text-[#57504A]"
              >
                ↻ Clear Filters
              </button>
            </div>
          </section>

          <section className={`${card} p-4`}>
            <h2 className="mb-3 mt-0 text-[14px] font-extrabold tracking-normal">Quick Actions</h2>
            <div className="flex flex-col gap-[9px]">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => quickAction(action.key)}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-[11px] border border-solid border-[#EBE7E3] bg-white px-3 py-2.5 text-left font-[inherit]"
                >
                  <span className="flex size-8 flex-none items-center justify-center rounded-[10px]" style={toneTile(action.tone)}>
                    <ScheduleIcon name={action.icon} size={15} />
                  </span>
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
      <OverviewHeader title="Recent Activity" subtitle={subtitle} now={now} />
      <div className="flex flex-auto flex-col gap-[18px] bg-[#FDFCFB] px-7 pb-10 pt-[22px] max-[859px]:gap-3.5 max-[859px]:px-3.5 max-[859px]:pb-[84px] max-[859px]:pt-4">{body()}</div>

      <HandoffModal open={exportOpen} title="Export" subtitle="Choose a format and range." primary="Export" primaryDisabled={rows.length === 0} onPrimary={exportRows} onClose={() => setExportOpen(false)}>
        <ModalFields>
          <ModalField label="Format" required>
            <input className={modalControl} value="CSV" readOnly />
          </ModalField>
          <ModalField label="Range" required>
            <input className={modalControl} value={rangeLabel(filters.range, now)} readOnly />
          </ModalField>
          <ModalField label="Include">
            <input className={modalControl} value={filters.type === 'All Types' ? 'All activity types' : filters.type} readOnly />
          </ModalField>
        </ModalFields>
      </HandoffModal>
      <ScheduleToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
