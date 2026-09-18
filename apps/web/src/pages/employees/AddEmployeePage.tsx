import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PermissionDenied } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { useDefaultBranchId } from '../../auth/useDefaultBranchId.js';
import { uploadEmployeeAvatar } from '../../lib/avatars.js';
import { useRpcMutation, useRpcQuery } from '../../lib/useRpc.js';
import type { Branch, Department, Employee, Member, Role } from '../../types/domain.js';
import { OverviewHeader } from '../dashboard/manager/ManagerOverview.js';
import { useNow } from '../dashboard/manager/useManagerOverview.js';
import { ScheduleIcon, type ScheduleIconName } from '../scheduling/grid/ScheduleIcon.js';
import { ScheduleToast, useScheduleToast } from '../scheduling/grid/ScheduleToast.js';
import { TONES, todayDateString, type Tone } from '../scheduling/grid/scheduleFormat.js';
import {
  addEmployeeSummary,
  createPayload,
  EMPTY_ADD_EMPLOYEE,
  invitePayload,
  isBlank,
  parseDraft,
  validateAddEmployee,
  type AddEmployeeField,
  type AddEmployeeForm
} from './profile/addEmployeeModel.js';
import { DateButton, EMPLOYMENT_TYPE_OPTIONS, FieldLabel, GENDER_OPTIONS, PhoneFields, SelectButton, TextInput } from './profile/employeeFields.js';

/*
 * WEB-007 — Add Employee, rebuilt to the design handoff (`ShiftOS
 * Dashboards.dc.html`, "ADD EMPLOYEE", lines 2295-2379): three form sections,
 * the Cancel / Save as Draft / Add Employee bar, and the photo + live summary
 * column. The employee lands in the manager's own branch; ticking "Send login
 * credentials" also invites them with the chosen role.
 */

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const PHOTO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const draftKey = (branchId: string): string => `shiftos.addEmployeeDraft.${branchId}`;

function readDraft(branchId: string): AddEmployeeForm | null {
  try {
    return parseDraft(window.localStorage.getItem(draftKey(branchId)));
  } catch {
    return null;
  }
}

function Section({ title, body, icon, tone, children }: { title: string; body: string; icon: ScheduleIconName; tone: Tone; children: React.ReactNode }): React.ReactElement {
  return (
    <section className="rounded-[16px] border border-solid border-[#EBE7E3] bg-white p-5">
      <div className="flex items-center gap-[11px]">
        <span className="flex size-[34px] flex-none items-center justify-center rounded-[11px]" style={{ color: TONES[tone][0], background: TONES[tone][1] }}>
          <ScheduleIcon name={icon} size={16} />
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] font-extrabold">{title}</span>
          <span className="mt-0.5 block text-[11.5px] text-[#857A72]">{body}</span>
        </span>
      </div>
      {children}
    </section>
  );
}

const grid = 'mt-[18px] grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4';

