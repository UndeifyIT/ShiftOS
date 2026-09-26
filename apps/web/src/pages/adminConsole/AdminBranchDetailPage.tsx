import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSession } from '../../auth/SessionProvider.js';
import { currentTime } from '../../lib/clock.js';
import { useRpcQueries, useRpcQuery } from '../../lib/useRpc.js';
import type { Announcement, AnnouncementAcknowledgement, Department, Employee, LeaveRequest, ShiftSwap, Task } from '../../types/domain.js';
import { buildCards } from '../announcements/announcementsModel.js';
import { applyFilter, buildLeaveViews, buildSwapViews, REQUEST_FILTERS, REQUEST_TABS, type RequestFilter, type RequestTab, type SwapStep } from '../requests/requestsModel.js';
import { addDays, fullName, initialsOf, todayDateString, TONES, weekDays, weekStartOf, weekRangeLabel, isoWeekNumber, type Tone } from '../scheduling/grid/scheduleFormat.js';
import { buildBoard, onTodaysBoard } from '../tasks/tasksBoardModel.js';
import { AdminIcon, type AdminIconName } from './AdminIcon.js';
import { AdminPage } from './AdminShell.js';
import { AdminLoading, card, Pill, Segmented } from './adminUi.js';
import { STATUS_TONE, type BranchSummary, type Leader } from './adminModel.js';
import { useAdminOrg } from './useAdminOrg.js';
import { useBranchWeek } from './useBranchWeek.js';

/*
 * The Admin console's Branch Detail, built to the design handoff
 * (`ShiftOS Admin.dc.html`, "BRANCH DETAIL" markup lines 297-724): the branch
 * card, what needs attention, and seven read-only tabs — Leadership, Employees,
 * Schedule, Tasks, Announcements, Attendance and Requests — every one over the
 * branch's real data. Nothing here changes anything: Admins oversee, Managers
 * and Supervisors run the day.
 */

const BRANCH_TABS = ['Leadership', 'Employees', 'Schedule', 'Tasks', 'Announcements', 'Attendance', 'Requests'] as const;
type BranchTab = (typeof BRANCH_TABS)[number];

/** Handoff avatarStyle(): a grey disc with initials at 36% of its size. */
function Avatar({ name, size }: { name: string; size: number }): React.ReactElement {
  return (
    <span
      className="flex flex-none items-center justify-center rounded-full bg-[#F1EDEA] font-extrabold text-[#57504A]"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initialsOf(name)}
    </span>
  );
}

function ReadOnlyPill(): React.ReactElement {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1EDEA] px-[11px] py-[5px] text-[11px] font-bold text-[#57504A]">
      <AdminIcon name="lock" size={10} />
      Read-only
    </span>
  );
}

function PersonCard({ person }: { person: Leader }): React.ReactElement {
  return (
    <div className="flex items-center gap-[11px] rounded-[13px] border border-solid border-[#F2EEEA] bg-[#FDFCFB] px-[13px] py-3">
      <Avatar name={person.name} size={38} />
      <span className="min-w-0 flex-auto">
        <span className="block text-[12.5px] font-bold">{person.name}</span>
        <span className="block text-[11px] text-[#A79C93]">{person.role}</span>
        <span className="mt-[3px] block truncate text-[11px] text-[#857A72]">{person.email}</span>
      </span>
    </div>
  );
}

function EmptyBox({ title, body }: { title: string; body: string }): React.ReactElement {
  return (
    <div className="rounded-[13px] border border-dashed border-[#E4DED9] p-4 text-center">
      <p className="m-0 text-[12.5px] font-bold">{title}</p>
      <p className="mb-0 mt-1 text-[11.5px] text-[#857A72]">{body}</p>
    </div>
  );
}

