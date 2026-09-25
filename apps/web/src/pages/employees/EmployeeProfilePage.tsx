import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PermissionDenied } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { isRateLimitError } from '../../lib/authErrors.js';
import { uploadEmployeeAvatar, useSignedAvatarUrl } from '../../lib/avatars.js';
import { memberForEmail } from '../../lib/members.js';
import { supabase } from '../../lib/supabase.js';
import { useDismiss } from '../../lib/useDismiss.js';
import { useRpcMutation, useRpcQuery } from '../../lib/useRpc.js';
import type { AttendanceRecord, Department, Employee, EmploymentStatus, Member } from '../../types/domain.js';
import { OverviewEmpty, OverviewHeader, OverviewLoading } from '../dashboard/manager/ManagerOverview.js';
import { useNow } from '../dashboard/manager/useManagerOverview.js';
import { ScheduleIcon } from '../scheduling/grid/ScheduleIcon.js';
import { ScheduleToast, useRouteToast, useScheduleToast } from '../scheduling/grid/ScheduleToast.js';
import { initialsOf, TONES, todayDateString, type Tone } from '../scheduling/grid/scheduleFormat.js';
import { addedLabel, NO_ACCOUNT_ROLE, STATUS_LABEL } from './directory/directoryModel.js';
import { DateButton, EMPLOYMENT_TYPE_OPTIONS, FieldLabel, joinPhone, PhoneFields, SelectButton, splitPhone, TextInput } from './profile/employeeFields.js';
import { historyDays, historyRows, historyStats, rangeFor, rangeLabel, type HistoryFilter, type RangeKey } from './profile/historyModel.js';

/*
 * WEB-006 — Employee Profile, rebuilt to the design handoff (`ShiftOS
 * Dashboards.dc.html`, "EMPLOYEE DETAIL", lines 1714-1900; its page title
 * and subtitle are empty, so the header carries only the date pill). The
 * Employee Details tab is the edit form; Employee History is the person's
 * real attendance. Sizes are the prototype's rendered ones.
 */

const card = 'rounded-[16px] border border-solid border-[#EBE7E3] bg-white';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const STATUS_COPY: Record<EmploymentStatus, string> = {
  active: 'Employee is currently active and can be scheduled.',
  on_leave: 'Employee is on leave and should not be scheduled until they return.',
  inactive: 'Employee is inactive and cannot be scheduled.',
  terminated: 'Employee has left the organization and cannot be scheduled.'
};

/** The handoff's soft status pills: green on mint for Active, the tone pair otherwise. */
const STATUS_PILL: Record<EmploymentStatus, { color: string; background: string; dot: string }> = {
  active: { color: '#1E6B45', background: '#E9F7EF', dot: '#2E9E62' },
  on_leave: { color: TONES.info[0], background: TONES.info[1], dot: TONES.info[0] },
  inactive: { color: TONES.neutral[0], background: TONES.neutral[1], dot: TONES.neutral[0] },
  terminated: { color: TONES.bad[0], background: TONES.bad[1], dot: TONES.bad[0] }
};

const RANGE_OPTIONS: Array<{ value: RangeKey; label: string }> = [
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'last_30', label: 'Last 30 days' }
];

const FILTER_OPTIONS: Array<{ value: HistoryFilter; label: string }> = [
  { value: 'all', label: 'All records' },
  { value: 'on_time', label: 'On time' },
  { value: 'late', label: 'Late' },
  { value: 'absent', label: 'Absent' }
];

const toneStyle = (tone: Tone): React.CSSProperties => ({ color: TONES[tone][0], backgroundColor: TONES[tone][1] });

interface DetailsForm {
  fullName: string;
  email: string;
  phoneCode: string;
  phone: string;
  employmentType: string;
  departmentId: string;
  hireDate: string;
}

function formFrom(employee: Employee): DetailsForm {
  const phone = splitPhone(employee.phone);
  return {
    fullName: `${employee.first_name} ${employee.last_name}`.trim(),
    email: employee.email ?? '',
    phoneCode: phone.code,
    phone: phone.number,
    employmentType: employee.employment_type ?? '',
    departmentId: employee.department_id ?? '',
    hireDate: employee.hire_date?.slice(0, 10) ?? ''
  };
}