export default function AddEmployeePage(): React.ReactElement {
  const navigate = useNavigate();
  const now = useNow();
  const { toast, show, dismiss } = useScheduleToast();
  const { hasPermission, myContext } = useSession();
  const canCreate = hasPermission('employees.create');
  const canInvite = hasPermission('org.members.manage');

  // New people always join the manager's own branch; there's no branch to pick.
  const branchId = useDefaultBranchId() ?? '';
  const scope = branchId ? { branchId } : undefined;
  const { data: branches } = useRpcQuery<Branch[]>('list_branches', undefined, { enabled: hasPermission('branches.read') });
  const { data: departments } = useRpcQuery<Department[]>('list_departments', scope, { enabled: Boolean(branchId) && hasPermission('departments.read') });
  const { data: employees } = useRpcQuery<Employee[]>('list_employees', scope, { enabled: Boolean(branchId) && hasPermission('employees.read') });
  const { data: roles } = useRpcQuery<Role[]>('list_invitable_roles', undefined, { enabled: canInvite });
  const { data: members } = useRpcQuery<Member[]>('list_members', undefined, { enabled: canInvite });

  const createMutation = useRpcMutation<Employee, Record<string, unknown>>('create_employee', { invalidates: ['list_employees'] });
  const updateMutation = useRpcMutation<Employee, Record<string, unknown>>('update_employee', { invalidates: ['list_employees', 'get_employee'] });
  const inviteMutation = useRpcMutation<unknown, ReturnType<typeof invitePayload>>('invite_member', { invalidates: ['list_invitations'] });

  const [form, setForm] = useState<AddEmployeeForm>(EMPTY_ADD_EMPLOYEE);
  const [showErrors, setShowErrors] = useState(false);
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const restored = useRef(false);

  useEffect(() => {
    if (!branchId || restored.current) return;
    restored.current = true;
    const draft = readDraft(branchId);
    if (draft && !isBlank(draft)) {
      setForm(draft);
      show('Draft restored');
    }
  }, [branchId, show]);

  useEffect(() => () => (photo ? URL.revokeObjectURL(photo.url) : undefined), [photo]);

  const branchName = (branches ?? []).find((b) => b.id === branchId)?.name ?? 'your branch';
  const departmentOptions = useMemo(() => (departments ?? []).filter((d) => d.is_active && !d.deleted_at).map((d) => ({ value: d.id, label: d.name })), [departments]);
  const roleOptions = useMemo(
    () => (roles ?? []).filter((r) => r.is_active && !r.deleted_at && !r.grants_org_wide_branch_access).map((r) => ({ value: r.id, label: r.name })),
    [roles]
  );
  const managerOptions = useMemo(() => {
    const roleByEmail = new Map((members ?? []).filter((m) => m.is_active && !m.deleted_at).map((m) => [m.user_email.toLowerCase(), m.role_name]));
    return (employees ?? [])
      .filter((e) => e.employment_status === 'active' && !e.deleted_at)
      .map((e) => {
        const role = e.email ? roleByEmail.get(e.email.toLowerCase()) : undefined;
        return { value: e.id, label: `${e.first_name} ${e.last_name}${role ? ` (${role})` : ''}`, rank: role && /manager|supervisor|owner/i.test(role) ? 0 : 1 };
      })
      .sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label));
  }, [employees, members]);

  if (!canCreate) {
    return (
      <div className="px-7 py-6">
        <PermissionDenied />
      </div>
    );
  }

  const errors = validateAddEmployee(form, { today: todayDateString(now), canInvite });
  const errorOf = (field: AddEmployeeField): string | undefined => (showErrors ? errors[field] : undefined);
  const summary = addEmployeeSummary(form, { departments: departmentOptions, roles: roleOptions, managers: managerOptions });
  const set =
    <K extends keyof AddEmployeeForm>(key: K) =>
    (value: AddEmployeeForm[K]): void =>
      setForm((current) => ({ ...current, [key]: value }));

  const choosePhoto = (file: File | undefined): void => {
    if (photoInput.current) photoInput.current.value = '';
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) {
      show('Choose a PNG, JPG or WEBP image', 'error');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      show('Photos can be up to 2MB', 'error');
      return;
    }
    setPhoto({ file, url: URL.createObjectURL(file) });
  };

  const saveDraft = (): void => {
    try {
      window.localStorage.setItem(draftKey(branchId), JSON.stringify(form));
      show('Saved as draft');
    } catch {
      show("Couldn't save a draft in this browser", 'error');
    }
  };

  const submit = async (): Promise<void> => {
    setShowErrors(true);
    const missing = Object.values(errors);
    if (missing.length) {
      show(missing.length === 1 ? missing[0]! : `Fill in the ${missing.length} highlighted fields`, 'error');
      return;
    }
    if (!branchId) {
      show("You don't have a branch to add people to yet", 'error');
      return;
    }
    setSaving(true);
    let created: Employee;
    try {
      created = await createMutation.mutateAsync(createPayload(form, branchId));
    } catch (error) {
      setSaving(false);
      show(error instanceof Error ? error.message : 'Could not add the employee', 'error');
      return;
    }
    // The employee is saved; a photo or invite that fails afterwards is reported, never undone.
    const problems: string[] = [];
    if (photo && myContext) {
      try {
        const path = await uploadEmployeeAvatar(myContext.organizationId, created.id, photo.file);
        await updateMutation.mutateAsync({ employeeId: created.id, avatarUrl: path });
      } catch {
        problems.push('the photo didn’t upload');
      }
    }
    let invited = false;
    if (canInvite && form.sendCredentials) {
      try {
        await inviteMutation.mutateAsync(invitePayload(form, branchId));
        invited = true;
      } catch (error) {
        problems.push(error instanceof Error ? `the login invite failed: ${error.message}` : 'the login invite failed');
      }
    }
    try {
      window.localStorage.removeItem(draftKey(branchId));
    } catch {
      // Nothing to clear when storage is unavailable.
    }
    setSaving(false);
    const name = `${created.first_name} ${created.last_name}`;
    navigate(problems.length ? `/employees/${created.id}` : '/employees', {
      state: { toast: problems.length ? `${name} was added, but ${problems.join(' and ')}` : `Employee added${invited ? ' · login details sent' : ''}`, tone: problems.length ? 'error' : 'success' }
    });
  };

  const showLoginFields = canInvite;

  return (
    <div className="flex min-h-full flex-col text-[13px] text-[#38312B] [line-height:normal]">
      <OverviewHeader title="Add Employee" subtitle={`Add a new employee to ${branchName}.`} now={now} />

      <div className="flex flex-auto flex-col gap-[18px] bg-[#FDFCFB] px-7 pb-10 pt-[22px] max-[859px]:gap-3.5 max-[859px]:px-3.5 max-[859px]:pb-[84px] max-[859px]:pt-4">
        <button type="button" onClick={() => navigate('/employees')} className="flex cursor-pointer items-center gap-2 self-start border-0 bg-transparent p-0 text-[13px] font-bold text-[#C6420E]">
          ← Back to Employees
        </button>

        <div className="grid grid-cols-[minmax(0,1fr)_262px] items-start gap-4 max-[859px]:grid-cols-1">
          <div className="flex min-w-0 flex-col gap-4">
            <Section title="Personal Information" body="Basic details about the employee." icon="user" tone="primary">
              <div className={grid}>
                <FieldLabel label="Full Name" required error={errorOf('fullName')}>
                  <TextInput value={form.fullName} onChange={set('fullName')} placeholder="Enter full name" invalid={Boolean(errorOf('fullName'))} ariaLabel="Full Name" />
                </FieldLabel>
                <FieldLabel label="Employee ID (Optional)" note="Leave empty to auto-generate">
                  <TextInput value={form.employeeNumber} onChange={set('employeeNumber')} placeholder="Auto-generated or custom ID" ariaLabel="Employee ID" />
                </FieldLabel>
                <FieldLabel label="Email Address" required error={errorOf('email')}>
                  <TextInput value={form.email} onChange={set('email')} type="email" placeholder="Enter email address" invalid={Boolean(errorOf('email'))} ariaLabel="Email Address" />
                </FieldLabel>
                <FieldLabel label="Phone Number" required error={errorOf('phone')}>
                  <PhoneFields code={form.phoneCode} number={form.phone} onCode={set('phoneCode')} onNumber={set('phone')} placeholder="Enter phone number" invalid={Boolean(errorOf('phone'))} />
                </FieldLabel>
                <FieldLabel label="Date of Birth" required error={errorOf('dateOfBirth')}>
                  <DateButton value={form.dateOfBirth} onChange={set('dateOfBirth')} placeholder="Select date of birth" invalid={Boolean(errorOf('dateOfBirth'))} ariaLabel="Date of Birth" />
                </FieldLabel>
                <FieldLabel label="Gender" required error={errorOf('gender')}>
                  <SelectButton value={form.gender} options={GENDER_OPTIONS} placeholder="Select gender" onChange={set('gender')} invalid={Boolean(errorOf('gender'))} ariaLabel="Gender" />
                </FieldLabel>
              </div>
            </Section>

            <Section title="Work Information" body="Job and department details." icon="clipboard" tone="warn">
              <div className={grid}>
                <FieldLabel label="Department" required error={errorOf('departmentId')}>
                  <SelectButton
                    value={form.departmentId}
                    options={departmentOptions}
                    placeholder="Select department"
                    onChange={set('departmentId')}
                    invalid={Boolean(errorOf('departmentId'))}
                    ariaLabel="Department"
                    note={departmentOptions.length ? undefined : `${branchName} has no departments yet. Add them under Departments first.`}
                  />
                </FieldLabel>
                <FieldLabel label="Date of Joining" required error={errorOf('hireDate')}>
                  <DateButton value={form.hireDate} onChange={set('hireDate')} placeholder="Select date of joining" invalid={Boolean(errorOf('hireDate'))} ariaLabel="Date of Joining" />
                </FieldLabel>
                <FieldLabel label="Role" required error={errorOf('roleId')}>
                  <SelectButton
                    value={form.roleId}
                    options={roleOptions}
                    placeholder="Select role"
                    onChange={set('roleId')}
                    invalid={Boolean(errorOf('roleId'))}
                    ariaLabel="Role"
                    note={canInvite ? (roleOptions.length ? undefined : 'No roles can be given from your branch yet.') : 'Only people who manage members can give someone a login role.'}
                  />
                </FieldLabel>
                <FieldLabel label="Reports To (Optional)" note="The manager or supervisor this employee will report to">
                  <SelectButton
                    value={form.reportsToEmployeeId}
                    options={[...(form.reportsToEmployeeId ? [{ value: '', label: 'No one' }] : []), ...managerOptions]}
                    placeholder="Select manager or supervisor"
                    onChange={set('reportsToEmployeeId')}
                    ariaLabel="Reports To"
                  />
                </FieldLabel>
                <FieldLabel label="Employment Type (Optional)" note="e.g. Full-time, Part-time, Contract">
                  <SelectButton value={form.employmentType} options={EMPLOYMENT_TYPE_OPTIONS} placeholder="Select employment type" onChange={set('employmentType')} ariaLabel="Employment Type" />
                </FieldLabel>
              </div>
            </Section>

            <Section title="Account Information" body="Login details for the employee." icon="lock" tone="ok">
              <div className={grid}>
                <FieldLabel label="Login Email" required error={errorOf('loginEmail')} note="Used for employee login (can be same as email above)">
                  <input
                    type="email"
                    aria-label="Login Email"
                    aria-invalid={Boolean(errorOf('loginEmail')) || undefined}
                    disabled={!showLoginFields}
                    value={form.loginEmailEdited ? form.loginEmail : form.email}
                    placeholder="Enter login email address"
                    onChange={(event) => setForm((current) => ({ ...current, loginEmail: event.target.value, loginEmailEdited: true }))}
                    className={`box-border h-11 min-w-0 flex-auto rounded-[11px] border border-solid bg-white px-[13px] text-[13px] text-[#38312B] outline-none focus:border-[#F04E17] disabled:bg-[#FDFCFB] ${errorOf('loginEmail') ? 'border-[#C93A22]' : 'border-[#E4DED9]'}`}
                  />
                </FieldLabel>
              </div>
              <label className={`mt-3.5 flex items-start gap-2.5 ${showLoginFields ? 'cursor-pointer' : 'cursor-default opacity-70'}`}>
                <input
                  type="checkbox"
                  checked={showLoginFields && form.sendCredentials}
                  disabled={!showLoginFields}
                  onChange={(event) => set('sendCredentials')(event.target.checked)}
                  className="mx-0 mb-0 mt-0.5 size-4 cursor-pointer accent-[#F04E17]"
                />
                <span className="text-[12px] font-bold">
                  Send login credentials to this email
                  <span className="mt-0.5 block font-medium text-[#857A72]">
                    {showLoginFields ? 'Employee will receive an email with login details and setup instructions.' : 'Ask an admin to invite this employee from Members & Roles once they’re added.'}
                  </span>
                </span>
              </label>
            </Section>

            <div className="flex flex-wrap items-center gap-2.5 rounded-[16px] border border-solid border-[#EBE7E3] bg-white px-[18px] py-3.5">
              <button type="button" onClick={() => navigate('/employees')} className="h-11 cursor-pointer rounded-[12px] border border-solid border-[#EBE7E3] bg-white px-[18px] text-[13px] font-bold text-black">
                Cancel
              </button>
              <span className="ml-auto flex flex-wrap gap-2.5">
                <button type="button" onClick={saveDraft} className="h-11 cursor-pointer rounded-[12px] border border-solid border-[#EBE7E3] bg-white px-[17px] text-[13px] font-bold text-black">
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void submit()}
                  className="h-[46px] cursor-pointer rounded-[12px] border-0 bg-[#F04E17] px-[22px] text-[13.5px] font-bold text-white shadow-[0_12px_26px_-14px_rgba(240,78,23,.75)] disabled:opacity-70"
                >
                  {saving ? 'Adding…' : 'Add Employee'}
                </button>
              </span>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <section className="rounded-[16px] border border-solid border-[#EBE7E3] bg-white p-4">
              <h2 className="m-0 text-[14px] font-extrabold tracking-normal">Profile Photo (Optional)</h2>
              <p className="mb-3 mt-[5px] text-[11.5px] text-[#857A72]">Upload a profile photo for the employee.</p>
              <button
                type="button"
                onClick={() => photoInput.current?.click()}
                className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-[#E4DED9] bg-[#FDFCFB] px-3 py-[22px] hover:border-[#F04E17]"
              >
                {photo ? (
                  <img src={photo.url} alt="" className="block size-16 rounded-full object-cover" />
                ) : (
                  <span className="text-[#857A72]">
                    <ScheduleIcon name="upload" size={20} />
                  </span>
                )}
                <span className="text-[12px] font-bold text-[#57504A]">{photo ? 'Click to change' : 'Click to upload'}</span>
                <span className="text-[10.5px] text-[#A79C93]">{photo ? photo.file.name : 'PNG, JPG or WEBP (Max. 2MB)'}</span>
              </button>
              {photo ? (
                <button type="button" onClick={() => setPhoto(null)} className="mt-2 cursor-pointer border-0 bg-transparent p-0 text-[11.5px] font-bold text-[#C6420E]">
                  Remove photo
                </button>
              ) : null}
              <input ref={photoInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => choosePhoto(event.target.files?.[0])} />
            </section>

            <section className="rounded-[16px] border border-solid border-[#EBE7E3] bg-white p-4">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 flex-none items-center justify-center rounded-[10px] bg-[#FDF0E9] text-[#C6420E]">
                  <ScheduleIcon name="user" size={15} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-extrabold">Employee Summary</span>
                  <span className="mt-0.5 block text-[11px] text-[#857A72]">Review the details before adding.</span>
                </span>
              </div>
              <dl className="mb-0 mt-3.5 flex flex-col gap-2.5">
                {summary.map((row) => (
                  <div key={row.label} className="flex items-baseline gap-2">
                    <dt className="flex-none text-[11.5px] text-[#857A72]">{row.label}</dt>
                    <dd className="m-0 ml-auto min-w-0 truncate text-right text-[11.5px] font-bold" style={{ color: row.value === '—' ? '#A79C93' : '#38312B' }}>
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mb-0 mt-3.5 flex gap-[9px] rounded-[12px] border border-solid border-[#F3DCB8] bg-[#FEFAF3] px-3 py-[11px] text-[11px] leading-[1.5] text-[#8A5A12]">
                <span className="flex-none text-[#B77714]">
                  <ScheduleIcon name="info" size={16} />
                </span>
                <span>
                  <strong className="block font-extrabold text-[#7A4E0F]">Tip</strong>You can edit these details later from the employee profile.
                </span>
              </p>
            </section>
          </div>
        </div>
      </div>
      <ScheduleToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
