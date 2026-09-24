import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PermissionDenied } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { useDefaultBranchId } from '../../auth/useDefaultBranchId.js';
import { useDismiss } from '../../lib/useDismiss.js';
import { useRpcQuery } from '../../lib/useRpc.js';
import type { Branch, Department, Employee, Member, Schedule, Shift, ShiftAssignment } from '../../types/domain.js';
import { OverviewEmpty, OverviewHeader, OverviewLoading } from '../dashboard/manager/ManagerOverview.js';
import { useNow } from '../dashboard/manager/useManagerOverview.js';
import { ScheduleIcon } from '../scheduling/grid/ScheduleIcon.js';
import { ScheduleToast, useRouteToast, useScheduleToast } from '../scheduling/grid/ScheduleToast.js';
import { EMPLOYMENT_TYPE_OPTIONS } from './profile/employeeFields.js';
import { avatarTone, initialsOf, TONES, todayDateString, type Tone } from '../scheduling/grid/scheduleFormat.js';
import {
  applyFilters,
  buildRows,
  departmentBreakdown,
  directoryStats,
  donutGradient,
  NO_FILTERS,
  PAGE_SIZE,
  pageWindow,
  showingLabel,
  STATUS_LABEL,
  STATUS_OPTIONS,
  STATUS_TONE,
  tabCounts,
  UNASSIGNED,
  type DirectoryFilters,
  type DirectoryRow,
  type StatusFilter
} from './directory/directoryModel.js';

/*
 * WEB-005 — Employees, rebuilt to the design handoff (`ShiftOS
 * Dashboards.dc.html`, "EMPLOYEES DIRECTORY", lines 1596-1712, and
 * PAGES["Manager/Employees"]). Markup and sizes are the prototype's rendered
 * ones (13px base, `line-height: normal`, the browser's checkbox margins);
 * every number and row comes from the Manager's own branch.
 */

const card = 'rounded-[16px] border border-solid border-[#EBE7E3] bg-white';
// The prototype leaves checkboxes at the browser's default 3px 3px 3px 4px margins; row heights depend on it.
const checkbox = 'm-[3px_3px_3px_4px] size-[15px] cursor-pointer accent-[#F04E17]';
const GRID = 'grid grid-cols-[34px_minmax(0,1.3fr)_132px_minmax(0,1fr)_96px_minmax(0,1.1fr)_108px_40px] gap-2.5';

const toneStyle = (tone: Tone): React.CSSProperties => ({ color: TONES[tone][0], backgroundColor: TONES[tone][1] });

function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }): React.ReactElement {
  return (
    <span className="inline-flex items-center gap-[5px] rounded-full px-2.5 py-1 text-[11px] font-bold" style={toneStyle(tone)}>
      {children}
    </span>
  );
}

