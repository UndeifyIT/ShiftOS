import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PermissionDenied } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { useDismiss } from '../../lib/useDismiss.js';
import { useRpcMutation } from '../../lib/useRpc.js';
import { OverviewEmpty, OverviewHeader, OverviewLoading } from '../dashboard/manager/ManagerOverview.js';
import { useNow } from '../dashboard/manager/useManagerOverview.js';
import { ScheduleIcon, type ScheduleIconName } from '../scheduling/grid/ScheduleIcon.js';
import { ScheduleToast, useScheduleToast } from '../scheduling/grid/ScheduleToast.js';
import { avatarTone, initialsOf, TONES, type Tone } from '../scheduling/grid/scheduleFormat.js';
import {
  ATT_STATUSES,
  ATT_TABS,
  attendanceCounts,
  attendanceSubtitle,
  buildAttendanceRows,
  countLabel,
  filterAttendance,
  pageWindow,
  pendingChanges,
  STATUS_TO_RECORD,
  type AttRow,
  type AttStatus,
  type AttTab,
  type PendingEdit
} from './attendanceModel.js';
import { useTodayAttendance } from './useTodayAttendance.js';

/*
 * WEB-012 — Attendance, built to the design handoff (`ShiftOS Dashboards.dc
 * .html`: `PAGES["Supervisor/Attendance"]` and the `kindAttendance` markup at
 * lines 936-1094). Today's assignments for the branch, marked present / late
 * / absent, with the handoff's overview strip, tabs, table, save bar and the
 * Quick Actions / Rules / Legend column. Sizes are the prototype's rendered
 * ones. Nothing is written until Save Attendance, exactly as the design says.
 */

const PER_PAGE = 8;
const STATUS_TONE: Record<AttStatus, Tone> = { Present: 'ok', Late: 'warn', Absent: 'bad', 'Not Marked': 'neutral' };
const STATUS_ICON: Record<AttStatus, ScheduleIconName> = { Present: 'checkCircle', Late: 'clock', Absent: 'x', 'Not Marked': 'minus' };
const GRID = 'grid-cols-[38px_minmax(0,1.5fr)_148px_130px_minmax(0,1fr)_54px]';