/** A small toolbar dropdown (38px, bold) — the history range and filter buttons. */
function ToolbarMenu<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ value: T; label: string }>; onChange: (value: T) => void }): React.ReactElement {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((isOpen) => !isOpen)}
        className="flex h-[38px] cursor-pointer items-center gap-[7px] rounded-[10px] border border-solid border-[#E4DED9] bg-white px-[13px] text-[12.5px] font-bold text-black"
      >
        {label} <span className="text-[#A79C93]">⌄</span>
      </button>
      {open ? (
        <div role="listbox" className="absolute right-0 top-[calc(100%+4px)] z-30 w-[170px] rounded-[12px] border border-solid border-[#EBE7E3] bg-white p-1 shadow-[0_18px_40px_-20px_rgba(56,49,43,.35)]">
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
        </div>
      ) : null}
    </div>
  );
}

export default function EmployeeProfilePage(): React.ReactElement {
  const { employeeId = '' } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const now = useNow();
  const { toast, show, dismiss } = useScheduleToast();
  useRouteToast(show);
  const { hasPermission, myContext } = useSession();
  const canRead = hasPermission('employees.read');
  const canUpdate = hasPermission('employees.update');
  const canManageMembers = hasPermission('org.members.manage');

  const employeeQuery = useRpcQuery<Employee>('get_employee', { employeeId }, { enabled: canRead && Boolean(employeeId) });
  const employee = employeeQuery.data;
  const branchScope = employee ? { branchId: employee.branch_id } : undefined;
  const { data: departments } = useRpcQuery<Department[]>('list_departments', branchScope, { enabled: Boolean(employee) && hasPermission('departments.read') });
  const { data: colleagues } = useRpcQuery<Employee[]>('list_employees', branchScope, { enabled: Boolean(employee) });
  const { data: members } = useRpcQuery<Member[]>('list_members', undefined, { enabled: canManageMembers });
  const { data: attendance, isLoading: attendanceLoading } = useRpcQuery<AttendanceRecord[]>(
    'list_attendance_for_employee',
    { employeeId, limit: 500 },
    { enabled: Boolean(employee) && hasPermission('attendance.read') }
  );

  const updateMutation = useRpcMutation<Employee, Record<string, unknown>>('update_employee', { invalidates: ['get_employee', 'list_employees'] });

  const [tab, setTab] = useState<'details' | 'history'>('details');
  const [form, setForm] = useState<DetailsForm | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useDismiss(statusOpen, () => setStatusOpen(false));
  const [range, setRange] = useState<RangeKey>('this_month');
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [visibleRows, setVisibleRows] = useState(5);
  const [uploading, setUploading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const photoUrl = useSignedAvatarUrl(employee?.avatar_url);

  useEffect(() => {
    if (employee) setForm(formFrom(employee));
  }, [employee]);

  const member = useMemo(() => memberForEmail(members ?? [], employee?.email), [members, employee]);
  const role = member?.role_name ?? NO_ACCOUNT_ROLE;
  const departmentName = (departments ?? []).find((d) => d.id === employee?.department_id)?.name ?? 'Unassigned';
  const manager = (colleagues ?? []).find((c) => c.id === employee?.reports_to_employee_id);
  const managerRole = memberForEmail(members ?? [], manager?.email)?.role_name;

  const today = todayDateString(now);
  const dayRange = rangeFor(range, today);
  const records = attendance ?? [];
  const stats = historyStats(records, dayRange, range);
  const strip = historyDays(records, dayRange);
  const rows = historyRows(records, dayRange, filter);

  if (!canRead) {
    return (
      <div className="px-7 py-6">
        <PermissionDenied />
      </div>
    );
  }

  const frame = (body: React.ReactNode): React.ReactElement => (
    <div className="flex min-h-full flex-col text-[13px] text-[#38312B] [line-height:normal]">
      <OverviewHeader title="" subtitle="" now={now} />
      <div className="flex flex-auto flex-col gap-[18px] bg-[#FDFCFB] px-7 pb-10 pt-[22px] max-[859px]:gap-3.5 max-[859px]:px-3.5 max-[859px]:pb-[84px] max-[859px]:pt-4">{body}</div>
      <ScheduleToast toast={toast} onDismiss={dismiss} />
    </div>
  );

  if (employeeQuery.isLoading || (employee && !form)) return frame(<OverviewLoading />);
  if (employeeQuery.error || !employee || !form) {
    return frame(
      <OverviewEmpty
        title="Employee not found"
        body={(employeeQuery.error as Error | undefined)?.message ?? "This person isn't in your branch, or their record was removed."}
        cta={{ label: 'Back to Employees', onClick: () => navigate('/employees') }}
        secondary={null}
      />
    );
  }

  const name = `${employee.first_name} ${employee.last_name}`.trim();
  const statusPill = STATUS_PILL[employee.employment_status];
  const nameParts = form.fullName.trim().split(/\s+/).filter(Boolean);
  const errors = {
    fullName: nameParts.length < 2,
    email: !EMAIL.test(form.email.trim()),
    phone: form.phone.replace(/\D/g, '').length < 7,
    departmentId: !form.departmentId,
    hireDate: !form.hireDate
  };
  const invalid = Object.values(errors).some(Boolean);

  const save = async (): Promise<void> => {
    setShowErrors(true);
    if (invalid) {
      show('Fill in the highlighted fields', 'error');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        employeeId,
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' '),
        email: form.email.trim(),
        phone: joinPhone(form.phoneCode, form.phone),
        employmentType: form.employmentType || null,
        departmentId: form.departmentId || null,
        hireDate: form.hireDate
      });
      setShowErrors(false);
      show('Employee details saved');
    } catch (error) {
      show(error instanceof Error ? error.message : 'Could not save the changes', 'error');
    }
  };

  const changeStatus = async (status: EmploymentStatus): Promise<void> => {
    setStatusOpen(false);
    if (status === employee.employment_status) return;
    try {
      await updateMutation.mutateAsync({ employeeId, employmentStatus: status });
      show(`${name} is now ${STATUS_LABEL[status].toLowerCase()}`);
    } catch (error) {
      show(error instanceof Error ? error.message : 'Could not change the status', 'error');
    }
  };

  const changePhoto = async (file: File | undefined): Promise<void> => {
    if (!file || !myContext) return;
    if (file.size > 2 * 1024 * 1024) {
      show('Photos can be up to 2MB', 'error');
      return;
    }
    setUploading(true);
    try {
      const path = await uploadEmployeeAvatar(myContext.organizationId, employeeId, file);
      await updateMutation.mutateAsync({ employeeId, avatarUrl: path });
      show('Profile photo updated');
    } catch (error) {
      show(error instanceof Error ? error.message : 'Could not upload the photo', 'error');
    } finally {
      setUploading(false);
      if (photoInput.current) photoInput.current.value = '';
    }
  };

  const resetPassword = async (): Promise<void> => {
    if (!member) {
      show(`${employee.first_name} doesn't have a ShiftOS login yet`, 'error');
      return;
    }
    setResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(member.user_email, { redirectTo: `${window.location.origin}/reset-password` });
      if (error) throw error;
      show(`Password reset link sent to ${member.user_email}`);
    } catch (error) {
      show(isRateLimitError(error) ? 'Too many requests — wait a few minutes and try again' : error instanceof Error ? error.message : 'Could not send the reset link', 'error');
    } finally {
      setResetting(false);
    }
  };

  const set = <K extends keyof DetailsForm>(key: K) => (value: DetailsForm[K]): void => setForm((current) => (current ? { ...current, [key]: value } : current));

  return frame(
    <>
      <button type="button" onClick={() => navigate('/employees')} className="flex cursor-pointer items-center gap-2 self-start border-0 bg-transparent p-0 text-[13px] font-bold text-[#C6420E]">
        ← Back to Employees
      </button>

      <div className="grid grid-cols-[minmax(0,1fr)_262px] items-start gap-4 max-[859px]:grid-cols-1">
        <div className="flex min-w-0 flex-col gap-4">
          <section className="rounded-[18px] border border-solid border-[#EBE7E3] bg-white px-[22px] py-5">
            <div className="flex flex-wrap items-center gap-[18px]">
              <span className="relative flex-none">
                {photoUrl ? (
                  <img src={photoUrl} alt="" className="block size-[88px] rounded-full object-cover" />
                ) : (
                  <span className="flex size-[88px] items-center justify-center rounded-full bg-[#FDF0E9] text-[27px] font-extrabold text-[#C6420E]">{initialsOf(name)}</span>
                )}
                {canUpdate ? (
                  <>
                    <button
                      type="button"
                      aria-label="Change photo"
                      disabled={uploading}
                      onClick={() => photoInput.current?.click()}
                      className="absolute bottom-0.5 right-0.5 flex size-6 cursor-pointer items-center justify-center rounded-full border-2 border-solid border-white bg-[#38312B] text-[10px] text-white disabled:opacity-60"
                    >
                      ◉
                    </button>
                    <input ref={photoInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => void changePhoto(event.target.files?.[0])} />
                  </>
                ) : null}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-[11px]">
                  <h2 className="m-0 text-[30px] font-extrabold tracking-[-0.03em]">{name}</h2>
                  <span className="inline-flex items-center rounded-full px-3 py-[5px] text-[11.5px] font-bold" style={{ color: statusPill.color, background: statusPill.background }}>
                    {STATUS_LABEL[employee.employment_status]}
                  </span>
                </div>
                <p className="mb-0 mt-2 text-[12.5px] text-[#857A72]">
                  {employee.employee_number} &nbsp;·&nbsp; {role} &nbsp;·&nbsp; {departmentName}
                </p>
              </div>
            </div>
          </section>

          <section className={card}>
            <div className="flex flex-wrap gap-[22px] border-b border-solid border-[#F2EEEA] px-5">
              {(
                [
                  ['details', 'Employee Details'],
                  ['history', 'Employee History']
                ] as const
              ).map(([key, label], index) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={tab === key}
                  onClick={() => setTab(key)}
                  className={[
                    'flex cursor-pointer items-center border-0 bg-transparent py-4 text-[13px] font-bold',
                    tab === key ? 'text-[#38312B] shadow-[inset_0_-2.5px_0_#F04E17]' : 'text-[#A79C93]'
                  ].join(' ')}
                >
                  <span
                    className="mr-2 inline-flex size-5 items-center justify-center rounded-full text-[10.5px] font-extrabold"
                    style={tab === key ? { background: '#F04E17', color: '#fff' } : { background: '#F2EEEA', color: '#A79C93' }}
                  >
                    {index + 1}
                  </span>
                  {label}
                </button>
              ))}
            </div>

            {tab === 'details' ? (
              <div className="p-5">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-[1_1_240px]">
                    <h3 className="m-0 text-[17px] font-extrabold tracking-normal">Edit Employee Details</h3>
                    <p className="mb-0 mt-[5px] text-[12px] text-[#857A72]">Update the employee&apos;s information.</p>
                  </div>
                  {canUpdate ? (
                    <span className="ml-auto flex flex-wrap gap-[9px]">
                      <button
                        type="button"
                        onClick={() => navigate('/employees')}
                        className="h-10 cursor-pointer rounded-[11px] border border-solid border-[#EBE7E3] bg-white px-[17px] text-[13px] font-bold text-black"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={updateMutation.isPending}
                        onClick={() => void save()}
                        className="h-10 cursor-pointer rounded-[11px] border-0 bg-[#F04E17] px-[18px] text-[13px] font-bold text-white disabled:opacity-70"
                      >
                        {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
                      </button>
                    </span>
                  ) : null}
                </div>
                <fieldset disabled={!canUpdate} className="m-0 mt-5 grid min-w-0 grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 border-0 p-0">
                  <FieldLabel label="Full Name" required>
                    <TextInput value={form.fullName} onChange={set('fullName')} invalid={showErrors && errors.fullName} ariaLabel="Full Name" />
                  </FieldLabel>
                  <FieldLabel label="Email Address" required>
                    <TextInput value={form.email} onChange={set('email')} type="email" invalid={showErrors && errors.email} ariaLabel="Email Address" />
                  </FieldLabel>
                  <FieldLabel label="Phone Number" required>
                    <PhoneFields code={form.phoneCode} number={form.phone} onCode={set('phoneCode')} onNumber={set('phone')} invalid={showErrors && errors.phone} />
                  </FieldLabel>
                  <FieldLabel label="Employment Type (Optional)">
                    <SelectButton value={form.employmentType} options={EMPLOYMENT_TYPE_OPTIONS} placeholder="Select employment type" onChange={set('employmentType')} ariaLabel="Employment Type" />
                  </FieldLabel>
                  <FieldLabel label="Department" required>
                    <SelectButton
                      value={form.departmentId}
                      options={(departments ?? []).filter((d) => d.is_active && !d.deleted_at).map((d) => ({ value: d.id, label: d.name }))}
                      placeholder="Select department"
                      onChange={set('departmentId')}
                      invalid={showErrors && errors.departmentId}
                      ariaLabel="Department"
                    />
                  </FieldLabel>
                  <FieldLabel label="Date of Joining" required>
                    <DateButton value={form.hireDate} onChange={set('hireDate')} placeholder="Select date of joining" invalid={showErrors && errors.hireDate} ariaLabel="Date of Joining" />
                  </FieldLabel>
                  <FieldLabel label="Role" required className="col-[1/-1] max-w-[calc(50%-8px)] max-[620px]:max-w-none">
                    <SelectButton
                      value={role}
                      options={[{ value: role, label: role }]}
                      placeholder="Select role"
                      onChange={() => undefined}
                      ariaLabel="Role"
                      note={member ? 'Roles are changed from Members & Roles.' : 'This person has no ShiftOS login, so they have no role yet.'}
                    />
                  </FieldLabel>
                </fieldset>
              </div>
            ) : (
              <div className="p-5">
                <div className="flex flex-wrap items-start gap-2.5">
                  <div className="min-w-0 flex-[1_1_220px]">
                    <h3 className="m-0 text-[17px] font-extrabold tracking-normal">Employee History</h3>
                    <p className="mb-0 mt-[5px] text-[12px] text-[#857A72]">Overview of {name}&apos;s attendance and performance.</p>
                  </div>
                  <span className="ml-auto flex flex-wrap gap-2">
                    <ToolbarMenu
                      label={rangeLabel(dayRange)}
                      value={range}
                      options={RANGE_OPTIONS}
                      onChange={(value) => {
                        setRange(value);
                        setVisibleRows(5);
                      }}
                    />
                    <ToolbarMenu
                      label={filter === 'all' ? 'Filter' : FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? 'Filter'}
                      value={filter}
                      options={FILTER_OPTIONS}
                      onChange={(value) => {
                        setFilter(value);
                        setVisibleRows(5);
                      }}
                    />
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
                  {stats.map((stat) => (
                    <div key={stat.label} className="rounded-[15px] border border-solid border-[#EBE7E3] bg-white p-[15px]">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-8 flex-none items-center justify-center rounded-[10px]" style={toneStyle(stat.tone)}>
                          <ScheduleIcon name={stat.icon} size={15} />
                        </span>
                        <p className="m-0 text-[11.5px] font-bold text-[#857A72]">{stat.label}</p>
                      </div>
                      <p className="mb-0 mt-[11px] text-[22px] font-extrabold leading-none tracking-[-0.025em]">{stat.value}</p>
                      <p className="mb-0 mt-[5px] text-[11px]" style={{ color: stat.good ? '#2E9E62' : '#A79C93' }}>
                        {stat.meta}
                      </p>
                    </div>
                  ))}
                </div>

                <section className="mt-4 rounded-[15px] border border-solid border-[#EBE7E3] bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h4 className="m-0 text-[14px] font-extrabold tracking-normal">Attendance Overview</h4>
                    <button type="button" onClick={() => navigate('/attendance')} className="ml-auto cursor-pointer border-0 bg-transparent p-0 text-[11.5px] font-bold text-[#F04E17]">
                      View Full Calendar →
                    </button>
                  </div>
                  <div className="mt-[11px] flex flex-wrap gap-3.5">
                    {(
                      [
                        ['On Time', '#2E9E62', '✓'],
                        ['Late (>15m)', '#B77714', '◔'],
                        ['Absent', '#C93A22', '✕'],
                        ['Off / Not Scheduled', '#A79C93', '–']
                      ] as const
                    ).map(([label, color, glyph]) => (
                      <span key={label} className="flex items-center gap-1.5 text-[11px] text-[#57504A]">
                        <span className="flex size-[13px] flex-none items-center justify-center rounded-full text-[8px] font-extrabold text-white" style={{ background: color }}>
                          {glyph}
                        </span>
                        {label}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3.5 overflow-x-auto">
                    <div className="flex min-w-[640px] gap-2">
                      {strip.map((day) => {
                        const [color, glyph] = { ok: ['#2E9E62', '✓'], late: ['#B77714', '◔'], absent: ['#C93A22', '✕'], off: ['#DDD6D0', '–'] }[day.state];
                        return (
                          <span key={day.date} className="flex min-w-9 flex-[1_1_0] flex-col items-center gap-[5px]">
                            <span className="text-[9.5px] font-extrabold tracking-[.05em] text-[#A79C93]">{day.dow}</span>
                            <span className="whitespace-nowrap text-[10px] text-[#857A72]">{day.label}</span>
                            <span className="flex size-[22px] items-center justify-center rounded-full text-[11px] font-extrabold text-white" style={{ background: color }}>
                              {glyph}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </section>

                <section className="mt-4 overflow-hidden rounded-[15px] border border-solid border-[#EBE7E3] bg-white">
                  <div className="flex flex-wrap items-center gap-2.5 px-4 py-3.5">
                    <h4 className="m-0 text-[14px] font-extrabold tracking-normal">Recent Activity</h4>
                    <button type="button" onClick={() => navigate('/attendance')} className="ml-auto cursor-pointer border-0 bg-transparent p-0 text-[11.5px] font-bold text-[#F04E17]">
                      View All Activity →
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <div className="min-w-[760px]">
                      <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_92px_92px_96px_108px_minmax(0,0.8fr)_32px] gap-2.5 border-y border-solid border-[#F2EEEA] px-4 py-2.5 text-[9.5px] font-extrabold uppercase tracking-[.07em] text-[#A79C93]">
                        <span>Date</span>
                        <span>Shift / Schedule</span>
                        <span>Clock In</span>
                        <span>Clock Out</span>
                        <span>Total Hours</span>
                        <span>Status</span>
                        <span>Notes</span>
                        <span />
                      </div>
                      {rows.length === 0 ? (
                        <p className="m-0 border-b border-solid border-[#F7F4F1] px-4 py-3.5 text-[12px] text-[#A79C93]">
                          {attendanceLoading ? 'Loading attendance…' : `No attendance ${filter === 'all' ? '' : 'matching this filter '}for ${rangeLabel(dayRange)}.`}
                        </p>
                      ) : (
                        rows.slice(0, visibleRows).map((row) => (
                          <div key={row.id} className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_92px_92px_96px_108px_minmax(0,0.8fr)_32px] items-center gap-2.5 border-b border-solid border-[#F7F4F1] px-4 py-[11px]">
                            <span className="whitespace-nowrap text-[12px] font-bold">{row.date}</span>
                            <span className="min-w-0 truncate text-[12px] text-[#57504A]">{row.shift}</span>
                            <span className="flex items-center gap-[5px] text-[12px] font-bold" style={{ color: row.late ? '#B77714' : '#38312B' }}>
                              {row.inTime}
                              {row.late ? <span className="text-[10px] text-[#B77714]">◔</span> : null}
                            </span>
                            <span className="text-[12px] text-[#57504A]">{row.out}</span>
                            <span className="text-[12px] font-bold">{row.total}</span>
                            <span>
                              <span className="inline-flex items-center gap-[5px] rounded-full px-2.5 py-1 text-[11px] font-bold" style={toneStyle(row.tone)}>
                                {row.status}
                              </span>
                            </span>
                            <span className="min-w-0 truncate text-[12px] text-[#857A72]">{row.notes}</span>
                            <button
                              type="button"
                              aria-label="Open in Attendance"
                              title="Open in Attendance"
                              onClick={() => navigate('/attendance')}
                              className="size-[26px] cursor-pointer justify-self-end rounded-[8px] border-0 bg-transparent text-[14px] font-extrabold text-[#A79C93] hover:bg-[#F7F4F1]"
                            >
                              ⋮
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={visibleRows >= rows.length}
                    onClick={() => setVisibleRows((count) => count + 5)}
                    className="w-full cursor-pointer border-0 border-t border-solid border-[#F2EEEA] bg-white p-[13px] text-[12.5px] font-bold text-[#57504A] disabled:cursor-default disabled:text-[#A79C93]"
                  >
                    {visibleRows >= rows.length ? (rows.length ? 'Showing all records' : 'Show More ⌄') : 'Show More ⌄'}
                  </button>
                </section>
              </div>
            )}
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <section className={`${card} p-4`}>
            <h2 className="mb-[11px] mt-0 text-[14px] font-extrabold tracking-normal">Employment Status</h2>
            <div ref={statusRef} className="relative inline-block">
              <button
                type="button"
                disabled={!canUpdate}
                aria-expanded={statusOpen}
                onClick={() => setStatusOpen((open) => !open)}
                className="inline-flex cursor-pointer items-center gap-[7px] rounded-full border-0 px-3 py-[5px] text-[11.5px] font-bold disabled:cursor-default"
                style={{ color: statusPill.color, background: statusPill.background }}
              >
                <span className="size-[7px] rounded-full" style={{ background: statusPill.dot }} />
                {STATUS_LABEL[employee.employment_status]}
              </button>
              {statusOpen ? (
                <div role="listbox" className="absolute left-0 top-[calc(100%+4px)] z-30 w-[150px] rounded-[12px] border border-solid border-[#EBE7E3] bg-white p-1 shadow-[0_18px_40px_-20px_rgba(56,49,43,.35)]">
                  {(['active', 'on_leave', 'inactive', 'terminated'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      role="option"
                      aria-selected={status === employee.employment_status}
                      onClick={() => void changeStatus(status)}
                      className={[
                        'flex w-full cursor-pointer rounded-[8px] border-0 px-2.5 py-2 text-left text-[12.5px]',
                        status === employee.employment_status ? 'bg-[#FDF0E9] font-bold text-[#C6420E]' : 'bg-transparent font-semibold text-[#38312B] hover:bg-[#F7F4F1]'
                      ].join(' ')}
                    >
                      {STATUS_LABEL[status]}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <p className="mb-0 mt-[11px] text-[11.5px] leading-[1.5] text-[#857A72]">{STATUS_COPY[employee.employment_status]}</p>
          </section>

          <section className={`${card} p-4`}>
            <h2 className="mb-[13px] mt-0 text-[14px] font-extrabold tracking-normal">Work Information</h2>
            <div className="flex flex-col gap-[13px]">
              <div className="flex gap-2.5">
                <span className="flex size-7 flex-none items-center justify-center rounded-[9px]" style={toneStyle('primary')}>
                  <ScheduleIcon name="user" size={14} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] text-[#A79C93]">Reports To</span>
                  <span className="mt-0.5 block text-[12.5px] font-bold">{manager ? `${manager.first_name} ${manager.last_name}${managerRole ? ` (${managerRole})` : ''}` : 'Not set'}</span>
                </span>
              </div>
              <div className="flex gap-2.5">
                <span className="flex size-7 flex-none items-center justify-center rounded-[9px]" style={toneStyle('info')}>
                  <ScheduleIcon name="calendar" size={14} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] text-[#A79C93]">Date Added</span>
                  <span className="mt-0.5 block text-[12.5px] font-bold">{addedLabel(employee.created_at)}</span>
                </span>
              </div>
            </div>
          </section>

          <section className={`${card} p-4`}>
            <h2 className="mb-[13px] mt-0 text-[14px] font-extrabold tracking-normal">Contact Information</h2>
            <div className="flex flex-col gap-[11px]">
              <p className="m-0 flex items-center gap-2.5 text-[12.5px] text-[#57504A]">
                <span className="text-[#857A72]">
                  <ScheduleIcon name="phone" size={15} />
                </span>
                {employee.phone || 'No phone number'}
              </p>
              <p className="m-0 flex min-w-0 items-center gap-2.5 text-[12.5px] text-[#57504A]">
                <span className="text-[#857A72]">
                  <ScheduleIcon name="mail" size={15} />
                </span>
                <span className="min-w-0 break-all">{employee.email || 'No email address'}</span>
              </p>
            </div>
          </section>

          <section className={`${card} p-4`}>
            <h2 className="mb-3 mt-0 text-[14px] font-extrabold tracking-normal">Quick Actions</h2>
            <button
              type="button"
              disabled={resetting}
              onClick={() => void resetPassword()}
              className="flex w-full cursor-pointer items-center gap-[9px] rounded-[11px] border-0 bg-[#FDF0E9] px-[13px] py-3 text-[12.5px] font-bold text-[#C6420E] disabled:opacity-70"
            >
              <ScheduleIcon name="lock" size={15} /> {resetting ? 'Sending…' : 'Reset Password'}
            </button>
          </section>
        </div>
      </div>
    </>
  );
}
