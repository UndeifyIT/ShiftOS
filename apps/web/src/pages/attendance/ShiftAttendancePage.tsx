import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { PermissionDenied } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { callRpc } from '../../lib/apiClient.js';
import { downloadText, toCsv } from '../../lib/spreadsheet.js';
import { OverviewEmpty, OverviewHeader, OverviewLoading } from '../dashboard/manager/ManagerOverview.js';
import { C, pillDate } from '../dashboard/manager/overviewModel.js';
import { useManagerOverview } from '../dashboard/manager/useManagerOverview.js';
import { buildTodaysShift, time12 } from '../dashboard/supervisor/todaysShiftModel.js';
import { HeaderCta } from '../people/RolePeopleTable.js';
import { ScheduleIcon, type ScheduleIconName } from '../scheduling/grid/ScheduleIcon.js';
import { ScheduleToast, useScheduleToast } from '../scheduling/grid/ScheduleToast.js';
import { avatarTone, initialsOf, TONES, type Tone } from '../scheduling/grid/scheduleFormat.js';
import {
  allowedStatuses,
  ATT_ICON,
  ATT_STATUSES,
  ATT_TABS,
  ATT_TONE,
  attendanceCsv,
  buildAttRows,
  lastUpdated,
  saveSteps,
  timeLines,
  type AttDraft,
  type AttRow,
  type AttStatus,
  type AttTab,
  type SaveStep
} from './shiftAttendanceModel.js';

/*
 * The Supervisor's Attendance page, built to the design handoff
 * (`ShiftOS Dashboards.dc.html`: `kindAttendance` markup lines 936-1090 and
 * attVals): today's shift, one row per person, statuses and notes edited as a
 * draft and saved together. Saving fills in new records (mark present / mark
 * absent), corrects existing ones (logged with a reason), or updates a note.
 * The prototype has no CSS reset, so its content-box sizes are compensated
 * below (13px base, `line-height: normal`).
 */

const PAGE_SIZE = 10;
const GRID = 'grid-cols-[38px_minmax(0,1.5fr)_148px_130px_minmax(0,1fr)_54px]';
const TAB_COLOR: Record<AttTab, string> = { 'All Employees': C.deep, Present: C.ok, Late: C.warn, Absent: C.bad, 'Not Marked': C.mute };
const sectionCard = 'rounded-[16px] border border-solid border-[#EBE7E3] bg-white';

function RowMenu({ row, allowed, onPick, onCalendar, onClose }: { row: AttRow; allowed: AttStatus[]; onPick: (status: AttStatus) => void; onCalendar: () => void; onClose: () => void }): React.ReactElement {
  useEffect(() => {
    const close = (): void => onClose();
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [onClose]);
  const item = (label: string, act: () => void, disabled = false, danger = false): React.ReactElement => (
    <button
      key={label}
      type="button"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        act();
      }}
      className={`block w-full cursor-pointer rounded-[8px] border-0 bg-transparent px-[9px] py-2 text-left text-[11.5px] font-bold hover:bg-[#F6F3F0] disabled:cursor-not-allowed disabled:opacity-40 ${danger ? 'text-[#C93A22]' : 'text-[#38312B]'}`}
    >
      {label}
    </button>
  );
  return (
    // 170px + 5px padding and a 1px border each side: the handoff's content-box menu renders 182px.
    <span className="absolute right-0 top-7 z-30 flex w-[182px] flex-col rounded-[12px] border border-solid border-[#EBE7E3] bg-white p-[5px] shadow-[0_18px_38px_-18px_rgba(56,49,43,.42)]">
      {item('Mark present', () => onPick('Present'), !allowed.includes('Present'))}
      {item('Mark late', () => onPick('Late'), !allowed.includes('Late'))}
      {item('Mark absent', () => onPick('Absent'))}
      {item('View calendar', onCalendar)}
      {item('Clear entry', () => onPick('Not Marked'), row.saved === 'Not Marked' && !row.record, true)}
    </span>
  );
}