const LEGEND: Array<{ label: AttStatus; body: string; color: string }> = [
  { label: 'Present', body: 'Employee is on time', color: TONES.ok[0] },
  { label: 'Late', body: 'Employee arrived after the shift started', color: TONES.warn[0] },
  { label: 'Absent', body: 'Employee did not show up', color: TONES.bad[0] },
  { label: 'Not Marked', body: 'Attendance not recorded yet', color: '#A79C93' }
];

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export default function AttendancePage(): React.ReactElement {
  const navigate = useNavigate();
  const now = useNow();
  const { toast, show, dismiss } = useScheduleToast();
  const { hasPermission } = useSession();
  const canRead = hasPermission('attendance.read');
  const canMark = hasPermission('attendance.update');

  const data = useTodayAttendance(now);
  const markMutation = useRpcMutation<unknown, { shiftAssignmentId: string; status: string; at: string | null; notes: string | null }>('mark_attendance', {
    invalidates: ['list_attendance_for_branch_and_range', 'list_attendance_for_employee']
  });

  const [pending, setPending] = useState<Record<string, PendingEdit>>({});
  const [tab, setTab] = useState<AttTab>('All Employees');
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const filterRef = useDismiss(filterOpen, () => setFilterOpen(false));
  const menuRef = useDismiss<HTMLSpanElement>(menuFor !== null, () => setMenuFor(null));

  const rows = useMemo(
    () =>
      buildAttendanceRows({
        assignments: data.assignments,
        shifts: data.shifts,
        employees: data.employees,
        departments: data.departments,
        records: data.records,
        pending
      }),
    [data.assignments, data.shifts, data.employees, data.departments, data.records, pending]
  );
  const counts = attendanceCounts(rows);
  const filtered = filterAttendance(rows, tab, query, department);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const shown = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
  const changes = pendingChanges(rows, pending);
  const dirty = changes.length;

  if (!canRead) {
    return (
      <div className="px-7 py-6">
        <PermissionDenied />
      </div>
    );
  }

  const edit = (id: string, patch: PendingEdit): void => {
    setPending((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
    setMenuFor(null);
  };

  const markAll = (): void => {
    const targets = rows.filter((row) => (selected.size ? selected.has(row.id) : row.status === 'Not Marked'));
    if (targets.length === 0) {
      show(selected.size ? 'Nothing selected to mark' : 'Everyone is already marked');
      return;
    }
    setPending((current) => {
      const next = { ...current };
      targets.forEach((row) => {
        next[row.id] = { ...next[row.id], status: 'Present' };
      });
      return next;
    });
    show(`${targets.length} marked present · not saved yet`);
  };

  const save = async (): Promise<void> => {
    if (changes.length === 0) {
      show('Nothing to save yet');
      return;
    }
    setSaving(true);
    const failures: string[] = [];
    for (const change of changes) {
      try {
        await markMutation.mutateAsync({
          shiftAssignmentId: change.assignmentId,
          status: STATUS_TO_RECORD[change.status],
          at: change.at,
          notes: change.note.trim() || null
        });
      } catch (error) {
        failures.push(error instanceof Error ? error.message : 'Could not save one row');
      }
    }
    setSaving(false);
    if (failures.length === 0) {
      setPending({});
      show(`${changes.length} ${changes.length === 1 ? 'change' : 'changes'} saved to attendance`);
    } else {
      show(failures[0]!, 'error');
    }
  };

  const exportCsv = (): void => {
    const lines = [
      ['Employee', 'Department', 'Shift', 'Status', 'Check-in', 'Notes'].join(','),
      ...rows.map((row) => [row.name, row.role, row.shiftLabel, row.status, row.time, row.note].map(csvEscape).join(','))
    ];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${data.today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    show(`${rows.length} rows exported`);
  };

  const frame = (body: React.ReactNode): React.ReactElement => (
    <div className="flex min-h-full flex-col text-[13px] text-[#38312B] [line-height:normal]">
      <OverviewHeader
        title="Attendance"
        subtitle={attendanceSubtitle(data.shifts, data.today)}
        now={now}
        actions={
          rows.length ? (
            <button type="button" onClick={exportCsv} className="h-10 cursor-pointer rounded-[11px] border border-solid border-[#EBE7E3] bg-white px-4 text-[13px] font-bold text-black">
              Export
            </button>
          ) : null
        }
      />
      <div className="flex flex-auto flex-col gap-[18px] bg-[#FDFCFB] px-7 pb-10 pt-[22px] max-[859px]:gap-3.5 max-[859px]:px-3.5 max-[859px]:pb-[84px] max-[859px]:pt-4">{body}</div>
      <ScheduleToast toast={toast} onDismiss={dismiss} />
    </div>
  );

  if (data.isLoading) return frame(<OverviewLoading />);
  if (rows.length === 0) {
    return frame(
      <OverviewEmpty
        title="No attendance records today"
        body="Attendance appears once a shift starts. Publish today's schedule to begin marking your team."
        cta={{ label: 'Open scheduling', onClick: () => navigate('/schedules') }}
        secondary={{ label: 'View schedule', onClick: () => navigate('/schedules') }}
      />
    );
  }

  const marked = counts.Present + counts.Late + counts.Absent;

  return frame(
    <div className="flex flex-wrap items-start gap-4">
      <div className="flex min-w-0 flex-[1_1_640px] flex-col gap-4">
        <section className="rounded-[16px] border border-solid border-[#EBE7E3] bg-white px-[18px] py-4">
          <h2 className="m-0 text-[14.5px] font-extrabold tracking-normal">Attendance Overview</h2>
          <div className="mt-3 flex flex-wrap items-stretch gap-4">
            <div className="flex flex-[1_1_300px] flex-wrap items-center">
              {(
                [
                  ['Present', counts.Present, TONES.ok[0]],
                  ['Late', counts.Late, TONES.warn[0]],
                  ['Absent', counts.Absent, TONES.bad[0]],
                  ['Total Scheduled', rows.length, '#38312B']
                ] as const
              ).map(([label, count, color], index) => (
                <span
                  key={label}
                  // The prototype's 84px basis is content-box, so here it carries its own 14px padding.
                  className={`flex-[1_1_98px] min-w-[92px] py-0.5 pr-3.5 text-left ${index < 3 ? 'mr-3.5 border-r border-solid border-[#F2EEEA]' : ''}`}
                >
                  <span className="block text-[26px] font-extrabold leading-[1.05] tracking-[-0.03em]" style={{ color }}>
                    {count}
                  </span>
                  <span className="mt-[3px] block text-[11.5px] text-[#857A72]">{label}</span>
                </span>
              ))}
            </div>
            <div className="min-w-0 flex-[1_1_280px]">
              <div className="flex gap-2.5 rounded-[13px] border border-solid border-[#E2E9FA] bg-[#F5F8FE] px-[13px] py-3">
                <span className="flex-none text-[#2563EB]">
                  <ScheduleIcon name="info" size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-bold text-[#38312B]">{marked ? 'Attendance in progress' : 'Attendance not started'}</span>
                  <span className="mt-[3px] block text-[11.5px] text-[#57504A] [text-wrap:pretty]">
                    {marked
                      ? 'Keep marking people as they arrive. Nothing is final until you save.'
                      : 'Start marking attendance as employees arrive. You can update anytime before ending the shift.'}
                  </span>
                </span>
              </div>
              <p className="mb-0 mt-[7px] text-right text-[10.5px] text-[#A79C93]">{dirty ? `${dirty} unsaved ${dirty === 1 ? 'change' : 'changes'}` : marked ? `${marked} of ${rows.length} marked` : 'Nobody marked yet'}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[16px] border border-solid border-[#EBE7E3] bg-white">
          <div className="flex flex-wrap items-center gap-3 border-b border-solid border-[#F2EEEA] px-4 pt-1">
            <div className="flex min-w-0 flex-[1_1_340px] flex-wrap gap-1">
              {ATT_TABS.map((name) => {
                const total = name === 'All Employees' ? rows.length : counts[name];
                const color = name === 'All Employees' ? '#C6420E' : name === 'Present' ? TONES.ok[0] : name === 'Late' ? TONES.warn[0] : name === 'Absent' ? TONES.bad[0] : '#857A72';
                return (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={tab === name}
                    onClick={() => {
                      setTab(name);
                      setPage(1);
                    }}
                    className={`mr-3.5 cursor-pointer border-0 bg-transparent px-1 pb-[11px] pt-3 text-[12.5px] font-bold ${tab === name ? 'shadow-[inset_0_-2px_0_0_#F04E17]' : ''}`}
                    style={{ color: tab === name ? color : '#A79C93' }}
                  >
                    {name} ({total})
                  </button>
                );
              })}
            </div>
            <span className="ml-auto flex flex-wrap gap-[9px] pb-[11px] pt-[9px]">
              <span className="flex h-[38px] w-[210px] max-w-full items-center gap-2 rounded-[11px] border border-solid border-[#EBE7E3] bg-white px-[11px]">
                <span className="text-[#A79C93]">
                  <ScheduleIcon name="search" size={14} />
                </span>
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search employees…"
                  aria-label="Search employees"
                  className="min-w-0 flex-auto border-0 bg-transparent text-[12px] text-[#38312B] outline-none"
                />
              </span>
              <span ref={filterRef} className="relative">
                <button
                  type="button"
                  aria-expanded={filterOpen}
                  onClick={() => setFilterOpen((open) => !open)}
                  className="flex h-[38px] cursor-pointer items-center gap-2 rounded-[11px] border border-solid border-[#EBE7E3] bg-white px-[13px] text-[12px] font-bold text-black"
                >
                  <ScheduleIcon name="sliders" size={14} />
                  {department === 'all' ? 'Filter' : data.departments.find((d) => d.id === department)?.name ?? 'Filter'} ▾
                </button>
                {filterOpen ? (
                  <span role="listbox" className="absolute right-0 top-[calc(100%+4px)] z-30 flex w-[190px] flex-col rounded-[12px] border border-solid border-[#EBE7E3] bg-white p-1 shadow-[0_18px_38px_-18px_rgba(56,49,43,.42)]">
                    {[{ id: 'all', name: 'All departments' }, ...data.departments.filter((d) => d.is_active && !d.deleted_at)].map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        role="option"
                        aria-selected={department === option.id}
                        onClick={() => {
                          setDepartment(option.id);
                          setFilterOpen(false);
                          setPage(1);
                        }}
                        className={[
                          'cursor-pointer rounded-[8px] border-0 px-[9px] py-2 text-left text-[11.5px] font-bold',
                          department === option.id ? 'bg-[#FDF0E9] text-[#C6420E]' : 'bg-transparent text-[#38312B] hover:bg-[#F7F4F1]'
                        ].join(' ')}
                      >
                        {option.name}
                      </button>
                    ))}
                  </span>
                ) : null}
              </span>
            </span>
          </div>

          <div className="overflow-x-auto [overflow-y:visible]">
            <div className="min-w-[760px]">
              <div className={`grid ${GRID} gap-2.5 border-b border-solid border-[#F2EEEA] px-4 py-[11px] text-[10.5px] font-extrabold uppercase tracking-[.06em] text-[#A79C93]`}>
                <span>
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={shown.length > 0 && shown.every((row) => selected.has(row.id))}
                    onChange={(event) =>
                      setSelected(() => {
                        if (!event.target.checked) return new Set();
                        return new Set(shown.map((row) => row.id));
                      })
                    }
                    className="my-[3px] ml-[4px] mr-[3px] size-[15px] cursor-pointer accent-[#F04E17]"
                  />
                </span>
                <span>Employee</span>
                <span>Status</span>
                <span>Check-in Time</span>
                <span>Notes</span>
                <span className="text-center">Actions</span>
              </div>

              {shown.length === 0 ? (
                <p className="m-0 px-4 py-[34px] text-center text-[12.5px] text-[#A79C93]">Nobody matches this filter.</p>
              ) : (
                shown.map((row: AttRow) => {
                  const tone = TONES[STATUS_TONE[row.status]];
                  const isSelected = selected.has(row.id);
                  const menuOpen = menuFor === row.id;
                  return (
                    <div
                      key={row.id}
                      className={`grid ${GRID} items-center gap-2.5 border-b border-solid border-[#F7F4F1] px-4 py-2.5 ${menuOpen ? 'relative z-[25]' : ''} ${isSelected ? 'bg-[#FDF9F7]' : ''}`}
                    >
                      <span>
                        <input
                          type="checkbox"
                          aria-label={`Select ${row.name}`}
                          checked={isSelected}
                          onChange={() =>
                            setSelected((current) => {
                              const next = new Set(current);
                              if (next.has(row.id)) next.delete(row.id);
                              else next.add(row.id);
                              return next;
                            })
                          }
                          className="my-[3px] ml-[4px] mr-[3px] size-[15px] cursor-pointer accent-[#F04E17]"
                        />
                      </span>
                      <span className="flex min-w-0 items-center gap-[11px]">
                        <span className="flex size-8 flex-none items-center justify-center rounded-full text-[10.5px] font-extrabold" style={avatarTone(row.name)}>
                          {initialsOf(row.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[12.5px] font-bold">{row.name}</span>
                          <span className="block truncate text-[11px] text-[#A79C93]">{row.role}</span>
                        </span>
                      </span>
                      <span className="flex h-8 items-center gap-1.5 rounded-[9px] px-2" style={{ background: tone[1], color: tone[0] }}>
                        <span className="flex-none">
                          <ScheduleIcon name={STATUS_ICON[row.status]} size={13} />
                        </span>
                        <select
                          value={row.status}
                          disabled={!canMark}
                          aria-label={`Attendance status for ${row.name}`}
                          onChange={(event) => edit(row.id, { status: event.target.value as AttStatus })}
                          className="min-w-0 flex-auto cursor-pointer border-0 bg-transparent text-[11.5px] font-bold text-inherit outline-none disabled:cursor-default"
                        >
                          {ATT_STATUSES.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </span>
                      <span className="min-w-0 leading-[1.3]">
                        <span className="block text-[12px] font-bold" style={{ color: row.status === 'Late' ? TONES.warn[0] : row.status === 'Absent' ? TONES.bad[0] : '#38312B' }}>
                          {row.time}
                        </span>
                        <span className="block text-[10.5px] text-[#A79C93]">{row.timeMeta}</span>
                      </span>
                      <span className="min-w-0">
                        <input
                          value={row.note}
                          disabled={!canMark}
                          aria-label={`Note for ${row.name}`}
                          placeholder="—"
                          onChange={(event) => edit(row.id, { note: event.target.value })}
                          className="box-border h-8 w-full rounded-[9px] border border-solid border-transparent bg-transparent px-2 text-[11.5px] text-[#57504A] outline-none hover:border-[#EBE7E3] hover:bg-[#FDFCFB] focus:border-[#F04E17] focus:bg-white"
                        />
                      </span>
                      <span className="relative text-center">
                        <button
                          type="button"
                          aria-label={`Actions for ${row.name}`}
                          onClick={() => setMenuFor(menuOpen ? null : row.id)}
                          className="size-[26px] cursor-pointer rounded-[8px] border-0 bg-transparent text-[13px] font-extrabold text-[#857A72] hover:bg-[#F6F3F0]"
                        >
                          ⋮
                        </button>
                        {menuOpen ? (
                          <span ref={menuRef} className="absolute right-0 top-7 z-30 flex w-[170px] flex-col rounded-[12px] border border-solid border-[#EBE7E3] bg-white p-[5px] shadow-[0_18px_38px_-18px_rgba(56,49,43,.42)]">
                            {(
                              [
                                ['Mark present', () => edit(row.id, { status: 'Present' }), false],
                                ['Mark late', () => edit(row.id, { status: 'Late' }), false],
                                ['Mark absent', () => edit(row.id, { status: 'Absent' }), false],
                                ['View history', () => navigate(`/employees/${row.employeeId}`), false],
                                ['Clear entry', () => edit(row.id, { status: 'Not Marked' }), true]
                              ] as const
                            ).map(([label, act, danger]) => (
                              <button
                                key={label}
                                type="button"
                                disabled={!canMark && label !== 'View history'}
                                onClick={act}
                                className={`block w-full cursor-pointer rounded-[8px] border-0 bg-transparent px-[9px] py-2 text-left text-[11.5px] font-bold disabled:cursor-default disabled:opacity-50 ${danger ? 'text-[#C93A22]' : 'text-[#38312B]'} hover:bg-[#F7F4F1]`}
                              >
                                {label}
                              </button>
                            ))}
                          </span>
                        ) : null}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 px-4 py-3">
            <p className="m-0 text-[11.5px] text-[#A79C93]">{countLabel(shown.length, filtered.length, currentPage, PER_PAGE)}</p>
            <span className="ml-auto flex items-center gap-[5px]">
              <button
                type="button"
                aria-label="Previous page"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
                className="size-[30px] cursor-pointer rounded-[9px] border border-solid border-[#EBE7E3] bg-white text-[#57504A] disabled:cursor-default disabled:text-[#DDD6D0]"
              >
                ‹
              </button>
              {pageWindow(currentPage, pageCount).map((number) => (
                <button
                  key={number}
                  type="button"
                  onClick={() => setPage(number)}
                  className={[
                    'size-[30px] cursor-pointer rounded-[9px] border border-solid text-[12px] font-bold',
                    number === currentPage ? 'border-[#F04E17] bg-[#FDF0E9] text-[#C6420E]' : 'border-[#EBE7E3] bg-white text-[#857A72]'
                  ].join(' ')}
                >
                  {number}
                </button>
              ))}
              <button
                type="button"
                aria-label="Next page"
                disabled={currentPage === pageCount}
                onClick={() => setPage(currentPage + 1)}
                className="size-[30px] cursor-pointer rounded-[9px] border border-solid border-[#EBE7E3] bg-white text-[#57504A] disabled:cursor-default disabled:text-[#DDD6D0]"
              >
                ›
              </button>
            </span>
          </div>
        </section>

        {canMark ? (
          <section className="sticky bottom-0 flex flex-wrap items-center gap-3 rounded-[16px] border border-solid border-[#EBE7E3] bg-white px-4 py-[13px] shadow-[0_-8px_24px_-20px_rgba(56,49,43,.4)]">
            <button
              type="button"
              onClick={() => {
                setPending({});
                setSelected(new Set());
                show('Changes discarded');
              }}
              className="flex h-[42px] cursor-pointer items-center gap-[7px] rounded-[12px] border border-solid border-[#EBE7E3] bg-white px-[15px] text-[12.5px] font-bold text-black"
            >
              ✕ Cancel
            </button>
            <p className="m-0 flex-[1_1_220px] text-center text-[11.5px] text-[#A79C93]">You can update attendance anytime before ending the shift.</p>
            <span className="text-[11.5px] font-bold" style={{ color: dirty ? '#C6420E' : '#A79C93' }}>
              {dirty} unsaved {dirty === 1 ? 'change' : 'changes'}
            </span>
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="flex h-[42px] cursor-pointer items-center gap-2 rounded-[12px] border-0 bg-[#F04E17] px-[18px] text-[12.5px] font-bold text-white shadow-[0_12px_24px_-14px_rgba(240,78,23,.8)] disabled:opacity-70"
            >
              <ScheduleIcon name="checkCircle" size={15} />
              {saving ? 'Saving…' : 'Save Attendance'}
            </button>
          </section>
        ) : null}
      </div>

      <aside className="flex w-[262px] min-w-[236px] flex-none flex-col gap-3.5 max-[859px]:w-full">
        <section className="rounded-[16px] border border-solid border-[#EBE7E3] bg-white p-[15px]">
          <h2 className="m-0 text-[13.5px] font-extrabold tracking-normal">Quick Actions</h2>
          <div className="mt-[11px] flex flex-col gap-2">
            {(
              [
                ['Mark All Present', selected.size ? `Mark the ${selected.size} selected present` : 'Mark all not marked as present', 'checkCircle', 'ok', markAll],
                ['Add Employee', 'Add an employee not on schedule', 'user', 'primary', () => navigate('/employees/new')],
                ['Self check-in', 'Employees clock in themselves', 'phone', 'info', () => show('Employees clock themselves in from their own ShiftOS app — their times appear here')],
                ['Attendance Settings', 'Manage rules & preferences', 'sliders', 'violet', () => navigate('/organization')]
              ] as const
            ).map(([title, body, icon, tone, act]) => (
              <button
                key={title}
                type="button"
                disabled={!canMark && title === 'Mark All Present'}
                onClick={act}
                className="flex cursor-pointer items-center gap-2.5 rounded-[12px] border border-solid border-[#EBE7E3] bg-white px-[11px] py-2.5 text-left disabled:cursor-default disabled:opacity-60"
              >
                <span className="flex size-[30px] flex-none items-center justify-center rounded-[10px]" style={{ color: TONES[tone][0], background: TONES[tone][1] }}>
                  <ScheduleIcon name={icon} size={15} />
                </span>
                <span className="min-w-0 text-left">
                  <span className="block text-[12px] font-bold" style={{ color: TONES[tone][0] }}>
                    {title}
                  </span>
                  <span className="block text-[10.5px] text-[#A79C93] [text-wrap:pretty]">{body}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[16px] border border-solid border-[#EBE7E3] bg-white p-[15px]">
          <h2 className="m-0 text-[13.5px] font-extrabold tracking-normal">Attendance Rules</h2>
          <div className="mt-1.5 flex flex-col">
            {(
              [
                ['Late Threshold', 'Each shift’s start time'],
                ['Grace Period', 'None'],
                ['Auto Absent After', 'Not automatic']
              ] as const
            ).map(([label, value]) => (
              <span key={label} className="flex items-center gap-2.5 border-b border-solid border-[#F7F4F1] py-2.5">
                <span className="min-w-0 flex-auto">
                  <span className="block text-[11px] text-[#A79C93]">{label}</span>
                  <span className="block text-[12.5px] font-bold text-[#38312B]">{value}</span>
                </span>
                <button
                  type="button"
                  aria-label={`About ${label}`}
                  onClick={() => show('Attendance rules are fixed for now — lateness is measured against each shift’s start time')}
                  className="flex size-[26px] cursor-pointer items-center justify-center rounded-[8px] border-0 bg-transparent text-[#C6420E] hover:bg-[#FDF0E9]"
                >
                  <ScheduleIcon name="info" size={14} />
                </button>
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-[16px] border border-solid border-[#EBE7E3] bg-white p-[15px]">
          <h2 className="m-0 text-[13.5px] font-extrabold tracking-normal">Legend</h2>
          <div className="mt-[11px] flex flex-col gap-[11px]">
            {LEGEND.map((item) => (
              <span key={item.label} className="flex items-start gap-[9px]">
                <span className="mt-px flex-none" style={{ color: item.color }}>
                  <ScheduleIcon name={STATUS_ICON[item.label]} size={15} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[12px] font-bold" style={{ color: item.color }}>
                    {item.label}
                  </span>
                  <span className="block text-[10.5px] text-[#A79C93] [text-wrap:pretty]">{item.body}</span>
                </span>
              </span>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