function LeadershipTab({ branch }: { branch: BranchSummary }): React.ReactElement {
  const label = 'mb-[9px] mt-0 text-[11px] font-extrabold uppercase tracking-[.06em] text-[#A79C93]';
  const grid = 'grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-2.5';
  return (
    <section className={`${card} p-5`}>
      <h2 className="mb-1 mt-0 text-[14.5px] font-extrabold tracking-normal">Branch Leadership</h2>
      <p className="mb-3.5 mt-0 text-[12px] text-[#857A72]">Managers and supervisors responsible for this branch.</p>
      <p className={label}>Branch Managers</p>
      {branch.managers.length === 0 ? (
        <div className="mb-4">
          <EmptyBox title="No managers assigned" body="This branch currently has no assigned branch manager." />
        </div>
      ) : (
        <div className={`${grid} mb-4`}>
          {branch.managers.map((p) => (
            <PersonCard key={p.id} person={p} />
          ))}
        </div>
      )}
      <p className={label}>Supervisors</p>
      {branch.supervisors.length === 0 ? (
        <EmptyBox title="No supervisors assigned" body="Supervisors assigned to this branch will appear here." />
      ) : (
        <div className={grid}>
          {branch.supervisors.map((p) => (
            <PersonCard key={p.id} person={p} />
          ))}
        </div>
      )}
    </section>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const addedOn = (date: string): string => `${MONTHS[Number(date.slice(5, 7)) - 1]} ${Number(date.slice(8, 10))}, ${date.slice(0, 4)}`;
const DONUT = ['#7C3AED', '#2563EB', '#2E9E62', '#E8A33D', '#EC4899', '#0EA5E9', '#DDD6D0'];
const STATUS_LABEL: Record<string, [string, Tone]> = { active: ['Active', 'ok'], on_leave: ['On Leave', 'info'], inactive: ['Inactive', 'neutral'], terminated: ['Terminated', 'bad'] };
type EmpTab = 'All' | 'Active' | 'On Leave' | 'Inactive';

function EmployeesTab({ branch, employees, departments, onShiftToday }: { branch: BranchSummary; employees: Employee[]; departments: Department[]; onShiftToday: number }): React.ReactElement {
  const { members } = useAdminOrg();
  const [tab, setTab] = useState<EmpTab>('All');
  const [query, setQuery] = useState('');
  const [dept, setDept] = useState('');
  const [role, setRole] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const deptName = new Map(departments.map((d) => [d.id, d.name]));
  const memberByEmail = new Map(members.filter((m) => m.user_email).map((m) => [m.user_email.toLowerCase(), m]));
  const roleOf = (e: Employee): [string, Tone] => {
    const m = e.email ? memberByEmail.get(e.email.toLowerCase()) : undefined;
    if (!m) return ['Staff', 'ok'];
    if (m.role_org_wide) return ['Manager', 'violet'];
    if (/supervisor/i.test(m.role_name)) return ['Supervisor', 'primary'];
    if (/admin/i.test(m.role_name)) return ['Admin', 'info'];
    return ['Staff', 'ok'];
  };
  const rows = employees.map((e) => ({ e, role: roleOf(e), dept: (e.department_id && deptName.get(e.department_id)) || 'Unassigned', status: STATUS_LABEL[e.employment_status] ?? ['Active', 'ok'] }));
  const count = (s: string): number => rows.filter((r) => r.e.employment_status === s).length;
  const tabs: Array<[EmpTab, number]> = [
    ['All', rows.length],
    ['Active', count('active')],
    ['On Leave', count('on_leave')],
    ['Inactive', count('inactive')]
  ];
  const needle = query.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (tab === 'All' || r.status[0] === tab) &&
      (!dept || r.dept === dept) &&
      (!role || r.role[0] === role) &&
      (!type || (r.e.employment_type ?? '') === type) &&
      (!needle || `${fullName(r.e)} ${r.e.employee_number} ${r.dept}`.toLowerCase().includes(needle))
  );
  const pages = Math.max(1, Math.ceil(shown.length / 8));
  const current = Math.min(page, pages);
  const visible = shown.slice((current - 1) * 8, current * 8);
  const pct = (n: number): string => `${rows.length ? Math.round((n / rows.length) * 100) : 0}% of total`;
  const stats: Array<{ label: string; value: number; meta: string; icon: AdminIconName; tone: Tone }> = [
    { label: 'Total Employees', value: rows.length, meta: branch.name, icon: 'users', tone: 'primary' },
    { label: 'Active', value: count('active'), meta: pct(count('active')), icon: 'checkCircle', tone: 'ok' },
    { label: 'On Shift Today', value: onShiftToday, meta: pct(onShiftToday), icon: 'user', tone: 'info' },
    { label: 'On Leave', value: count('on_leave'), meta: pct(count('on_leave')), icon: 'calendar', tone: 'violet' }
  ];
  const deptCounts = [...rows.reduce((map, r) => map.set(r.dept, (map.get(r.dept) ?? 0) + 1), new Map<string, number>())].sort((a, b) => (a[0] === 'Unassigned' ? 1 : b[0] === 'Unassigned' ? -1 : b[1] - a[1]));
  let acc = 0;
  const stops = deptCounts
    .map(([, n], i) => {
      const start = acc;
      acc += rows.length ? (n / rows.length) * 100 : 0;
      return `${DONUT[i % DONUT.length]} ${start}% ${acc}%`;
    })
    .join(', ');
  const select = 'box-border h-10 w-full cursor-pointer appearance-none rounded-[10px] border border-solid border-[#E4DED9] bg-white px-3 text-[12.5px] font-semibold text-[#38312B] outline-none handoff-select';
  const types = [...new Set(employees.map((e) => e.employment_type).filter((t): t is string => Boolean(t)))];
  const typeLabel = (t: string): string => t.replace('_', '-').replace(/^./, (c) => c.toUpperCase());
  const grid = 'grid grid-cols-[minmax(0,1.3fr)_132px_minmax(0,1fr)_108px_minmax(0,1fr)_108px] gap-2.5';

  return (
    // 244px + its 16px padding and 1px border each side: the prototype's content-box aside cards.
    <div className="grid grid-cols-[minmax(0,1fr)_278px] items-start gap-4 max-[1100px]:grid-cols-1">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5">
          {stats.map((s) => (
            <div key={s.label} className={`${card} p-4`}>
              <div className="flex items-center gap-[11px]">
                <span className="flex size-8 flex-none items-center justify-center rounded-[10px]" style={{ color: TONES[s.tone][0], backgroundColor: TONES[s.tone][1] }}>
                  <AdminIcon name={s.icon} size={15} />
                </span>
                <p className="m-0 text-[12px] font-bold text-[#857A72]">{s.label}</p>
              </div>
              <p className="mb-0 mt-[11px] text-[26px] font-extrabold leading-none tracking-[-0.03em]">{s.value}</p>
              <p className="mb-0 mt-[5px] text-[11.5px] text-[#A79C93]">{s.meta}</p>
            </div>
          ))}
        </div>
        <section className={card}>
          <div className="flex flex-wrap items-center gap-2.5 px-[18px] pb-0 pt-1">
            <div className="flex flex-[1_1_260px] flex-wrap gap-1 py-[13px]">
              <Segmented
                options={tabs.map(([t]) => t)}
                value={tab}
                onChange={(t) => {
                  setTab(t);
                  setPage(1);
                }}
                label={(t) => `${t === 'All' ? 'All Employees' : t} (${tabs.find(([x]) => x === t)?.[1] ?? 0})`}
              />
            </div>
            <label className="my-2.5 min-w-[140px] flex-[0_1_200px]">
              <span className="sr-only">Search employees</span>
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search employees…"
                className="box-border h-[38px] w-full rounded-[10px] border border-solid border-[#E4DED9] px-3 text-[12.5px] outline-none placeholder:text-[#757575] focus:border-[#F04E17]"
              />
            </label>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className={`${grid} border-0 border-b border-solid border-[#F2EEEA] px-[18px] py-[11px] text-[10px] font-extrabold uppercase tracking-[.08em] text-[#A79C93]`}>
                <span>Employee</span>
                <span>Role</span>
                <span>Department</span>
                <span>Status</span>
                <span>Phone</span>
                <span>Date Added</span>
              </div>
              {visible.map((r) => (
                <div key={r.e.id} className={`${grid} items-center border-0 border-b border-solid border-[#F7F4F1] px-[18px] py-[11px]`}>
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={fullName(r.e)} size={32} />
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] font-bold text-[#38312B]">{fullName(r.e)}</span>
                      <span className="block text-[11px] text-[#A79C93]">{r.e.employee_number}</span>
                    </span>
                  </span>
                  <span className="min-w-0">
                    <Pill tone={r.role[1]}>{r.role[0]}</Pill>
                  </span>
                  <span className="min-w-0 truncate text-[12.5px] text-[#57504A]">{r.dept}</span>
                  <span className="min-w-0">
                    <Pill tone={r.status[1]} className="gap-1.5">
                      <span className="size-1.5 rounded-full" style={{ backgroundColor: TONES[r.status[1]][0] }} />
                      {r.status[0]}
                    </Pill>
                  </span>
                  <span className="min-w-0 truncate text-[12px] text-[#57504A]">{r.e.phone || '—'}</span>
                  <span className="min-w-0 text-[12px] text-[#857A72]">{addedOn(r.e.hire_date)}</span>
                </div>
              ))}
              {visible.length === 0 ? <p className="m-0 px-[18px] py-6 text-center text-[12.5px] text-[#A79C93]">Nobody matches this filter.</p> : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 px-[18px] py-[13px]">
            <p className="m-0 text-[11.5px] text-[#A79C93]">
              Showing {shown.length ? (current - 1) * 8 + 1 : 0} to {Math.min(current * 8, shown.length)} of {shown.length} employees
            </p>
            <span className="ml-auto flex gap-[5px]">
              {[...Array.from({ length: pages }, (_, i) => String(i + 1)), '→'].map((label) => {
                const n = label === '→' ? Math.min(pages, current + 1) : Number(label);
                const on = label !== '→' && n === current;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setPage(n)}
                    className={`inline-flex size-8 cursor-pointer items-center justify-center rounded-[9px] border border-solid p-0 text-[12px] font-bold [line-height:normal] ${on ? 'border-[#F04E17] bg-[#FDF0E9] text-[#C6420E]' : 'border-[#EBE7E3] bg-white text-[#857A72]'}`}
                  >
                    {label}
                  </button>
                );
              })}
            </span>
          </div>
        </section>
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <section className={`${card} p-4`}>
          <h2 className="m-0 text-[14px] font-extrabold tracking-normal">Filters</h2>
          <div className="mt-3 flex flex-col gap-3">
            {(
              [
                ['Status', tab === 'All' ? '' : tab, (v: string) => setTab((v || 'All') as EmpTab), ['Active', 'On Leave', 'Inactive'], 'All Statuses'],
                ['Department', dept, setDept, deptCounts.map(([d]) => d), 'All Departments'],
                ['Role', role, setRole, ['Manager', 'Supervisor', 'Admin', 'Staff'], 'All Roles'],
                ['Employment Type', type, setType, types, 'All Types']
              ] as Array<[string, string, (v: string) => void, string[], string]>
            ).map(([label, value, onChange, options, all]) => (
              <label key={label} className="block">
                <span className="mb-[5px] block text-[11.5px] font-bold text-[#857A72]">{label}</span>
                <select
                  className={select}
                  value={value}
                  onChange={(e) => {
                    onChange(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">{all}</option>
                  {options.map((o) => (
                    <option key={o} value={o}>
                      {label === 'Employment Type' ? typeLabel(o) : o}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </section>
        <section className={`${card} p-4`}>
          <h2 className="mb-3.5 mt-0 text-[14px] font-extrabold tracking-normal">Department Breakdown</h2>
          <div className="flex items-center gap-3.5">
            <span className="relative size-[82px] flex-none">
              <span className="absolute inset-0 rounded-full" style={{ background: rows.length ? `conic-gradient(${stops})` : '#F2EEEA' }} />
              <span className="absolute inset-[19px] flex flex-col items-center justify-center rounded-full bg-white">
                <span className="text-[16px] font-extrabold leading-none">{rows.length}</span>
                <span className="text-[9px] text-[#A79C93]">Total</span>
              </span>
            </span>
            <ul className="m-0 flex min-w-0 flex-auto list-none flex-col gap-1.5 p-0">
              {deptCounts.map(([name, n], i) => (
                <li key={name} className="flex min-w-0 items-center gap-[7px] text-[10.5px]">
                  <span className="size-2 flex-none rounded-[2px]" style={{ backgroundColor: DONUT[i % DONUT.length] }} />
                  <span className="min-w-0 flex-auto truncate text-[#57504A]">{name}</span>
                  <span className="flex-none font-bold text-[#38312B]">{n}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

const KIND: Record<string, [string, string]> = { Morning: ['#F04E17', '#FDF0E9'], Afternoon: ['#2563EB', '#EFF4FE'], Night: ['#7C3AED', '#F3EEFE'] };
const kindOf = (start: string): string => {
  const h = Number(start.slice(0, 2));
  return h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Night';
};
const shortClock = (time: string): string => {
  const [h, m] = time.slice(0, 5).split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')}`;
};

function ScheduleTab({ week, weekStart, onWeek, employees }: { week: ReturnType<typeof useBranchWeek>; weekStart: string; onWeek: (start: string) => void; employees: Employee[] }): React.ReactElement {
  const days = weekDays(weekStart);
  const people = new Map(employees.map((e) => [e.id, e]));
  const shiftById = new Map(week.shifts.map((s) => [s.id, s]));
  const rows = [...new Set(week.assignments.map((a) => a.employee_id))]
    .map((id) => people.get(id))
    .filter((e): e is Employee => Boolean(e))
    .sort((a, b) => fullName(a).localeCompare(fullName(b)));
  const navButton = 'size-8 cursor-pointer rounded-[10px] border border-solid border-[#EBE7E3] bg-white p-0 text-[14px] text-[#857A72] [line-height:normal]';
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-[14px] border border-solid border-[#EBE7E3] bg-white p-[5px]">
          <button type="button" aria-label="Previous week" onClick={() => onWeek(addDays(weekStart, -7))} className={navButton}>
            ‹
          </button>
          <span className="flex items-center gap-[9px] px-3">
            <span className="leading-[1.25]">
              <span className="block text-[13.5px] font-extrabold">{weekRangeLabel(weekStart)}</span>
              <span className="block text-[11px] text-[#A79C93]">Week {isoWeekNumber(weekStart)}</span>
            </span>
          </span>
          <button type="button" aria-label="Next week" onClick={() => onWeek(addDays(weekStart, 7))} className={navButton}>
            ›
          </button>
        </div>
        <ReadOnlyPill />
      </div>
      <section className={card}>
        <div className="overflow-x-auto overflow-y-visible">
          <div className="min-w-[860px]">
            <div className="grid grid-cols-[184px_repeat(7,minmax(94px,1fr))] border-0 border-b border-solid border-[#F2EEEA]">
              <span className="px-4 py-[13px] text-[11px] font-extrabold tracking-[.02em] text-[#38312B]">Employee</span>
              {days.map((d) => (
                <span key={d.date} className="px-2 py-[11px] text-center leading-[1.3]">
                  <span className="block text-[11.5px] font-extrabold text-[#38312B]">{d.weekday}</span>
                  <span className="block text-[11px] text-[#A79C93]">{d.label}</span>
                </span>
              ))}
            </div>
            {rows.map((person) => (
              <div key={person.id} className="grid grid-cols-[184px_repeat(7,minmax(94px,1fr))] border-0 border-b border-solid border-[#F7F4F1]">
                <span className="flex min-w-0 items-center gap-2.5 py-2.5 pl-4 pr-3.5">
                  <Avatar name={fullName(person)} size={32} />
                  <span className="min-w-0 flex-auto">
                    <span className="block truncate text-[12.5px] font-bold">{fullName(person)}</span>
                    <span className="block text-[11px] text-[#A79C93]">{person.employee_number}</span>
                  </span>
                </span>
                {days.map((d) => {
                  const shift = week.assignments.map((a) => (a.employee_id === person.id ? shiftById.get(a.shift_id) : undefined)).find((s) => s?.shift_date === d.date);
                  const kind = shift ? kindOf(shift.start_time) : '';
                  return (
                    <div key={d.date} className="flex min-h-14 items-center justify-center px-1.5 py-2">
                      {shift ? (
                        <div className="w-full rounded-[9px] px-[7px] py-1.5 text-center" style={{ color: KIND[kind][0], backgroundColor: KIND[kind][1] }}>
                          <span className="block text-[11px] font-extrabold leading-[1.25]">{kind}</span>
                          <span className="block text-[9.5px] font-bold leading-[1.25] opacity-80">
                            {shortClock(shift.start_time)} – {shortClock(shift.end_time)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#C4BBB3]">Off</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            {rows.length === 0 ? (
              <p className="m-0 px-4 py-8 text-center text-[12.5px] text-[#A79C93]">{week.loading ? 'Loading the week…' : week.published ? 'Nobody is on a shift this week.' : 'No published schedule for this week.'}</p>
            ) : null}
          </div>
        </div>
      </section>
      <section className={`${card} flex flex-wrap items-center gap-x-5 gap-y-3.5 px-[18px] py-[13px]`}>
        <span className="flex flex-wrap gap-x-[18px] gap-y-2">
          {Object.entries(KIND).map(([label, [color]]) => (
            <span key={label} className="flex items-center gap-[7px] text-[11.5px] font-bold text-[#57504A]">
              <span className="size-[9px] rounded-[3px]" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </span>
      </section>
    </>
  );
}

function TasksTab({ tasks, employees, departments }: { tasks: Task[]; employees: Employee[]; departments: Department[] }): React.ReactElement {
  const now = currentTime();
  const columns = buildBoard({ tasks: tasks.filter((t) => onTodaysBoard(t, now)), employees, departments, now });
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] items-start gap-3.5">
      {columns.map((col) => (
        <section key={col.title} className={`${card} p-3.5`}>
          <div className="flex items-center gap-[9px]">
            <span className="size-[9px] flex-none rounded-[3px]" style={{ backgroundColor: col.dot }} />
            <h2 className="m-0 text-[13.5px] font-extrabold tracking-normal">{col.title}</h2>
            <span className="ml-auto text-[11px] font-extrabold text-[#A79C93]">{col.cards.length}</span>
          </div>
          <div className="mt-3 flex flex-col gap-[9px]">
            {col.cards.length === 0 ? <p className="m-0 rounded-[13px] border border-dashed border-[#E4DED9] px-3 py-[22px] text-center text-[12.5px] font-bold text-[#857A72]">Nothing here</p> : null}
            {col.cards.map((t) => (
              <article key={t.id} className="rounded-[13px] border border-solid border-[#F2EEEA] bg-[#FDFCFB] px-[13px] py-3">
                <div className="flex items-start gap-[9px]">
                  {t.done ? (
                    <span className="mt-px flex size-[17px] flex-none items-center justify-center rounded-full bg-[#2E9E62] text-[10px] font-extrabold text-white">✓</span>
                  ) : (
                    // 17px + its 1.5px border, which Chrome draws 1px wide, each side.
                    <span className="mt-px size-[19px] flex-none rounded-full border border-solid border-[#EBE7E3]" />
                  )}
                  <p className="m-0 flex-auto text-[12.5px] font-bold [text-wrap:pretty]">{t.title}</p>
                </div>
                <p className="mb-0 mt-2 text-[11.5px] text-[#857A72]">{t.meta}</p>
                <div className="mt-[9px] flex items-center gap-[7px]">
                  <Pill tone={t.tone}>{t.priority}</Pill>
                  <span className="text-[11px] text-[#A79C93]">{t.assignee}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function AnnouncementsTab({ branchId, employees, departments }: { branchId: string; employees: Employee[]; departments: Department[] }): React.ReactElement {
  const { members } = useAdminOrg();
  const { hasPermission } = useSession();
  const list = useRpcQuery<Announcement[]>('list_announcements', { branchId }, { enabled: hasPermission('announcements.read') });
  const published = (list.data ?? []).filter((a) => a.is_published && !a.deleted_at && (!a.branch_id || a.branch_id === branchId));
  const acks = useRpcQueries<AnnouncementAcknowledgement[]>(
    'list_announcement_acknowledgements',
    published.map((a) => ({ announcementId: a.id }))
  );
  const acknowledgements = new Map(published.map((a, i) => [a.id, acks[i]?.data ?? []]));
  const cards = buildCards({ announcements: published, acknowledgements, employees, departments, members, now: currentTime() });
  if (cards.length === 0) return <EmptyBox title="No announcements" body="Notices posted to this branch appear here." />;
  return (
    <div className="flex flex-col gap-3">
      {cards.map((c) => (
        <article
          key={c.announcement.id}
          className="rounded-[16px] border border-solid px-[18px] py-[17px]"
          style={{ borderColor: c.pinned ? '#F7DFD1' : '#EBE7E3', backgroundColor: c.pinned ? '#FEFAF7' : '#fff' }}
        >
          <div className="flex flex-wrap items-center gap-[9px]">
            <Pill tone={c.audienceTone}>{c.audience}</Pill>
            {c.pinned ? <span className="inline-flex items-center gap-[5px] rounded-full bg-[#FDF0E9] px-2.5 py-1 text-[10.5px] font-extrabold text-[#C6420E]">Pinned</span> : null}
            <span className="ml-auto text-[11px] text-[#A79C93]">{c.time}</span>
          </div>
          <h2 className="mb-0 mt-[11px] text-[15.5px] font-extrabold tracking-[-0.015em]">{c.announcement.title}</h2>
          <p className="mb-0 mt-1.5 text-[13px] text-[#57504A] [text-wrap:pretty]">{c.announcement.content}</p>
          <div className="mt-[13px] flex flex-wrap items-center gap-2.5 border-0 border-t border-solid border-[#F2EEEA] pt-[11px]">
            <span className="text-[11.5px] text-[#857A72]">{c.author}</span>
            <span className="ml-auto flex items-center gap-[9px]">
              <span className="h-1.5 w-[104px] overflow-hidden rounded-full bg-[#F2EEEA]">
                <span className="block h-full rounded-full" style={{ width: `${c.pct}%`, backgroundColor: TONES[c.barColor][0] }} />
              </span>
              <span className="text-[11px] font-bold text-[#857A72]">{c.pct}% acknowledged</span>
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

function AttendanceTab({ week, employees, departments }: { week: ReturnType<typeof useBranchWeek>; employees: Employee[]; departments: Department[] }): React.ReactElement {
  const today = todayDateString(currentTime());
  const people = new Map(employees.map((e) => [e.id, e]));
  const deptName = new Map(departments.map((d) => [d.id, d.name]));
  const shiftById = new Map(week.shifts.map((s) => [s.id, s]));
  const recordFor = new Map(week.attendance.map((r) => [r.shift_assignment_id, r]));
  const rows = week.assignments
    .map((a) => ({ a, shift: shiftById.get(a.shift_id), person: people.get(a.employee_id), record: recordFor.get(a.id) }))
    .filter((r) => r.shift?.shift_date === today && r.person)
    .map((r) => {
      const rec = r.record;
      const absent = rec?.attendance_status === 'absent' || rec?.attendance_status === 'no_show';
      const late = Boolean(rec?.clock_in_at) && (rec?.attendance_status === 'late' || (rec?.late_minutes ?? 0) > 0);
      const inAt = rec?.clock_in_at ? new Date(rec.clock_in_at) : null;
      const status: [string, Tone, AdminIconName] = absent ? ['Absent', 'bad', 'x'] : late ? ['Late', 'warn', 'clock'] : inAt ? ['On time', 'ok', 'check'] : ['Not marked', 'neutral', 'clock'];
      return {
        id: r.a.id,
        name: fullName(r.person as Employee),
        role: ((r.person as Employee).department_id && deptName.get((r.person as Employee).department_id as string)) || 'Staff',
        status,
        clockIn: inAt ? inAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—',
        scheduled: `Scheduled ${new Date(`2000-01-01T${r.shift?.start_time ?? '00:00'}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
        note: rec?.notes || '—'
      };
    });
  const count = (label: string): number => rows.filter((r) => r.status[0] === label).length;
  const stats: Array<[string, number, string]> = [
    ['Present', count('On time'), '#2E9E62'],
    ['Late', count('Late'), '#B77714'],
    ['Absent', count('Absent'), '#C93A22'],
    ['Not marked', count('Not marked'), '#2563EB']
  ];
  const grid = 'grid grid-cols-[minmax(0,1.5fr)_140px_130px_minmax(0,1fr)] gap-2.5';
  return (
    <>
      <section className={`${card} px-[18px] py-4`}>
        <div className="flex items-center gap-[9px]">
          <h2 className="m-0 text-[14.5px] font-extrabold tracking-normal">Attendance Overview</h2>
          <ReadOnlyPill />
        </div>
        <div className="mt-3 flex flex-wrap items-center">
          {stats.map(([label, value, color]) => (
            <span key={label} className="mr-[22px] flex flex-col border-0 border-r border-solid border-[#F2EEEA] pr-[22px]">
              <span className="text-[22px] font-extrabold tracking-[-0.02em]" style={{ color }}>
                {value}
              </span>
              <span className="mt-[3px] block text-[11.5px] text-[#857A72]">{label}</span>
            </span>
          ))}
        </div>
      </section>
      <section className={`${card} overflow-hidden`}>
        <div className={`${grid} border-0 border-b border-solid border-[#F2EEEA] px-[18px] py-[11px] text-[10.5px] font-extrabold uppercase tracking-[.06em] text-[#A79C93]`}>
          <span>Employee</span>
          <span>Status</span>
          <span>Check-in Time</span>
          <span>Notes</span>
        </div>
        {rows.length === 0 ? <p className="m-0 px-[18px] py-6 text-center text-[12.5px] text-[#A79C93]">Nobody is on a published shift today.</p> : null}
        {rows.map((r) => (
          <div key={r.id} className={`${grid} items-center border-0 border-b border-solid border-[#F7F4F1] px-[18px] py-3`}>
            <span className="flex min-w-0 items-center gap-[11px]">
              <Avatar name={r.name} size={32} />
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-bold">{r.name}</span>
                <span className="block text-[11px] text-[#A79C93]">{r.role}</span>
              </span>
            </span>
            <span className="flex items-center gap-[7px] text-[11.5px] font-bold" style={{ color: TONES[r.status[1]][0] }}>
              <span className="flex-none">
                <AdminIcon name={r.status[2]} size={12} />
              </span>
              {r.status[0]}
            </span>
            <span className="min-w-0 leading-[1.3]">
              <span className="block text-[12.5px] font-bold" style={{ color: TONES[r.status[1]][0] }}>
                {r.clockIn}
              </span>
              <span className="block text-[10.5px] text-[#A79C93]">{r.scheduled}</span>
            </span>
            <span className="text-[11.5px] text-[#857A72]">{r.note}</span>
          </div>
        ))}
      </section>
    </>
  );
}

function StepDot({ step }: { step: SwapStep }): React.ReactElement {
  return step.state === 'todo' ? (
    // 16px + a 1.5px border each side, content-box as in the prototype.
    <span className="box-content flex size-4 items-center justify-center rounded-full border-[1.5px] border-solid border-[#EBE7E3] bg-white text-[9px] font-extrabold text-[#A79C93]" />
  ) : (
    <span className={`flex size-4 items-center justify-center rounded-full text-[9px] font-extrabold text-white ${step.state === 'failed' ? 'bg-[#C93A22]' : 'bg-[#2E9E62]'}`}>{step.state === 'failed' ? '✕' : '✓'}</span>
  );
}

function RequestsTab({ branchId, employees, departments }: { branchId: string; employees: Employee[]; departments: Department[] }): React.ReactElement {
  const { members } = useAdminOrg();
  const { hasPermission } = useSession();
  const [tab, setTab] = useState<RequestTab>('Swap requests');
  const [filter, setFilter] = useState<RequestFilter>('Pending');
  const oversight = hasPermission('reports.read');
  const swapsQuery = useRpcQuery<ShiftSwap[]>('list_branch_shift_swaps', { branchId }, { enabled: oversight });
  const leaveQuery = useRpcQuery<LeaveRequest[]>('list_branch_leave', { branchId }, { enabled: oversight });
  const ctx = { employees, departments, members, now: currentTime() };
  const swaps = applyFilter(buildSwapViews(swapsQuery.data ?? [], ctx), filter);
  const leave = applyFilter(buildLeaveViews(leaveQuery.data ?? [], ctx), filter);
  const side = (label: string, name: string, role: string, line: string, meta: string): React.ReactElement => (
    // 220px basis, 200px minimum, plus 14px padding and a 1px border each side (content-box in the prototype).
    <div className="min-w-[230px] flex-[1_1_250px] rounded-[13px] border border-solid border-[#F2EEEA] px-3.5 py-[13px]">
      <p className="m-0 text-[10.5px] font-extrabold uppercase tracking-[.1em] text-[#A79C93]">{label}</p>
      <div className="mt-[9px] flex items-center gap-2.5">
        <Avatar name={name} size={32} />
        <span className="min-w-0">
          <span className="block text-[12.5px] font-extrabold">{name}</span>
          <span className="block text-[11px] text-[#A79C93]">{role}</span>
        </span>
      </div>
      <p className="mb-0 mt-2.5 text-[12.5px] font-bold">{line}</p>
      <p className="mb-0 mt-[3px] text-[11.5px] text-[#857A72]">{meta}</p>
    </div>
  );
  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        <Segmented options={REQUEST_TABS} value={tab} onChange={setTab} />
        <div className="flex flex-wrap gap-1.5">
          {REQUEST_FILTERS.map((label) => (
            <button
              key={label}
              type="button"
              aria-pressed={label === filter}
              onClick={() => setFilter(label)}
              className={`cursor-pointer rounded-[9px] border border-solid px-3 py-1.5 text-[11.5px] font-bold [line-height:normal] ${label === filter ? 'border-[#F04E17] bg-[#FDF0E9] text-[#C6420E]' : 'border-[#EBE7E3] bg-white text-[#857A72]'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[12px] text-[#A79C93]">{tab === 'Swap requests' ? `${swaps.length} swap requests` : `${leave.length} leave requests`}</span>
      </div>
      {tab === 'Swap requests' ? (
        <div className="flex flex-col gap-3">
          {swaps.map((s) => (
            <article key={s.swap.id} className={`${card} px-[18px] py-4`}>
              <div className="flex flex-wrap items-center gap-2.5">
                <Pill tone={s.tone}>{s.status}</Pill>
                <span className="text-[11.5px] text-[#A79C93]">{s.ref}</span>
                <span className="ml-auto text-[11.5px] text-[#A79C93]">{s.age}</span>
              </div>
              <div className="mt-3.5 flex flex-wrap gap-3.5">
                {side('Gives up', s.fromName, s.fromRole, s.shiftLine, s.shiftMeta)}
                <span aria-hidden="true" className="flex size-[30px] flex-[0_0_30px] items-center justify-center self-center rounded-full bg-[#FDF0E9] text-[13px] font-extrabold text-[#C6420E]">
                  ⇄
                </span>
                {side('Takes over', s.toName, s.toRole, s.shiftLine, s.shiftMeta)}
              </div>
              <p className="mb-0 mt-3 text-[12.5px] text-[#57504A] [text-wrap:pretty]">
                <strong className="font-extrabold">Reason:</strong> {s.reason}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-[9px] border-0 border-t border-solid border-[#F2EEEA] pt-[11px]">
                <ol className="m-0 flex flex-[1_1_260px] list-none flex-wrap gap-2 p-0">
                  {s.steps.map((step) => (
                    <li key={step.label} className="flex items-center gap-1.5 text-[11px] font-bold text-[#857A72]">
                      <StepDot step={step} />
                      {step.label}
                    </li>
                  ))}
                </ol>
                <span className="ml-auto text-[11.5px] font-bold text-[#A79C93]">{s.outcome || (s.awaitingApproval ? 'Pending supervisor decision' : '')}</span>
              </div>
            </article>
          ))}
          {swaps.length === 0 ? (
            <div className="rounded-[16px] border border-dashed border-[#E4DED9] bg-white px-6 py-10 text-center">
              <p className="m-0 text-[15px] font-extrabold">No swap requests in this filter</p>
              <p className="mx-auto mb-0 mt-[7px] max-w-[400px] text-[12.5px] text-[#857A72]">Swaps only exist against published shifts.</p>
            </div>
          ) : null}
        </div>
      ) : (
        <section className={`${card} overflow-hidden`}>
          <div className="flex gap-3 border-0 border-b border-solid border-[#F2EEEA] px-[18px] py-[11px] text-[10.5px] font-extrabold uppercase tracking-[.08em] text-[#A79C93]">
            <span className="min-w-0 flex-[1_1_170px]">Employee</span>
            <span className="flex-[0_0_130px]">Dates</span>
            <span className="min-w-0 flex-[1_1_150px]">Type &amp; reason</span>
            <span className="flex-[0_0_96px] text-right">Status</span>
          </div>
          {leave.length === 0 ? <p className="m-0 px-[18px] py-6 text-center text-[12.5px] text-[#A79C93]">No leave requests in this filter.</p> : null}
          {leave.map((l) => (
            <div key={l.leave.id} className="flex flex-wrap items-center gap-x-3 gap-y-2.5 border-0 border-b border-solid border-[#F7F4F1] px-[18px] py-3">
              <span className="flex min-w-0 flex-[1_1_170px] items-center gap-[11px]">
                <Avatar name={l.name} size={32} />
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] font-bold">{l.name}</span>
                  <span className="block text-[11px] text-[#A79C93]">{l.dept}</span>
                </span>
              </span>
              <span className="min-w-0 flex-[0_0_130px]">
                <span className="block text-[12.5px] font-bold">{l.dates}</span>
                <span className="block text-[11px] text-[#A79C93]">{l.days}</span>
              </span>
              <span className="min-w-0 flex-[1_1_150px]">
                <span className="block text-[12.5px] font-bold">{l.type}</span>
                <span className="block text-[11px] text-[#857A72]">{l.reason}</span>
              </span>
              <span className="flex-[0_0_96px] text-right">
                <Pill tone={l.tone}>{l.status}</Pill>
              </span>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

export default function AdminBranchDetailPage(): React.ReactElement {
  const { branchId = '' } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useSession();
  const { loading, orgName, branches, employees } = useAdminOrg();
  const [tab, setTab] = useState<BranchTab>('Leadership');
  const [weekStart, setWeekStart] = useState(() => weekStartOf(todayDateString(currentTime())));
  const branch = branches.find((b) => b.branch.id === branchId);
  const departments = useRpcQuery<Department[]>('list_departments', { branchId }, { enabled: Boolean(branchId) && hasPermission('departments.read') }).data ?? [];
  const tasks = useRpcQuery<Task[]>('list_tasks', { branchId }, { enabled: tab === 'Tasks' && hasPermission('tasks.read') }).data ?? [];
  const week = useBranchWeek(branchId, weekStart, Boolean(branchId) && (tab === 'Schedule' || tab === 'Attendance' || tab === 'Employees'));
  const branchStaff = useMemo(() => employees.filter((e) => e.branch_id === branchId && !e.deleted_at && e.employment_status !== 'terminated'), [employees, branchId]);
  const today = todayDateString(currentTime());
  const shiftById = new Map(week.shifts.map((s) => [s.id, s]));
  const onShiftToday = new Set(week.assignments.filter((a) => shiftById.get(a.shift_id)?.shift_date === today).map((a) => a.employee_id)).size;

  if (!loading && !branch) {
    return (
      <AdminPage title="Branch not found" subtitle="It may have been removed, or you don't have access to it.">
        <button type="button" onClick={() => navigate('/branches')} className="cursor-pointer border-0 bg-transparent p-0 text-[12.5px] font-bold text-[#857A72] [line-height:normal]">
          ← Back to branches
        </button>
      </AdminPage>
    );
  }

  return (
    <AdminPage title={branch?.name ?? 'Branch'} subtitle={branch?.location ?? ''} attention={branches.some((b) => b.attentionNote)}>
      {loading || !branch ? (
        <AdminLoading />
      ) : (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => navigate('/branches')}
            className="flex cursor-pointer items-center gap-1.5 self-start border-0 bg-transparent p-0 text-[12.5px] font-bold text-[#857A72] [line-height:normal]"
          >
            ← Back to branches
          </button>

          <section className={`${card} p-5`}>
            <div className="flex flex-wrap items-start gap-3.5">
              <span
                className="flex size-[52px] flex-none items-center justify-center rounded-[16px]"
                style={{ backgroundColor: branch.attentionNote ? '#FDF4E6' : '#FDF0E9', color: branch.attentionNote ? '#B77714' : '#C6420E' }}
              >
                <AdminIcon name="store" size={24} />
              </span>
              <div className="min-w-0 flex-[1_1_260px]">
                <div className="flex flex-wrap items-center gap-[9px]">
                  <h1 className="m-0 text-[21px] font-extrabold tracking-[-0.02em]">{branch.name}</h1>
                  <Pill tone={STATUS_TONE[branch.status]}>{branch.status}</Pill>
                </div>
                <p className="mb-0 mt-1.5 text-[12.5px] text-[#857A72]">{branch.address}</p>
                <p className="mb-0 mt-1 text-[12.5px] text-[#A79C93]">
                  {orgName} · Branch Manager: {branch.managers[0]?.name ?? 'Unassigned'}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5 border-0 border-t border-solid border-[#F2EEEA] pt-3.5">
              {(
                [
                  ['Workforce', `${branch.employees} employees`],
                  ['Management', `${branch.managers.length} managers · ${branch.supervisors.length} supervisors`],
                  ['Operating Hours', branch.hours],
                  ['Branch Since', branch.created]
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <p className="m-0 text-[10.5px] text-[#A79C93]">{label}</p>
                  <p className="mb-0 mt-1 text-[14px] font-extrabold">{value}</p>
                </div>
              ))}
            </div>
          </section>

          {branch.attentionNote ? (
            <section className="flex items-start gap-3 rounded-[14px] border border-solid border-[#F3DFB8] bg-[#FDF8EC] px-4 py-3.5">
              <span className="flex size-7 flex-none items-center justify-center rounded-full bg-[#B77714] text-[12px] font-extrabold text-white">!</span>
              <span>
                <span className="block text-[13px] font-extrabold text-[#7A5410]">Needs attention</span>
                <span className="mt-0.5 block text-[12.5px] text-[#7A5410]">{branch.attentionNote}</span>
              </span>
            </section>
          ) : null}

          <div className="flex flex-wrap items-center gap-2.5">
            <Segmented options={BRANCH_TABS} value={tab} onChange={setTab} />
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[#F1EDEA] px-[11px] py-[5px] text-[11px] font-bold text-[#57504A]">
              <AdminIcon name="lock" size={10} />
              Read-only for Admins
            </span>
          </div>

          {tab === 'Leadership' ? <LeadershipTab branch={branch} /> : null}
          {tab === 'Employees' ? <EmployeesTab branch={branch} employees={branchStaff} departments={departments} onShiftToday={onShiftToday} /> : null}
          {tab === 'Schedule' ? <ScheduleTab week={week} weekStart={weekStart} onWeek={setWeekStart} employees={branchStaff} /> : null}
          {tab === 'Tasks' ? <TasksTab tasks={tasks} employees={branchStaff} departments={departments} /> : null}
          {tab === 'Announcements' ? <AnnouncementsTab branchId={branchId} employees={branchStaff} departments={departments} /> : null}
          {tab === 'Attendance' ? <AttendanceTab week={week} employees={branchStaff} departments={departments} /> : null}
          {tab === 'Requests' ? <RequestsTab branchId={branchId} employees={branchStaff} departments={departments} /> : null}
        </div>
      )}
    </AdminPage>
  );
}