export default function ShiftAttendancePage(): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission, myContext } = useSession();
  const { status, now, branch, overview } = useManagerOverview();
  const { toast, show, dismiss } = useScheduleToast();
  const [drafts, setDrafts] = useState<Record<string, AttDraft>>({});
  const [tab, setTab] = useState<AttTab>('All Employees');
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [menu, setMenu] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!filterOpen) return;
    const close = (): void => setFilterOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [filterOpen]);

  if (!hasPermission('attendance.read')) {
    return (
      <div className="px-7 py-6">
        <PermissionDenied />
      </div>
    );
  }

  const canMark = hasPermission('attendance.update');
  const canCorrect = hasPermission('attendance.correct');
  const shift = overview ? buildTodaysShift(overview, now) : null;
  const rows = shift ? buildAttRows(shift.members) : [];
  const current = (row: AttRow): AttDraft => drafts[row.id] ?? { status: row.saved, note: row.savedNote };
  const counts: Record<AttStatus, number> = { Present: 0, Late: 0, Absent: 0, 'Not Marked': 0 };
  rows.forEach((row) => {
    counts[current(row).status] += 1;
  });
  const needle = query.trim().toLowerCase();
  const filtered = rows.filter(
    (row) =>
      (tab === 'All Employees' || current(row).status === tab) &&
      (!department || row.departmentId === department) &&
      (!needle || `${row.name} ${row.role}`.toLowerCase().includes(needle))
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageNow = Math.min(page, pages);
  const visible = filtered.slice((pageNow - 1) * PAGE_SIZE, pageNow * PAGE_SIZE);
  const steps = saveSteps(rows, drafts);
  // One change per edited row, however many calls saving it takes.
  const dirty = new Set(steps.map((step) => step.row.id)).size;
  const started = rows.some((row) => row.record && row.saved !== 'Not Marked') || Object.keys(drafts).length > 0;
  const departments = (overview?.detail.departments ?? []).filter((d) => rows.some((r) => r.departmentId === d.id));

  const setDraft = (row: AttRow, patch: Partial<AttDraft>): void => {
    setDrafts((all) => ({ ...all, [row.id]: { ...current(row), ...patch } }));
    setMenu(null);
  };

  const markAllPresent = (): void => {
    const targets = rows.filter((row) => current(row).status === 'Not Marked' && (selected.length === 0 || selected.includes(row.id)));
    if (targets.length === 0) {
      show('Everyone is already marked');
      return;
    }
    setDrafts((all) => {
      const next = { ...all };
      for (const row of targets) next[row.id] = { ...current(row), status: 'Present' };
      return next;
    });
    show(`${targets.length} marked present · save to keep it`);
  };

  const run = (step: SaveStep): Promise<unknown> => {
    const org = myContext?.organizationId as string;
    return step.kind === 'note'
      ? callRpc('set_attendance_note', org, { attendanceRecordId: step.row.record?.id, notes: step.note || null })
      : callRpc('mark_attendance', org, { shiftAssignmentId: step.row.id, status: step.status, notes: step.notes });
  };

  const save = async (): Promise<void> => {
    if (dirty === 0) {
      show('Nothing to save yet');
      return;
    }
    if (!canMark) {
      show("Your role can't mark attendance", 'error');
      return;
    }
    // Changing an entry that is already saved is a correction (mark_attendance checks attendance.correct).
    if (!canCorrect && steps.some((step) => step.kind === 'mark' && step.row.record && step.row.saved !== 'Not Marked')) {
      show('Changing a saved entry needs the Correct attendance permission', 'error');
      return;
    }
    setSaving(true);
    // Rows save side by side, one call each.
    const byRow = new Map<string, SaveStep[]>();
    for (const step of steps) byRow.set(step.row.id, [...(byRow.get(step.row.id) ?? []), step]);
    const results = await Promise.allSettled(
      [...byRow.values()].map(async (rowSteps) => {
        for (const step of rowSteps) await run(step);
      })
    );
    setSaving(false);
    await queryClient.invalidateQueries({ queryKey: ['list_attendance_for_branch_and_range'] });
    const rowIds = [...byRow.keys()];
    const failedIds = new Set(rowIds.filter((_, i) => results[i].status === 'rejected'));
    const failed = failedIds.size;
    setDrafts((all) => Object.fromEntries(Object.entries(all).filter(([id]) => failedIds.has(id))));
    if (failed) show(`${dirty - failed} saved · ${failed} couldn't be saved`, 'error');
    else show(`${dirty} change${dirty === 1 ? '' : 's'} saved to attendance`);
  };

  const cancel = (): void => {
    setDrafts({});
    setSelected([]);
    setMenu(null);
    show('Changes discarded');
  };

  const exportCsv = (): void => {
    if (!shift || !overview) return;
    downloadText(`shiftos-attendance-${overview.today}.csv`, toCsv(attendanceCsv(rows, overview.today, shift.shiftTitle)));
    show('Export ready · downloading');
  };

  const allChecked = visible.length > 0 && visible.every((row) => selected.includes(row.id));

  const quickActions: Array<{ title: string; body: string; icon: ScheduleIconName; tone: Tone; act: () => void }> = [
    { title: 'Mark All Present', body: 'Mark all not marked as present', icon: 'checkCircle', tone: 'ok', act: markAllPresent },
    { title: 'Add Employee', body: 'Add an employee not on schedule', icon: 'user', tone: 'primary', act: () => navigate(`/schedules?week=${overview?.weekStart ?? ''}`) },
    { title: 'Check-in from phones', body: 'Staff clock in with their own login', icon: 'monitor', tone: 'info', act: () => show('Your team clocks in from ShiftOS on their own phone — it shows here straight away') },
    { title: 'Attendance Settings', body: 'Manage rules & preferences', icon: 'gear', tone: 'violet', act: () => navigate('/settings') }
  ];
  const startTime = shift?.members[0] ? time12(shift.members[0].shift.start_time) : '—';
  const rules = [
    { label: 'Late Threshold', value: `${startTime} (no grace)` },
    { label: 'Grace Period', value: 'None' },
    { label: 'Auto Absent After', value: 'Never — marked by hand' }
  ];
  const legend: Array<{ label: AttStatus; body: string; color: string }> = [
    { label: 'Present', body: 'Employee is on time', color: C.ok },
    { label: 'Late', body: 'Employee arrived after threshold', color: C.warn },
    { label: 'Absent', body: 'Employee did not show up', color: C.bad },
    { label: 'Not Marked', body: 'Attendance not recorded yet', color: C.faint }
  ];
  const editRule = (): void => (hasPermission('organizations.update') ? navigate('/settings') : show('Attendance rules are set by your manager for the whole organization'));

  const body = (): React.ReactNode => {
    if (status === 'loading') return <OverviewLoading title="Attendance" />;
    if (!shift || rows.length === 0) {
      return (
        <OverviewEmpty
          title="No attendance records today"
          body="Attendance appears once a shift starts. Publish today's shift to begin marking your team."
          cta={null}
          secondary={{ label: 'View schedule', onClick: () => navigate('/schedules') }}
        />
      );
    }
    return (
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[1_1_640px] flex-col gap-4">
          <section className={`${sectionCard} px-[18px] py-4`}>
            <h2 className="m-0 text-[14.5px] font-extrabold tracking-normal">Attendance Overview</h2>
            <div className="mt-3 flex flex-wrap items-stretch gap-4">
              <div className="flex flex-[1_1_300px] flex-wrap items-center">
                {(
                  [
                    ['Present', counts.Present, C.ok],
                    ['Late', counts.Late, C.warn],
                    ['Absent', counts.Absent, C.bad],
                    ['Total Scheduled', rows.length, C.ink]
                  ] as const
                ).map(([label, value, color], index) => (
                  <span
                    key={label}
                    // 84px basis / 78px minimum plus 14px padding (and a 1px divider): the handoff's content-box widths.
                    className={index < 3 ? 'mr-3.5 min-w-[93px] flex-[1_1_99px] border-0 border-r border-solid border-[#F2EEEA] py-0.5 pl-0 pr-3.5 text-left' : 'min-w-[92px] flex-[1_1_98px] py-0.5 pl-0 pr-3.5 text-left'}
                  >
                    <span className="block text-[26px] font-extrabold leading-[1.05] tracking-[-0.03em]" style={{ color }}>
                      {value}
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
                    <span className="block text-[12.5px] font-bold text-[#38312B]">{started ? 'Attendance in progress' : 'Attendance not started'}</span>
                    <span className="mt-[3px] block text-[11.5px] text-[#57504A] [text-wrap:pretty]">
                      {started ? 'Keep marking people as they arrive. Nothing is final until you save.' : 'Start marking attendance as employees arrive. You can update anytime before ending the shift.'}
                    </span>
                  </span>
                </div>
                <p className="mb-0 mt-[7px] text-right text-[10.5px] text-[#A79C93]">{lastUpdated(rows)}</p>
              </div>
            </div>
          </section>

          <section className={sectionCard}>
            <div className="flex flex-wrap items-center gap-3 border-0 border-b border-solid border-[#F2EEEA] px-4 pb-0 pt-1">
              <div className="flex min-w-0 flex-[1_1_340px] flex-wrap gap-1">
                {ATT_TABS.map((label) => {
                  const on = tab === label;
                  const n = label === 'All Employees' ? rows.length : counts[label];
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        setTab(label);
                        setPage(1);
                      }}
                      className="mr-3.5 cursor-pointer border-0 bg-transparent px-1 pb-[11px] pt-3 text-[12.5px] font-bold"
                      style={{ color: on ? TAB_COLOR[label] : C.faint, boxShadow: on ? `inset 0 -2px 0 0 ${C.primary}` : 'none' }}
                    >
                      {label} ({n})
                    </button>
                  );
                })}
              </div>
              <span className="ml-auto flex flex-wrap gap-[9px] pb-[11px] pt-[9px]">
                {/* 210px + 11px padding and a 1px border each side: the handoff's content-box field renders 234 × 40. */}
                <span className="flex h-10 w-[234px] max-w-full items-center gap-2 rounded-[11px] border border-solid border-[#EBE7E3] bg-white px-[11px]">
                  <span className="flex text-[#A79C93]">
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
                    className="min-w-0 flex-auto border-0 bg-transparent p-0 text-[12px] text-[#38312B] outline-none placeholder:text-[#757575]"
                  />
                </span>
                <span className="relative">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setFilterOpen((open) => !open);
                    }}
                    className="flex h-[38px] cursor-pointer items-center gap-2 rounded-[11px] border border-solid border-[#EBE7E3] bg-white px-[13px] text-[12px] font-bold text-black hover:border-[#DDD6D0]"
                  >
                    <ScheduleIcon name="sliders" size={14} />
                    {department ? departments.find((d) => d.id === department)?.name ?? 'Filter' : 'Filter'} ▾
                  </button>
                  {filterOpen ? (
                    <span className="absolute right-0 top-[42px] z-30 flex w-[182px] flex-col rounded-[12px] border border-solid border-[#EBE7E3] bg-white p-[5px] shadow-[0_18px_38px_-18px_rgba(56,49,43,.42)]">
                      {[{ id: null as string | null, name: 'All departments' }, ...departments].map((d) => (
                        <button
                          key={d.id ?? 'all'}
                          type="button"
                          onClick={() => {
                            setDepartment(d.id);
                            setPage(1);
                          }}
                          className="block w-full cursor-pointer rounded-[8px] border-0 bg-transparent px-[9px] py-2 text-left text-[11.5px] font-bold hover:bg-[#F6F3F0]"
                          style={{ color: department === d.id ? C.deep : C.ink }}
                        >
                          {d.name}
                        </button>
                      ))}
                    </span>
                  ) : null}
                </span>
              </span>
            </div>

            <div className="overflow-x-auto overflow-y-visible">
              <div className="min-w-[760px]">
                <div className={`grid ${GRID} gap-2.5 border-0 border-b border-solid border-[#F2EEEA] px-4 py-[11px] text-[10.5px] font-extrabold uppercase tracking-[.06em] text-[#A79C93]`}>
                  <span>
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={() => setSelected(allChecked ? selected.filter((id) => !visible.some((r) => r.id === id)) : [...new Set([...selected, ...visible.map((r) => r.id)])])}
                      aria-label="Select all"
                      className="m-[3px_3px_3px_4px] size-[15px] cursor-pointer accent-[#F04E17]"
                    />
                  </span>
                  <span>Employee</span>
                  <span>Status</span>
                  <span>Check-in Time</span>
                  <span>Notes</span>
                  <span className="text-center">Actions</span>
                </div>
                {visible.map((row) => {
                  const draft = current(row);
                  const [fg, bg] = TONES[ATT_TONE[draft.status]];
                  const { time, meta } = timeLines(row, draft.status);
                  const checked = selected.includes(row.id);
                  const allowed = allowedStatuses(row);
                  const menuOpen = menu === row.id;
                  return (
                    <div
                      key={row.id}
                      className={`grid ${GRID} items-center gap-2.5 border-0 border-b border-solid border-[#F7F4F1] px-4 py-2.5 ${menuOpen ? 'relative z-[25]' : ''} ${checked ? 'bg-[#FDF9F7]' : ''}`}
                    >
                      <span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setSelected(checked ? selected.filter((id) => id !== row.id) : [...selected, row.id])}
                          aria-label={`Select ${row.name}`}
                          className="m-[3px_3px_3px_4px] size-[15px] cursor-pointer accent-[#F04E17]"
                        />
                      </span>
                      <span className="flex min-w-0 items-center gap-[11px]">
                        <span className="flex size-8 flex-none items-center justify-center rounded-full text-[10.5px] font-extrabold" style={avatarTone(row.name)}>
                          {initialsOf(row.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[12.5px] font-bold">{row.name}</span>
                          <span className="block text-[11px] text-[#A79C93]">{row.role}</span>
                        </span>
                      </span>
                      <span className="flex h-8 items-center gap-1.5 rounded-[9px] px-2" style={{ color: fg, backgroundColor: bg }}>
                        <span className="flex flex-none">
                          <ScheduleIcon name={ATT_ICON[draft.status]} size={13} />
                        </span>
                        <select
                          value={draft.status}
                          onChange={(event) => setDraft(row, { status: event.target.value as AttStatus })}
                          aria-label={`Attendance status for ${row.name}`}
                          disabled={!canMark}
                          className="min-w-0 flex-auto cursor-pointer border-0 bg-transparent text-[11.5px] font-bold text-inherit outline-none"
                        >
                          {ATT_STATUSES.map((option) => (
                            <option key={option} value={option} disabled={!allowed.includes(option)}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </span>
                      <span className="min-w-0 leading-[1.3]">
                        <span className="block text-[12px] font-bold" style={{ color: draft.status === 'Late' ? C.warn : draft.status === 'Absent' ? C.bad : C.ink }}>
                          {time}
                        </span>
                        <span className="block text-[10.5px] text-[#A79C93]">{meta}</span>
                      </span>
                      <span className="min-w-0">
                        <input
                          value={draft.note}
                          onChange={(event) => setDraft(row, { note: event.target.value })}
                          placeholder="—"
                          aria-label={`Notes for ${row.name}`}
                          disabled={!canMark || (draft.status === 'Not Marked' && row.saved === 'Not Marked')}
                          className="box-border h-8 w-full rounded-[9px] border border-solid border-transparent bg-transparent px-2 text-[11.5px] text-[#57504A] outline-none placeholder:text-[#57504A] hover:border-[#EBE7E3] hover:bg-[#FDFCFB] focus:border-[#F04E17] focus:bg-white disabled:hover:border-transparent disabled:hover:bg-transparent"
                        />
                      </span>
                      <span className="relative text-center">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setMenu(menuOpen ? null : row.id);
                          }}
                          aria-label={`Actions for ${row.name}`}
                          className="size-[26px] cursor-pointer rounded-[8px] border-0 bg-transparent p-0 text-[13px] font-extrabold text-[#857A72] hover:bg-[#F6F3F0]"
                        >
                          ⋮
                        </button>
                        {menuOpen ? (
                          <RowMenu
                            row={row}
                            allowed={canMark ? allowed : []}
                            onPick={(next) => setDraft(row, { status: next })}
                            onCalendar={() => navigate(`/employees/${row.employeeId}`)}
                            onClose={() => setMenu(null)}
                          />
                        ) : null}
                      </span>
                    </div>
                  );
                })}
                {filtered.length === 0 ? <p className="m-0 px-4 py-[34px] text-center text-[12.5px] text-[#A79C93]">Nobody matches this filter.</p> : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 px-4 py-3">
              <p className="m-0 text-[11.5px] text-[#A79C93]">
                {filtered.length === 0 ? 0 : (pageNow - 1) * PAGE_SIZE + 1}–{Math.min(pageNow * PAGE_SIZE, filtered.length)} of {rows.length} employees
              </p>
              <span className="ml-auto flex items-center gap-[5px]">
                <button
                  type="button"
                  onClick={() => (pageNow > 1 ? setPage(pageNow - 1) : show('Already on the first page'))}
                  aria-label="Previous page"
                  className="size-[30px] cursor-pointer rounded-[9px] border border-solid border-[#EBE7E3] bg-white p-0 text-[#57504A]"
                >
                  ‹
                </button>
                {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className="size-[30px] cursor-pointer rounded-[9px] border border-solid p-0 text-[12px] font-bold"
                    style={n === pageNow ? { borderColor: C.primary, backgroundColor: '#FDF0E9', color: C.deep } : { borderColor: C.line, backgroundColor: '#fff', color: C.mute }}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => (pageNow < pages ? setPage(pageNow + 1) : show('Already on the last page'))}
                  aria-label="Next page"
                  className="size-[30px] cursor-pointer rounded-[9px] border border-solid border-[#EBE7E3] bg-white p-0 text-[#57504A]"
                >
                  ›
                </button>
              </span>
            </div>
          </section>

          <section className={`${sectionCard} sticky bottom-0 flex flex-wrap items-center gap-3 px-4 py-[13px] shadow-[0_-8px_24px_-20px_rgba(56,49,43,.4)]`}>
            <button type="button" onClick={cancel} className="flex h-[42px] cursor-pointer items-center gap-[7px] rounded-[12px] border border-solid border-[#EBE7E3] bg-white px-[15px] text-[12.5px] font-bold text-black">
              ✕ Cancel
            </button>
            <p className="m-0 flex-[1_1_220px] text-center text-[11.5px] text-[#A79C93]">You can update attendance anytime before ending the shift.</p>
            <span className="text-[11.5px] font-bold" style={{ color: dirty ? C.deep : C.faint }}>
              {dirty} {dirty === 1 ? 'unsaved change' : 'unsaved changes'}
            </span>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="flex h-[42px] cursor-pointer items-center gap-2 rounded-[12px] border-0 bg-[#F04E17] px-[18px] text-[12.5px] font-bold text-white shadow-[0_12px_24px_-14px_rgba(240,78,23,.8)] disabled:opacity-70"
            >
              <ScheduleIcon name="checkCircle" size={15} />
              {saving ? 'Saving…' : 'Save Attendance'}
            </button>
          </section>
        </div>

        <aside className="flex min-w-[236px] flex-[0_0_262px] flex-col gap-3.5">
          <section className={`${sectionCard} p-[15px]`}>
            <h2 className="m-0 text-[13.5px] font-extrabold tracking-normal">Quick Actions</h2>
            <div className="mt-[11px] flex flex-col gap-2">
              {quickActions.map((q) => (
                <button
                  key={q.title}
                  type="button"
                  onClick={q.act}
                  className="flex cursor-pointer items-center gap-2.5 rounded-[12px] border border-solid border-[#EBE7E3] bg-white px-[11px] py-2.5 text-left"
                >
                  <span className="flex size-[30px] flex-none items-center justify-center rounded-[10px]" style={{ color: TONES[q.tone][0], backgroundColor: TONES[q.tone][1] }}>
                    <ScheduleIcon name={q.icon} size={15} />
                  </span>
                  <span className="min-w-0 text-left">
                    <span className="block text-[12px] font-bold" style={{ color: TONES[q.tone][0] }}>
                      {q.title}
                    </span>
                    <span className="block text-[10.5px] text-[#A79C93] [text-wrap:pretty]">{q.body}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className={`${sectionCard} p-[15px]`}>
            <h2 className="m-0 text-[13.5px] font-extrabold tracking-normal">Attendance Rules</h2>
            <div className="mt-1.5 flex flex-col">
              {rules.map((rule) => (
                <span key={rule.label} className="flex items-center gap-2.5 border-0 border-b border-solid border-[#F7F4F1] py-2.5">
                  <span className="min-w-0 flex-auto">
                    <span className="block text-[11px] text-[#A79C93]">{rule.label}</span>
                    <span className="block text-[12.5px] font-bold text-[#38312B]">{rule.value}</span>
                  </span>
                  <button
                    type="button"
                    onClick={editRule}
                    aria-label={`Edit ${rule.label}`}
                    className="flex size-[26px] cursor-pointer items-center justify-center rounded-[8px] border-0 bg-transparent p-0 text-[#C6420E] hover:bg-[#FDF0E9]"
                  >
                    <ScheduleIcon name="edit" size={14} />
                  </button>
                </span>
              ))}
            </div>
          </section>

          <section className={`${sectionCard} p-[15px]`}>
            <h2 className="m-0 text-[13.5px] font-extrabold tracking-normal">Legend</h2>
            <div className="mt-[11px] flex flex-col gap-[11px]">
              {legend.map((item) => (
                <span key={item.label} className="flex items-start gap-[9px]">
                  <span className="mt-px flex flex-none" style={{ color: item.color }}>
                    <ScheduleIcon name={ATT_ICON[item.label]} size={15} />
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
  };

  return (
    <div className="flex min-h-full flex-col text-[13px] text-[#38312B] [line-height:normal]">
      <OverviewHeader
        title="Attendance"
        subtitle={shift ? `Mark attendance for ${shift.shiftTitle} · ${pillDate(now)}` : `${branch?.name ?? 'Your branch'} · ${pillDate(now)}`}
        now={now}
        actions={rows.length > 0 ? <HeaderCta label="Export" onClick={exportCsv} /> : null}
      />
      <div className="flex flex-auto flex-col gap-[18px] bg-[#FDFCFB] px-7 pb-10 pt-[22px] max-[859px]:gap-3.5 max-[859px]:px-3.5 max-[859px]:pb-[84px] max-[859px]:pt-4">{body()}</div>
      <ScheduleToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