/** Handoff filter field: a label over a 40px select-looking button, opening its options below. */
function FilterSelect({
  label,
  value,
  options,
  note,
  onChange,
  buttonRef
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  note?: string;
  onChange: (value: string) => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const current = options.find((option) => option.value === value) ?? options[0];
  return (
    <div ref={ref} className="relative block">
      <span className="mb-[5px] block text-[11.5px] font-bold text-[#857A72]">{label}</span>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((isOpen) => !isOpen)}
        className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-[10px] border border-solid border-[#E4DED9] bg-white px-3 text-[12.5px] font-semibold text-[#38312B] hover:border-[#DDD6D0]"
      >
        <span className="flex-auto truncate text-left">{current?.label}</span>
        <span className="text-[#A79C93]">⌄</span>
      </button>
      {open ? (
        <div role="listbox" aria-label={label} className="absolute inset-x-0 top-[calc(100%+4px)] z-30 rounded-[12px] border border-solid border-[#EBE7E3] bg-white p-1 shadow-[0_18px_40px_-20px_rgba(56,49,43,.35)]">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={[
                'flex w-full cursor-pointer rounded-[8px] border-0 px-2.5 py-2 text-left text-[12.5px]',
                option.value === value ? 'bg-[#FDF0E9] font-bold text-[#C6420E]' : 'bg-transparent font-semibold text-[#38312B] hover:bg-[#F7F4F1]'
              ].join(' ')}
            >
              {option.label}
            </button>
          ))}
          {note ? <p className="m-0 px-2.5 pb-1.5 pt-1 text-[11px] leading-[1.45] text-[#A79C93]">{note}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function RowMenu({ row, onOpen, onEdit, canEdit }: { row: DirectoryRow; onOpen: () => void; onEdit: () => void; canEdit: boolean }): React.ReactElement {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative justify-self-end">
      <button
        type="button"
        aria-label={`${row.name} options`}
        aria-expanded={open}
        onClick={() => setOpen((isOpen) => !isOpen)}
        className="size-[26px] cursor-pointer rounded-[8px] border-0 bg-transparent text-[14px] font-extrabold text-[#A79C93] hover:bg-[#F7F4F1]"
      >
        ⋮
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-[calc(100%+4px)] z-30 w-[164px] rounded-[12px] border border-solid border-[#EBE7E3] bg-white p-1 shadow-[0_18px_40px_-20px_rgba(56,49,43,.35)]">
          <button type="button" role="menuitem" onClick={onOpen} className="flex w-full cursor-pointer rounded-[8px] border-0 bg-transparent px-2.5 py-2 text-left text-[12.5px] font-semibold text-[#38312B] hover:bg-[#F7F4F1]">
            View profile
          </button>
          {canEdit ? (
            <button type="button" role="menuitem" onClick={onEdit} className="flex w-full cursor-pointer rounded-[8px] border-0 bg-transparent px-2.5 py-2 text-left text-[12.5px] font-semibold text-[#38312B] hover:bg-[#F7F4F1]">
              Edit details
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** People on a published shift today in this branch (handoff "On Shift Today"). */
function useOnShiftToday(branchId: string, now: Date, enabled: boolean): number {
  const today = todayDateString(now);
  const { data: schedules } = useRpcQuery<Schedule[]>('list_schedules', branchId ? { branchId } : undefined, { enabled: enabled && Boolean(branchId) });
  const todays = (schedules ?? []).find((s) => s.status === 'published' && !s.deleted_at && s.start_date <= today && s.end_date >= today);
  const input = todays ? { scheduleId: todays.id } : undefined;
  const { data: shifts } = useRpcQuery<Shift[]>('list_shifts_for_schedule', input, { enabled: enabled && Boolean(todays) });
  const { data: assignments } = useRpcQuery<ShiftAssignment[]>('list_assignments_for_schedule', input, { enabled: enabled && Boolean(todays) });
  return useMemo(() => {
    const todayShiftIds = new Set(
      (shifts ?? []).filter((s) => s.shift_date === today && s.is_active && !s.deleted_at && s.status !== 'cancelled' && s.status !== 'archived').map((s) => s.id)
    );
    const people = new Set(
      (assignments ?? [])
        .filter((a) => !a.deleted_at && todayShiftIds.has(a.shift_id) && ['assigned', 'confirmed', 'completed'].includes(a.assignment_status))
        .map((a) => a.employee_id)
    );
    return people.size;
  }, [shifts, assignments, today]);
}

export default function EmployeeDirectoryPage(): React.ReactElement {
  const { hasPermission } = useSession();
  const navigate = useNavigate();
  const now = useNow();
  const { toast, show, dismiss } = useScheduleToast();
  useRouteToast(show);
  const canRead = hasPermission('employees.read');
  const canCreate = hasPermission('employees.create');
  const canUpdate = hasPermission('employees.update');

  // The Manager's own branch — the directory never lists another branch's people.
  const branchId = useDefaultBranchId() ?? '';
  const scoped = branchId ? { branchId } : undefined;
  const { data: branches } = useRpcQuery<Branch[]>('list_branches', undefined, { enabled: hasPermission('branches.read') });
  const employeesQuery = useRpcQuery<Employee[]>('list_employees', scoped, { enabled: canRead && Boolean(branchId) });
  const { data: departments } = useRpcQuery<Department[]>('list_departments', scoped, { enabled: Boolean(branchId) && hasPermission('departments.read') });
  const { data: members } = useRpcQuery<Member[]>('list_members', undefined, { enabled: hasPermission('org.members.manage') });
  const onShiftToday = useOnShiftToday(branchId, now, canRead && hasPermission('schedules.read'));

  const branchName = (branches ?? []).find((b) => b.id === branchId)?.name ?? 'your branch';
  const rows = useMemo(() => buildRows(employeesQuery.data ?? [], departments ?? [], members ?? []), [employeesQuery.data, departments, members]);

  const [toolbarQuery, setToolbarQuery] = useState('');
  const [draft, setDraft] = useState<DirectoryFilters>(NO_FILTERS);
  const [filters, setFilters] = useState<DirectoryFilters>(NO_FILTERS);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const firstFilterRef = useRef<HTMLButtonElement>(null);
  const filtersPanelRef = useRef<HTMLElement>(null);

  const filtered = useMemo(() => applyFilters(rows, filters, toolbarQuery), [rows, filters, toolbarQuery]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const counts = tabCounts(rows);
  const stats = directoryStats(rows, onShiftToday, branchName);
  const breakdown = departmentBreakdown(rows);

  const departmentOptions = [
    { value: 'all', label: 'All Departments' },
    ...[...new Set(rows.map((r) => r.department).filter((name) => name !== UNASSIGNED))].sort().map((name) => ({ value: name, label: name })),
    ...(rows.some((r) => r.department === UNASSIGNED) ? [{ value: UNASSIGNED, label: UNASSIGNED }] : [])
  ];
  const roleOptions = [{ value: 'all', label: 'All Roles' }, ...[...new Set(rows.map((r) => r.role))].sort().map((role) => ({ value: role, label: role }))];

  const setStatusTab = (status: StatusFilter): void => {
    setFilters((current) => ({ ...current, status }));
    setDraft((current) => ({ ...current, status }));
    setPage(1);
  };

  const pageAllSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.employee.id));
  const pageSomeSelected = pageRows.some((r) => selected.has(r.employee.id));
  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = pageSomeSelected && !pageAllSelected;
  }, [pageSomeSelected, pageAllSelected]);

  if (!canRead) {
    return (
      <div className="px-7 py-6">
        <PermissionDenied />
      </div>
    );
  }

  const headerActions = canCreate ? (
    <>
      <button
        type="button"
        onClick={() => navigate('/employees/import')}
        className="h-10 cursor-pointer rounded-[11px] border border-solid border-[#EBE7E3] bg-white px-4 text-[13px] font-bold text-black hover:border-[#DDD6D0]"
      >
        Import
      </button>
      <button
        type="button"
        onClick={() => navigate('/employees/new')}
        className="h-10 cursor-pointer rounded-[11px] border-0 bg-[#F04E17] px-4 text-[13px] font-bold text-white shadow-[0_10px_22px_-13px_rgba(240,78,23,.75)]"
      >
        + Add Employee
      </button>
    </>
  ) : null;

  const loading = !branchId || employeesQuery.isLoading;

  return (
    // 13px base and the browser's default line height are what the handoff renders with (it has no CSS reset).
    <div className="flex min-h-full flex-col text-[13px] text-[#38312B] [line-height:normal]">
      <OverviewHeader title="Employees" subtitle={`View and manage everyone in ${branchName}.`} now={now} actions={rows.length ? headerActions : null} />

      <div className="flex flex-auto flex-col gap-[18px] bg-[#FDFCFB] px-7 pb-10 pt-[22px] max-[859px]:gap-3.5 max-[859px]:px-3.5 max-[859px]:pb-[84px] max-[859px]:pt-4">
        {loading ? (
          <OverviewLoading title="Employees" />
        ) : employeesQuery.error ? (
          <OverviewEmpty
            title="Employees couldn't load"
            body={(employeesQuery.error as Error).message}
            cta={{ label: 'Try again', onClick: () => void employeesQuery.refetch() }}
            secondary={null}
          />
        ) : rows.length === 0 ? (
          <OverviewEmpty
            title="No employees yet"
            body="Add your team one at a time, or import a spreadsheet — we validate each row before anything is saved."
            cta={canCreate ? { label: 'Add employee', onClick: () => navigate('/employees/new') } : null}
            secondary={canCreate ? { label: 'Import CSV', onClick: () => navigate('/employees/import') } : null}
          />
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)_244px] items-start gap-4 max-[859px]:grid-cols-1">
            <div className="flex min-w-0 flex-col gap-4">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3.5">
                {stats.map((stat) => (
                  <div key={stat.label} className={`${card} p-4`}>
                    <div className="flex items-center gap-[11px]">
                      <span className="flex size-[34px] flex-none items-center justify-center rounded-[11px]" style={toneStyle(stat.tone)}>
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
                <div className="flex flex-wrap items-center gap-2.5 px-[18px] pt-1">
                  <div className="flex flex-[1_1_300px] flex-wrap gap-1">
                    {(
                      [
                        ['all', `All Employees (${counts.all})`],
                        ['active', `Active (${counts.active})`],
                        ['on_leave', `On Leave (${counts.on_leave})`],
                        ['inactive', `Inactive (${counts.inactive})`]
                      ] as const
                    ).map(([status, label]) => (
                      <button
                        key={status}
                        type="button"
                        aria-pressed={filters.status === status}
                        onClick={() => setStatusTab(status)}
                        className={[
                          'cursor-pointer rounded-[9px] border-0 px-[11px] py-1.5 text-[11.5px] font-bold',
                          filters.status === status ? 'bg-white text-[#38312B] shadow-[0_1px_2px_rgba(56,49,43,.12)]' : 'bg-transparent text-[#A79C93] hover:text-[#857A72]'
                        ].join(' ')}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <label className="my-2.5 min-w-[150px] flex-[0_1_210px]">
                    <span className="sr-only">Search employees</span>
                    <input
                      type="search"
                      value={toolbarQuery}
                      onChange={(event) => {
                        setToolbarQuery(event.target.value);
                        setPage(1);
                      }}
                      placeholder="Search employees..."
                      className="box-border h-[38px] w-full rounded-[10px] border border-solid border-[#E4DED9] px-3 text-[12.5px] outline-none focus:border-[#F04E17]"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      filtersPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                      firstFilterRef.current?.focus();
                    }}
                    className="my-2.5 flex h-[38px] cursor-pointer items-center gap-[7px] rounded-[10px] border border-solid border-[#E4DED9] bg-white px-[13px] text-[12.5px] font-bold text-black"
                  >
                    Filter <span className="text-[#A79C93]">⌄</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <div className="min-w-[860px]">
                    <div className={`${GRID} border-b border-solid border-[#F2EEEA] px-[18px] py-[11px] text-[10px] font-extrabold uppercase tracking-[.08em] text-[#A79C93]`}>
                      <span>
                        <input
                          ref={selectAllRef}
                          type="checkbox"
                          aria-label="Select all employees"
                          checked={pageAllSelected}
                          onChange={() =>
                            setSelected((current) => {
                              const next = new Set(current);
                              for (const row of pageRows) {
                                if (pageAllSelected) next.delete(row.employee.id);
                                else next.add(row.employee.id);
                              }
                              return next;
                            })
                          }
                          className={checkbox}
                        />
                      </span>
                      <span>Employee</span>
                      <span>Role</span>
                      <span>Department</span>
                      <span>Status</span>
                      <span>Phone</span>
                      <span>Date Added</span>
                      <span className="text-right">Actions</span>
                    </div>
                    {pageRows.length === 0 ? (
                      <p className="m-0 border-b border-solid border-[#F7F4F1] px-[18px] py-[18px] text-[12.5px] text-[#A79C93]">No employees match these filters.</p>
                    ) : (
                      pageRows.map((row) => (
                        <div key={row.employee.id} className={`${GRID} items-center border-b border-solid border-[#F7F4F1] px-[18px] py-[11px]`}>
                          <span>
                            <input
                              type="checkbox"
                              aria-label={`Select ${row.name}`}
                              checked={selected.has(row.employee.id)}
                              onChange={() =>
                                setSelected((current) => {
                                  const next = new Set(current);
                                  if (next.has(row.employee.id)) next.delete(row.employee.id);
                                  else next.add(row.employee.id);
                                  return next;
                                })
                              }
                              className={checkbox}
                            />
                          </span>
                          <button
                            type="button"
                            onClick={() => navigate(`/employees/${row.employee.id}`)}
                            className="flex min-w-0 cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 text-left"
                          >
                            <span className="flex size-[30px] flex-none items-center justify-center rounded-full text-[10.5px] font-extrabold" style={avatarTone(row.name)}>
                              {initialsOf(row.name)}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-[12.5px] font-bold text-[#38312B]">{row.name}</span>
                              <span className="block text-[11px] text-[#A79C93]">{row.number}</span>
                            </span>
                          </button>
                          <span className="min-w-0">
                            <Pill tone={row.roleTone}>{row.role}</Pill>
                          </span>
                          <span className="min-w-0 truncate text-[12.5px] text-[#57504A]">{row.department}</span>
                          <span className="min-w-0">
                            <Pill tone={STATUS_TONE[row.status]}>
                              <span className="size-[9px] flex-none rounded-[3px]" style={{ background: TONES[STATUS_TONE[row.status]][0] }} />
                              {STATUS_LABEL[row.status]}
                            </Pill>
                          </span>
                          <span className="min-w-0 truncate text-[12px] text-[#57504A]">{row.phone}</span>
                          <span className="min-w-0 text-[12px] text-[#857A72]">{row.added}</span>
                          <RowMenu
                            row={row}
                            canEdit={canUpdate}
                            onOpen={() => navigate(`/employees/${row.employee.id}`)}
                            onEdit={() => navigate(`/employees/${row.employee.id}`)}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 px-[18px] py-[13px]">
                  <p className="m-0 text-[11.5px] text-[#A79C93]">
                    {showingLabel(currentPage, filtered.length)}
                    {selected.size ? ` · ${selected.size} selected` : ''}
                  </p>
                  <span className="ml-auto flex gap-[5px]">
                    {pageWindow(currentPage, pageCount).map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-label={`Page ${n}`}
                        aria-current={n === currentPage ? 'page' : undefined}
                        onClick={() => setPage(n)}
                        className={[
                          'size-8 cursor-pointer rounded-[9px] border border-solid text-[12px]',
                          n === currentPage ? 'border-[#F04E17] bg-[#FDF0E9] font-extrabold text-[#C6420E]' : 'border-[#EBE7E3] bg-white font-bold text-[#857A72]'
                        ].join(' ')}
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      type="button"
                      aria-label="Next page"
                      disabled={currentPage >= pageCount}
                      onClick={() => setPage(currentPage + 1)}
                      className="size-8 cursor-pointer rounded-[9px] border border-solid border-[#EBE7E3] bg-white text-[12px] font-bold text-[#857A72] disabled:cursor-default disabled:opacity-50"
                    >
                      →
                    </button>
                  </span>
                </div>
              </section>
            </div>

            <div className="flex min-w-0 flex-col gap-4">
              <section ref={filtersPanelRef} className={`${card} p-4`}>
                <div className="flex items-center gap-2.5">
                  <h2 className="m-0 text-[14px] font-extrabold tracking-normal">Filters</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(NO_FILTERS);
                      setFilters(NO_FILTERS);
                      setToolbarQuery('');
                      setPage(1);
                      show('Filters cleared');
                    }}
                    className="ml-auto cursor-pointer border-0 bg-transparent p-0 text-[11.5px] font-bold text-[#F04E17]"
                  >
                    Clear all
                  </button>
                </div>
                <div className="mt-3 flex flex-col gap-3">
                  <FilterSelect
                    label="Status"
                    value={draft.status}
                    options={STATUS_OPTIONS}
                    onChange={(value) => setDraft((current) => ({ ...current, status: value as StatusFilter }))}
                    buttonRef={firstFilterRef}
                  />
                  <FilterSelect label="Department" value={draft.department} options={departmentOptions} onChange={(value) => setDraft((current) => ({ ...current, department: value }))} />
                  <FilterSelect label="Role" value={draft.role} options={roleOptions} onChange={(value) => setDraft((current) => ({ ...current, role: value }))} />
                  <FilterSelect
                    label="Employment Type"
                    value={draft.employmentType}
                    options={[{ value: 'all', label: 'All Types' }, ...EMPLOYMENT_TYPE_OPTIONS]}
                    onChange={(value) => setDraft((current) => ({ ...current, employmentType: value }))}
                  />
                  <label className="block">
                    <span className="mb-[5px] block text-[11.5px] font-bold text-[#857A72]">Search by Name or ID</span>
                    <input
                      type="text"
                      value={draft.query}
                      onChange={(event) => setDraft((current) => ({ ...current, query: event.target.value }))}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          setFilters(draft);
                          setPage(1);
                        }
                      }}
                      placeholder="Enter name or ID..."
                      className="box-border h-10 w-full rounded-[10px] border border-solid border-[#E4DED9] px-3 text-[12.5px] outline-none focus:border-[#F04E17]"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setFilters(draft);
                      setPage(1);
                      const shown = applyFilters(rows, draft, toolbarQuery).length;
                      show(`Filters applied · ${shown} employee${shown === 1 ? '' : 's'}`);
                    }}
                    className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border-0 bg-[#FDF0E9] text-[12.5px] font-extrabold text-[#C6420E]"
                  >
                    ▼ Apply Filters
                  </button>
                </div>
              </section>

              <section className={`${card} p-4`}>
                <h2 className="mb-3.5 mt-0 text-[14px] font-extrabold tracking-normal">Department Breakdown</h2>
                <div className="flex items-center gap-3.5">
                  <span className="relative size-[82px] flex-none">
                    <span className="absolute inset-0 rounded-full" style={{ background: donutGradient(breakdown) }} />
                    <span className="absolute inset-[19px] flex flex-col items-center justify-center rounded-full bg-white">
                      <span className="text-[16px] font-extrabold leading-none">{rows.length}</span>
                      <span className="text-[9px] text-[#A79C93]">Total</span>
                    </span>
                  </span>
                  <ul className="m-0 flex min-w-0 flex-auto list-none flex-col gap-1.5 p-0">
                    {breakdown.map((slice) => (
                      <li key={slice.name} className="flex min-w-0 items-center gap-[7px] text-[10.5px]">
                        <span className="size-[9px] flex-none rounded-[3px]" style={{ background: slice.color }} />
                        <span className="min-w-0 flex-auto truncate text-[#57504A]">{slice.name}</span>
                        <span className="flex-none font-bold text-[#38312B]">
                          {slice.count} ({slice.pct}%)
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/reports')}
                  className="mt-3.5 flex w-full cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-[11.5px] font-bold text-[#F04E17]"
                >
                  View Full Report <span className="ml-auto">›</span>
                </button>
              </section>
            </div>
          </div>
        )}
      </div>
      <ScheduleToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
