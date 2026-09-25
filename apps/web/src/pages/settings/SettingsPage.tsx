import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getCountryOptions } from '@shiftos/geography';
import { useSession } from '../../auth/SessionProvider.js';
import { useDefaultBranchId } from '../../auth/useDefaultBranchId.js';
import { useNavRole } from '../../layout/Sidebar.js';
import { HandoffModal } from '../../components/HandoffModal.js';
import { removeAvatar, uploadUserAvatar, useSignedAvatarUrl } from '../../lib/avatars.js';
import { supabase } from '../../lib/supabase.js';
import { useRpcMutation, useRpcQuery } from '../../lib/useRpc.js';
import type { Branch, Department, Employee, Organization, Role } from '../../types/domain.js';
import { OverviewHeader } from '../dashboard/manager/ManagerOverview.js';
import { useNow } from '../dashboard/manager/useManagerOverview.js';
import { DialogNote } from '../people/RolePeopleTable.js';
import { ScheduleToast, useScheduleToast } from '../scheduling/grid/ScheduleToast.js';
import { useMyEmployee } from '../staff/useStaffSelf.js';
import { initialsOf, TONES, type Tone } from '../scheduling/grid/scheduleFormat.js';
import {
  ACCESS_CHIPS,
  SUPERVISOR_ACCESS_CHIPS,
  attendanceRules,
  DAY_LABELS,
  DAYS,
  DEFAULT_HOURS,
  deviceName,
  hoursLine,
  notificationRows,
  passwordStrength,
  PASSWORD_RULES,
  preferenceMap,
  readHours,
  settingsTabs,
  TAB_SUBS,
  uploadedOn,
  validHours,
  type Day,
  type EventChannel,
  type EventPreferences,
  type EventType,
  type SettingsTab,
  type WeekHours
} from './settingsModel.js';

/*
 * Settings, built to the design handoff (`ShiftOS Dashboards.dc.html`:
 * `PAGES["Manager/Settings"]`, the settingsV2 markup at lines 2458-2685, its
 * renderVals 5506-5660 and the operating-hours dialog at 2739-2789). Every
 * tab reads and writes the real thing: the signed-in profile (update_profile),
 * the organization (update_organization), the home branch's hours
 * (branch.settings.operatingHours), per-event notification switches (067) and
 * the account password. The prototype has no CSS reset, so the values below
 * are what it renders (13px base, `line-height: normal`).
 */

const BUSINESS_TYPES = ['Supermarket', 'Retail Store', 'Restaurant', 'Pharmacy', 'Warehouse & Logistics', 'Hospitality', 'Healthcare', 'Manufacturing', 'Other'];

function timeZones(): string[] {
  const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
  try {
    return supported ? supported('timeZone') : ['Africa/Lagos', 'UTC'];
  } catch {
    return ['Africa/Lagos', 'UTC'];
  }
}

const pill = (tone: Tone): React.CSSProperties => ({ color: TONES[tone][0], backgroundColor: TONES[tone][1] });
const pillClass = 'inline-flex items-center gap-[5px] rounded-full px-2.5 py-1 text-[11px] font-bold';
const card = 'rounded-[16px] border border-solid border-[#EBE7E3] bg-white';
const h2 = 'm-0 text-[15px] font-extrabold tracking-normal';
const control = (disabled: boolean): string =>
  [
    'box-border h-11 w-full appearance-none rounded-[12px] border border-solid border-[#E4DED9] px-[13px] font-[inherit] text-[13.5px] outline-none focus:border-[#F04E17]',
    disabled ? 'bg-[#F7F4F1] text-[#857A72]' : 'bg-white text-[#38312B]'
  ].join(' ');

function Field({ label, note, full, children }: { label: string; note?: string; full?: boolean; children: React.ReactNode }): React.ReactElement {
  return (
    <label className={full ? 'col-[1/-1] block' : 'block'}>
      <span className="mb-1.5 block text-[12px] font-bold">{label}</span>
      {children}
      {note ? <span className="mt-1.5 block text-[11.5px] text-[#A79C93]">{note}</span> : null}
    </label>
  );
}

function Toggle({ on, label, disabled, onClick }: { on: boolean; label: string; disabled?: boolean; onClick: () => void }): React.ReactElement {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="relative h-[22px] w-[38px] cursor-pointer rounded-full border-0 p-0 disabled:cursor-not-allowed disabled:opacity-60"
      style={{ backgroundColor: on ? '#F04E17' : '#E4DED9' }}
    >
      <span className="absolute top-[3px] size-4 rounded-full bg-white shadow-[0_1px_3px_rgba(56,49,43,.3)]" style={{ left: on ? 19 : 3 }} />
    </button>
  );
}

const outlineButton = 'h-[34px] cursor-pointer rounded-[10px] border border-solid bg-white px-[13px] font-[inherit] text-[12px] font-bold';

export default function SettingsPage(): React.ReactElement {
  const now = useNow();
  const navRole = useNavRole();
  const { profile, authUser, myContext, activeOrganization, hasPermission, refresh } = useSession();
  const { toast, show, dismiss } = useScheduleToast();
  // Staff get the handoff's "My profile" (PAGES["Staff/Profile"]): the Profile tab alone, read-only — their record is kept by their supervisor.
  const isStaff = navRole === 'Staff';
  const tabs: SettingsTab[] = isStaff ? ['Profile'] : settingsTabs(hasPermission);
  const { employee: myEmployee } = useMyEmployee(isStaff);
  const employeePhotoUrl = useSignedAvatarUrl(isStaff ? myEmployee?.avatar_url : null);
  const [tab, setTab] = useState<SettingsTab>('Profile');
  const current = tabs.includes(tab) ? tab : 'Profile';

  const branchId = useDefaultBranchId() ?? '';
  const scoped = branchId ? { branchId } : undefined;
  const { data: branches } = useRpcQuery<Branch[]>('list_branches', undefined, { enabled: hasPermission('branches.read') });
  const branch = (branches ?? []).find((b) => b.id === branchId);
  const orgQuery = useRpcQuery<Organization>('get_organization', undefined, { enabled: hasPermission('organizations.read') });
  const organization = orgQuery.data;

  // ---------------- Profile
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  useEffect(() => {
    if (!profile) return;
    setFirst(profile.first_name);
    setLast(profile.last_name);
    setPhone(profile.phone ?? '');
    setJobTitle(profile.job_title ?? '');
  }, [profile]);
  const profileDirty =
    Boolean(profile) &&
    (first.trim() !== profile!.first_name || last.trim() !== profile!.last_name || phone.trim() !== (profile!.phone ?? '') || jobTitle.trim() !== (profile!.job_title ?? ''));
  const updateProfile = useRpcMutation<unknown, { firstName?: string; lastName?: string; phone?: string | null; jobTitle?: string | null; avatarUrl?: string | null }>('update_profile');
  const photoUrl = useSignedAvatarUrl(profile?.avatar_url);
  const fileInput = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const photoDate = uploadedOn(profile?.avatar_url);
  const myName = `${first} ${last}`.trim() || profile?.email || 'Me';

  const changePhoto = async (file: File | undefined): Promise<void> => {
    if (!file || !authUser) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return show('Choose a JPG, PNG or WebP image', 'error');
    if (file.size > 2 * 1024 * 1024) return show('That photo is over 2 MB', 'error');
    setPhotoBusy(true);
    try {
      const previous = profile?.avatar_url;
      const path = await uploadUserAvatar(authUser.id, file);
      await updateProfile.mutateAsync({ avatarUrl: path });
      if (previous) await removeAvatar(previous);
      await refresh();
      show('Photo updated');
    } catch (error) {
      show((error as Error).message || 'Could not upload that photo', 'error');
    } finally {
      setPhotoBusy(false);
    }
  };
  const removePhoto = async (): Promise<void> => {
    if (!profile?.avatar_url) return;
    setPhotoBusy(true);
    try {
      await updateProfile.mutateAsync({ avatarUrl: null });
      await removeAvatar(profile.avatar_url);
      await refresh();
      show('Photo removed · your initials are shown instead');
    } catch (error) {
      show((error as Error).message || 'Could not remove the photo', 'error');
    } finally {
      setPhotoBusy(false);
    }
  };

  // ---------------- Organization
  const canEditOrg = hasPermission('organizations.update');
  const [orgName, setOrgName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [country, setCountry] = useState('');
  const [timeZone, setTimeZone] = useState('');
  useEffect(() => {
    if (!organization) return;
    const meta = organization.metadata ?? {};
    setOrgName(organization.name);
    setBusinessType(typeof meta.businessType === 'string' ? meta.businessType : '');
    setCountry(typeof meta.country === 'string' ? meta.country : '');
    setTimeZone(typeof meta.timeZone === 'string' ? meta.timeZone : '');
  }, [organization]);
  const orgMeta = organization?.metadata ?? {};
  const orgDirty =
    Boolean(organization) &&
    (orgName.trim() !== organization!.name ||
      businessType !== (orgMeta.businessType ?? '') ||
      country !== (orgMeta.country ?? '') ||
      timeZone !== (orgMeta.timeZone ?? ''));
  const updateOrganization = useRpcMutation<Organization, { name: string; metadata?: Record<string, unknown> }>('update_organization', { invalidates: ['get_organization'] });
  const countries = useMemo(() => getCountryOptions(), []);
  const zones = useMemo(() => timeZones(), []);
  const { data: roles } = useRpcQuery<Role[]>('list_roles', undefined, { enabled: current === 'Organization' && hasPermission('org.members.manage') });
  const supervisorRole = (roles ?? []).find((r) => r.is_active && !r.deleted_at && /supervisor/i.test(r.name));
  const { data: supervisorCaps } = useRpcQuery<Record<string, boolean>>('get_role_capabilities', supervisorRole ? { roleId: supervisorRole.id } : undefined, {
    enabled: Boolean(supervisorRole)
  });
  const [danger, setDanger] = useState<'transfer' | 'delete' | null>(null);

  // ---------------- Branch hours
  const savedHours = readHours(branch?.settings);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [hoursDraft, setHoursDraft] = useState<WeekHours>(DEFAULT_HOURS);
  const updateBranch = useRpcMutation<Branch, { branchId: string; settings: Record<string, unknown> }>('update_branch', { invalidates: ['list_branches'] });
  const setDay = (day: Day, patch: Partial<WeekHours[Day]>): void => setHoursDraft((was) => ({ ...was, [day]: { ...was[day], ...patch } }));
  const saveHours = async (): Promise<void> => {
    if (!branch) return;
    if (!validHours(hoursDraft)) return show('Check your times — closing must be after opening', 'error');
    try {
      await updateBranch.mutateAsync({ branchId: branch.id, settings: { ...branch.settings, operatingHours: hoursDraft } });
      setHoursOpen(false);
      show('Operating hours saved');
    } catch (error) {
      show((error as Error).message, 'error');
    }
  };

  // ---------------- Notifications
  const prefsQuery = useRpcQuery<Array<{ event_type: EventType; channel: EventChannel; is_enabled: boolean }>>('get_my_notification_event_preferences', undefined, {
    enabled: hasPermission('notifications.read')
  });
  const savedPrefs = useMemo(() => preferenceMap(prefsQuery.data), [prefsQuery.data]);
  const [prefs, setPrefs] = useState<EventPreferences>(savedPrefs);
  useEffect(() => setPrefs(savedPrefs), [savedPrefs]);
  const changedPrefs = (Object.keys(prefs) as Array<keyof EventPreferences>).filter((key) => prefs[key] !== savedPrefs[key]);
  const setPref = useRpcMutation<unknown, { eventType: EventType; channel: EventChannel; isEnabled: boolean }>('set_my_notification_event_preference', {
    invalidates: ['get_my_notification_event_preferences']
  });

  // ---------------- Security
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const strength = passwordStrength(pw.next);
  const pwValid = strength.met === PASSWORD_RULES.length && Boolean(pw.current) && pw.confirm === pw.next;
  const mismatch = Boolean(pw.confirm) && pw.confirm !== pw.next;
  const [signedInAt, setSignedInAt] = useState<string | null>(null);
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      const session = (data as { session: { user?: { last_sign_in_at?: string } } | null }).session;
      setSignedInAt(session?.user?.last_sign_in_at ?? null);
    });
  }, []);
  const updatePassword = async (): Promise<void> => {
    if (!pwValid) return show('Fill in all three fields and meet every rule first.', 'error');
    if (!profile) return;
    setPwBusy(true);
    try {
      const check = await supabase.auth.signInWithPassword({ email: profile.email, password: pw.current });
      if (check.error) throw new Error('Your current password is not right.');
      const update = await supabase.auth.updateUser({ password: pw.next });
      if (update.error) throw new Error(update.error.message);
      setPw({ current: '', next: '', confirm: '' });
      show('Password updated');
    } catch (error) {
      show((error as Error).message, 'error');
    } finally {
      setPwBusy(false);
    }
  };
  const signOutOthers = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut({ scope: 'others' });
    if (error) show(error.message, 'error');
    else show('Signed out of every other device');
  };

  // ---------------- Billing
  const { data: employees } = useRpcQuery<Employee[]>('list_employees', scoped, { enabled: current === 'Billing' && hasPermission('employees.read') });
  const { data: departments } = useRpcQuery<Department[]>('list_departments', scoped, { enabled: current === 'Billing' && hasPermission('departments.read') });

  // ---------------- Save changes (one button for the tab you're on)
  const [saving, setSaving] = useState(false);
  const save = async (): Promise<void> => {
    if (saving) return;
    const dirty = current === 'Profile' ? profileDirty : current === 'Organization' ? orgDirty : current === 'Notifications' ? changedPrefs.length > 0 : false;
    if (!dirty) return show('Nothing to save — everything is up to date');
    setSaving(true);
    try {
      if (current === 'Profile') {
        if (!first.trim() || !last.trim()) throw new Error('First and last name are required.');
        await updateProfile.mutateAsync({ firstName: first.trim(), lastName: last.trim(), phone: phone.trim() || null, jobTitle: jobTitle.trim() || null });
        await refresh();
      } else if (current === 'Organization') {
        if (!orgName.trim()) throw new Error('The organization needs a name.');
        await updateOrganization.mutateAsync({ name: orgName.trim(), metadata: { ...orgMeta, businessType, country, timeZone } });
        await refresh();
      } else {
        for (const key of changedPrefs) {
          const [eventType, channel] = key.split(':') as [EventType, EventChannel];
          await setPref.mutateAsync({ eventType, channel, isEnabled: prefs[key] });
        }
      }
      show('Settings saved');
    } catch (error) {
      show((error as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // The Supervisor's header is the handoff's 'Main Branch · what you control'.
  const subtitle =
    navRole === 'Supervisor' && branch ? `${branch.name} · what you control` : [activeOrganization?.name ?? organization?.name, branch?.name].filter(Boolean).join(' · ');

  const staffFirst = myEmployee?.first_name ?? profile?.first_name ?? '';
  const staffLast = myEmployee?.last_name ?? profile?.last_name ?? '';
  const staffName = `${staffFirst} ${staffLast}`.trim() || profile?.email || 'Me';
  const staffProfileTab = (
    <>
      <div className="flex flex-wrap items-start gap-3 rounded-[16px] border border-solid border-[#CFE0FB] bg-[#F2F6FE] px-[17px] py-[15px]">
        <span aria-hidden="true" className="flex size-[30px] flex-none items-center justify-center rounded-full bg-[#2563EB] text-[14px] font-extrabold text-white">
          i
        </span>
        <div className="min-w-0 flex-[1_1_280px]">
          <p className="m-0 text-[13.5px] font-extrabold text-[#1F4699]">Your profile is read-only</p>
          <p className="mb-0 mt-[5px] text-[12.5px] leading-[1.5] text-[#1F4699]">
            To correct your name, phone number, photo or any employment detail, speak to your supervisor or a manager — they can update it for you. Changes appear here once they save them.
          </p>
        </div>
      </div>

      <section className={`${card} p-5`}>
        <h2 className={h2}>Profile photo</h2>
        <p className="mb-3.5 mt-[5px] text-[12.5px] text-[#857A72]">Optional. Without a photo, ShiftOS shows your initials everywhere your name appears.</p>
        <div className="flex flex-wrap items-center gap-4">
          {myEmployee?.avatar_url ? (
            <span className="flex size-[76px] flex-none items-center justify-center overflow-hidden rounded-full bg-[#FDF0E9] text-[22px] font-extrabold text-[#C6420E]">
              {employeePhotoUrl ? <img src={employeePhotoUrl} alt="" className="size-full object-cover" /> : initialsOf(staffName)}
            </span>
          ) : (
            // content-box, as in the handoff: the dashed border sits outside the 76px
            <span className="box-content flex size-[76px] flex-none items-center justify-center rounded-full border-[1.5px] border-dashed border-[#EBE7E3] bg-white text-[20px] font-extrabold text-[#A79C93]" />
          )}
          <div className="min-w-0 flex-[1_1_240px]">
            <p className="m-0 text-[12.5px] font-bold">
              {myEmployee?.avatar_url ? 'Photo on file · maintained by your supervisor.' : 'No photo — your initials are shown instead. Your supervisor can add one.'}
            </p>
            <p className="mb-0 mt-1 text-[11.5px] text-[#857A72]">JPG, PNG or WebP · max 2 MB · square images work best.</p>
          </div>
        </div>
      </section>

      <section className={`${card} p-5`}>
        <h2 className={`${h2} mb-3.5`}>Personal details</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
          <Field label="First name">
            <input type="text" className={control(true)} value={staffFirst} disabled />
          </Field>
          <Field label="Last name">
            <input type="text" className={control(true)} value={staffLast} disabled />
          </Field>
          <Field label="Work email" note="Contact support to change the email on your account." full>
            <input type="text" className={control(true)} value={profile?.email ?? ''} disabled />
          </Field>
          <Field label="Phone number">
            <input type="text" className={control(true)} value={myEmployee?.phone ?? profile?.phone ?? ''} disabled />
          </Field>
          <Field label="Job title">
            <input type="text" className={control(true)} value={profile?.job_title ?? ''} disabled />
          </Field>
          <Field label="Role" note="Granted by your organization — ask an owner or admin to change it." full>
            <input type="text" className={control(true)} value={myContext?.roleName ?? ''} disabled />
          </Field>
        </div>
      </section>
    </>
  );

  const profileTab = isStaff ? staffProfileTab : (
    <>
      <section className={`${card} p-5`}>
        <h2 className={h2}>Profile photo</h2>
        <p className="mb-3.5 mt-[5px] text-[12.5px] text-[#857A72]">Optional. Without a photo, ShiftOS shows your initials everywhere your name appears.</p>
        <div className="flex flex-wrap items-center gap-4">
          {profile?.avatar_url ? (
            <span className="flex size-[76px] flex-none items-center justify-center overflow-hidden rounded-full bg-[#FDF0E9] text-[22px] font-extrabold text-[#C6420E]">
              {photoUrl ? <img src={photoUrl} alt="" className="size-full object-cover" /> : initialsOf(myName)}
            </span>
          ) : (
            // content-box, as in the handoff: the dashed border sits outside the 76px
            <span className="box-content flex size-[76px] flex-none items-center justify-center rounded-full border-[1.5px] border-dashed border-[#EBE7E3] bg-white text-[20px] font-extrabold text-[#A79C93]" />
          )}
          <div className="min-w-0 flex-[1_1_240px]">
            <p className="m-0 text-[12.5px] font-bold">
              {profile?.avatar_url ? `Photo on file${photoDate ? ` · uploaded ${photoDate}` : ''}` : 'No photo — your initials are shown instead.'}
            </p>
            <p className="mb-0 mt-1 text-[11.5px] text-[#857A72]">JPG, PNG or WebP · max 2 MB · square images work best.</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void changePhoto(event.target.files?.[0])} />
              {profile?.avatar_url ? (
                <>
                  <button type="button" disabled={photoBusy} onClick={() => fileInput.current?.click()} className={`${outlineButton} border-[#EBE7E3] text-[#38312B]`}>
                    Replace photo
                  </button>
                  <button type="button" disabled={photoBusy} onClick={() => void removePhoto()} className={`${outlineButton} border-[#F3C6BD] text-[#C93A22]`}>
                    Remove photo
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={photoBusy}
                  onClick={() => fileInput.current?.click()}
                  className="h-[34px] cursor-pointer rounded-[10px] border-0 bg-[#F04E17] px-[13px] font-[inherit] text-[12px] font-bold text-white"
                >
                  {photoBusy ? 'Uploading…' : 'Upload photo'}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className={`${card} p-5`}>
        <h2 className={`${h2} mb-3.5`}>Personal details</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
          <Field label="First name">
            <input type="text" className={control(false)} value={first} onChange={(event) => setFirst(event.target.value)} autoComplete="given-name" />
          </Field>
          <Field label="Last name">
            <input type="text" className={control(false)} value={last} onChange={(event) => setLast(event.target.value)} autoComplete="family-name" />
          </Field>
          <Field label="Work email" note="Contact support to change the email on your account." full>
            <input type="text" className={control(true)} value={profile?.email ?? ''} disabled />
          </Field>
          <Field label="Phone number">
            <input type="text" className={control(false)} value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" />
          </Field>
          <Field label="Job title">
            <input type="text" className={control(false)} value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} autoComplete="organization-title" />
          </Field>
          <Field label="Role" note="Granted by your organization — ask an owner or admin to change it." full>
            <input type="text" className={control(true)} value={myContext?.roleName ?? ''} disabled />
          </Field>
        </div>
      </section>

      <section className={`${card} p-5`}>
        <h2 className={h2}>Your role and access</h2>
        <p className="mb-3.5 mt-[5px] text-[12.5px] text-[#857A72]">Roles are granted by a manager. You can see what you have, but not change it here.</p>
        <div className="flex flex-wrap gap-2">
          {(navRole === 'Supervisor' ? SUPERVISOR_ACCESS_CHIPS : ACCESS_CHIPS).map((chip) => {
            const on = hasPermission(chip.permission);
            return (
              <span
                key={chip.label}
                className="inline-flex items-center gap-2 rounded-full border border-solid px-[13px] py-2 text-[12px] font-bold"
                style={on ? { borderColor: '#BFE6CF', backgroundColor: '#E9F7EF', color: '#1E6B45' } : { borderColor: '#EBE7E3', backgroundColor: '#fff', color: '#A79C93' }}
              >
                <span
                  className={`flex size-4 flex-none items-center justify-center rounded-full text-[9px] font-extrabold ${on ? 'bg-[#2E9E62] text-white' : 'box-content border-[1.5px] border-solid border-[#EBE7E3] text-transparent'}`}
                >
                  {on ? '✓' : ''}
                </span>
                {chip.label}
              </span>
            );
          })}
        </div>
      </section>
    </>
  );

  const organizationTab = (
    <>
      <section className={`${card} p-5`}>
        <h2 className={`${h2} mb-3.5`}>Organization details</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
          <Field label="Organization name">
            <input type="text" className={control(!canEditOrg)} value={orgName} disabled={!canEditOrg} onChange={(event) => setOrgName(event.target.value)} />
          </Field>
          <Field label="Business type">
            <select className={control(!canEditOrg)} value={businessType} disabled={!canEditOrg} onChange={(event) => setBusinessType(event.target.value)}>
              <option value="">Not set</option>
              {BUSINESS_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </Field>
          <Field label="Workspace URL" note="Changing this breaks existing links for your team." full>
            <input type="text" className={control(true)} value={organization?.slug ?? ''} disabled />
          </Field>
          <Field label="Country">
            <select className={control(!canEditOrg)} value={country} disabled={!canEditOrg} onChange={(event) => setCountry(event.target.value)}>
              <option value="">Not set</option>
              {countries.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Time zone">
            <select className={control(!canEditOrg)} value={timeZone} disabled={!canEditOrg} onChange={(event) => setTimeZone(event.target.value)}>
              <option value="">Not set</option>
              {zones.map((zone) => (
                <option key={zone}>{zone}</option>
              ))}
            </select>
          </Field>
          <Field label="Week starts on">
            <input type="text" className={control(true)} value="Monday" disabled />
          </Field>
        </div>
      </section>

      <section className={`${card} p-5`}>
        <h2 className={h2}>Attendance rules</h2>
        <p className="mb-3.5 mt-[5px] text-[12.5px] text-[#857A72]">These thresholds decide when ShiftOS marks someone late or absent.</p>
        <div className="flex flex-col gap-[11px]">
          {attendanceRules(supervisorCaps ? Boolean(supervisorCaps.markAttendance) : null).map((rule) => (
            <div key={rule.label} className="flex flex-wrap items-center gap-3 rounded-[13px] border border-solid border-[#F2EEEA] bg-[#FDFCFB] px-3.5 py-[13px]">
              <span className="min-w-0 flex-[1_1_240px]">
                <span className="block text-[12.5px] font-extrabold">{rule.label}</span>
                <span className="block text-[11.5px] text-[#857A72]">{rule.body}</span>
              </span>
              <span className="ml-auto inline-flex items-center gap-[5px] rounded-full px-3.5 py-[7px] text-[12px] font-bold" style={pill(rule.tone)}>
                {rule.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {canEditOrg ? (
        <section className="rounded-[16px] border border-solid border-[#F3C6BD] bg-[#FEF8F6] p-5">
          <h2 className={`${h2} text-[#8E2A17]`}>Danger zone</h2>
          <p className="mb-3.5 mt-[5px] text-[12.5px] text-[#8E2A17]">These actions cannot be undone from inside ShiftOS.</p>
          <div className="flex flex-col gap-2.5">
            {(
              [
                ['transfer', 'Transfer organization ownership', 'Hand the Manager role to another member. You keep your account.', 'Transfer'],
                ['delete', 'Delete organization', 'Removes all people, schedules and attendance records. Export first.', 'Delete']
              ] as const
            ).map(([key, title, body, cta]) => (
              <div key={key} className="flex flex-wrap items-center gap-3 rounded-[13px] border border-solid border-[#F3C6BD] bg-white px-3.5 py-[13px]">
                <span className="min-w-0 flex-[1_1_240px]">
                  <span className="block text-[12.5px] font-extrabold">{title}</span>
                  <span className="block text-[11.5px] text-[#857A72]">{body}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setDanger(key)}
                  className="h-9 cursor-pointer rounded-[10px] border border-solid border-[#C93A22] bg-white px-3.5 font-[inherit] text-[12.5px] font-bold text-[#C93A22]"
                >
                  {cta}
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );

  const hoursTab = (
    <section className={`${card} p-5`}>
      <h2 className={`${h2} mb-3.5`}>Weekly operating hours</h2>
      <div className="flex flex-col gap-2">
        {DAYS.map((day) => (
          <div key={day} className="flex items-center gap-2 rounded-[12px] border border-solid border-[#F2EEEA] px-3.5 py-2.5">
            <span className="flex-[0_0_100px] text-[12.5px] font-bold">{DAY_LABELS[day]}</span>
            <span className="ml-auto text-[12.5px] text-[#57504A]">{hoursLine(savedHours, day)}</span>
          </div>
        ))}
      </div>
      {branch ? (
        <button
          type="button"
          onClick={() => {
            // Without branches.update the hours are read-only: say who sets them rather than open an editor that can't save.
            if (!hasPermission('branches.update')) {
              show('Branch hours are set by a manager — ask them to change these', 'error');
              return;
            }
            setHoursDraft(savedHours ?? DEFAULT_HOURS);
            setHoursOpen(true);
          }}
          className="mt-3.5 h-[38px] cursor-pointer rounded-[11px] border border-solid border-[#EBE7E3] bg-white px-[15px] font-[inherit] text-[12.5px] font-bold text-[#38312B]"
        >
          Edit hours
        </button>
      ) : null}
    </section>
  );

  const notificationsTab = (
    <section className={`${card} overflow-hidden`}>
      <div className="grid grid-cols-[minmax(0,1fr)_74px_74px_74px] gap-2.5 border-0 border-b border-solid border-[#F2EEEA] px-[18px] py-3 text-[10.5px] font-extrabold uppercase tracking-[.08em] text-[#A79C93]">
        <span>Notify me about</span>
        <span className="text-center">In app</span>
        <span className="text-center">Email</span>
        <span className="text-center">WhatsApp</span>
      </div>
      {notificationRows(navRole === 'Manager' || navRole === 'Supervisor' || navRole === 'Admin').map((row) => (
        <div key={row.event} className="grid grid-cols-[minmax(0,1fr)_74px_74px_74px] items-center gap-2.5 border-0 border-b border-solid border-[#F7F4F1] px-[18px] py-[13px]">
          <span className="min-w-0">
            <span className="block text-[12.5px] font-bold">{row.label}</span>
            <span className="block text-[11.5px] text-[#857A72]">{row.body}</span>
          </span>
          {(['in_app', 'email'] as const).map((channel) => {
            const key = `${row.event}:${channel}` as const;
            return (
              <span key={channel} className="flex justify-center">
                <Toggle on={prefs[key]} label={`${channel === 'in_app' ? 'In app' : 'Email'} notifications for ${row.label}`} onClick={() => setPrefs((was) => ({ ...was, [key]: !was[key] }))} />
              </span>
            );
          })}
          <span className="flex justify-center">
            <Toggle on={false} label={`WhatsApp notifications for ${row.label}`} disabled onClick={() => undefined} />
          </span>
        </div>
      ))}
      <p className="m-0 px-[18px] py-[13px] text-[11.5px] text-[#A79C93]">Email delivery starts once it’s connected for your organization. WhatsApp isn’t available yet.</p>
    </section>
  );

  const securityTab = (
    <>
      <section className={`${card} p-5`}>
        <h2 className={`${h2} mb-3.5`}>Password</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3.5">
          <Field label="Current password" full>
            <input
              type="password"
              className={control(false)}
              value={pw.current}
              placeholder="Enter your current password"
              autoComplete="current-password"
              onChange={(event) => setPw({ ...pw, current: event.target.value })}
            />
          </Field>
          <Field label="New password">
            <input type="password" className={control(false)} value={pw.next} placeholder="Create a new password" autoComplete="new-password" onChange={(event) => setPw({ ...pw, next: event.target.value })} />
          </Field>
          <Field label="Confirm new password">
            <input
              type="password"
              className={control(false)}
              style={mismatch ? { borderColor: '#C93A22' } : undefined}
              value={pw.confirm}
              placeholder="Repeat the new password"
              autoComplete="new-password"
              onChange={(event) => setPw({ ...pw, confirm: event.target.value })}
            />
          </Field>
        </div>
        <div className="mt-4 rounded-[13px] border border-solid border-[#F2EEEA] bg-[#FDFCFB] p-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[12px] font-bold text-[#857A72]">Password strength</span>
            <span className="text-[12px] font-extrabold" style={{ color: strength.color }}>
              {strength.label}
            </span>
            <span className="h-1.5 min-w-[100px] flex-[1_1_120px] overflow-hidden rounded-full bg-[#EFEAE6]">
              <span className="block h-full rounded-full" style={{ width: `${strength.met * 25}%`, backgroundColor: strength.color }} />
            </span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-[9px]">
          <button
            type="button"
            onClick={() => void updatePassword()}
            className={[
              'h-[42px] rounded-[11px] border-0 px-5 font-[inherit] text-[13px] font-bold text-white',
              pwValid && !pwBusy ? 'cursor-pointer bg-[#F04E17] shadow-[0_10px_22px_-13px_rgba(240,78,23,.75)]' : 'cursor-not-allowed bg-[#F5C4AF]'
            ].join(' ')}
          >
            {pwBusy ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </section>

      <section className={`${card} overflow-hidden`}>
        <div className="flex items-center gap-3 border-0 border-b border-solid border-[#F2EEEA] px-[18px] py-[15px]">
          <h2 className={h2}>Active sessions</h2>
          <button type="button" onClick={() => void signOutOthers()} className={`${outlineButton} ml-auto border-[#F3C6BD] text-[#C93A22]`}>
            Sign out all others
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-0 border-b border-solid border-[#F7F4F1] px-[18px] py-[13px]">
          <span className="min-w-0 flex-[1_1_220px]">
            <span className="block text-[12.5px] font-bold">{deviceName(typeof navigator === 'undefined' ? '' : navigator.userAgent)}</span>
            <span className="block text-[11.5px] text-[#857A72]">
              This device{signedInAt ? ` · signed in ${new Date(signedInAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
            </span>
          </span>
          <span className={`${pillClass} ml-auto`} style={pill('ok')}>
            Current
          </span>
        </div>
        <p className="m-0 px-[18px] py-[13px] text-[11.5px] text-[#A79C93]">Other devices signed in to your account are signed out by the button above.</p>
      </section>
    </>
  );

  const staffCount = (employees ?? []).filter((e) => e.is_active && !e.deleted_at).length;
  const billingTab = (
    <>
      <section className="rounded-[16px] border border-solid border-[#F7DFD1] bg-[#FEFAF7] p-5">
        <div className="flex flex-wrap items-start gap-3.5">
          <div className="min-w-0 flex-[1_1_260px]">
            <span className="inline-flex items-center rounded-full bg-[#F04E17] px-[11px] py-1 text-[10.5px] font-extrabold uppercase tracking-[.08em] text-white">Early access</span>
            <h2 className="mb-0 mt-3 text-[22px] font-extrabold tracking-[-0.025em]">
              ₦0 <span className="text-[13px] font-semibold text-[#857A72]">/ month</span>
            </h2>
            <p className="mb-0 mt-1.5 text-[12.5px] text-[#857A72]">Every feature is included while ShiftOS is in early access — nothing is billed.</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 border-0 border-t border-solid border-[#F7E3D6] pt-3.5">
          {[
            ['Employees', employees ? `${staffCount} of unlimited` : '—'],
            ['Departments', departments ? String(departments.filter((d) => d.is_active && !d.deleted_at).length) : '—'],
            ['Next invoice', 'None']
          ].map(([label, value]) => (
            <div key={label}>
              <p className="m-0 text-[10.5px] text-[#A79C93]">{label}</p>
              <p className="mb-0 mt-[3px] text-[15px] font-extrabold">{value}</p>
            </div>
          ))}
        </div>
      </section>
      <section className={`${card} overflow-hidden`}>
        <h2 className={`${h2} border-0 border-b border-solid border-[#F2EEEA] px-[18px] py-[15px]`}>Invoices</h2>
        <p className="m-0 px-[18px] py-[13px] text-[12.5px] text-[#857A72]">No invoices yet — nothing has been billed.</p>
      </section>
    </>
  );

  const body: Record<SettingsTab, React.ReactNode> = {
    Profile: profileTab,
    Organization: organizationTab,
    'Branch Hours': hoursTab,
    Notifications: notificationsTab,
    Security: securityTab,
    Billing: billingTab
  };

  return (
    <div className="flex min-h-full flex-col text-[13px] text-[#38312B] [line-height:normal]">
      {isStaff ? (
        <OverviewHeader title="My profile" subtitle={[staffName, profile?.job_title, branch?.name].filter(Boolean).join(' · ')} now={now} />
      ) : (
        <OverviewHeader title="Settings" subtitle={subtitle || 'Your account'} now={now} />
      )}
      <div className="flex flex-auto flex-col gap-[18px] bg-[#FDFCFB] px-7 pb-10 pt-[22px] max-[859px]:gap-3.5 max-[859px]:px-3.5 max-[859px]:pb-[84px] max-[859px]:pt-4">
        <div className="flex flex-wrap items-start gap-5">
          <nav aria-label="Settings" className="sticky top-0 flex min-w-[180px] flex-[0_1_200px] flex-col gap-0.5">
            {tabs.map((name) => {
              const active = name === current;
              return (
                <button
                  key={name}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setTab(name)}
                  className={[
                    'block w-full cursor-pointer rounded-[11px] border-0 px-3 py-[9px] text-left font-[inherit]',
                    active ? 'bg-[#F04E17] text-white' : 'bg-transparent text-[#857A72]'
                  ].join(' ')}
                >
                  <span className="block text-[13px] font-bold">{name}</span>
                  <span className="block text-[10.5px] font-semibold" style={{ color: active ? 'rgba(255,255,255,.78)' : '#A79C93' }}>
                    {TAB_SUBS[name]}
                  </span>
                </button>
              );
            })}
          </nav>
          <div className="flex min-w-0 flex-auto flex-col gap-4">
            {body[current]}
            {/* Nothing on a Staff profile can be edited here, so it has nothing to save. */}
            <div className={isStaff ? 'hidden' : 'flex flex-wrap justify-end gap-[9px] pt-1'}>
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className={[
                  'h-[42px] rounded-[11px] border-0 px-5 font-[inherit] text-[13px] font-bold text-white',
                  saving ? 'cursor-progress bg-[#F5A98A]' : 'cursor-pointer bg-[#F04E17] shadow-[0_10px_22px_-13px_rgba(240,78,23,.75)]'
                ].join(' ')}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {hoursOpen ? (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-[rgba(35,30,26,.5)] p-6 text-[13px] text-[#38312B] [line-height:normal]">
          <div role="dialog" aria-modal="true" aria-label="Operating hours" className="max-h-[88vh] w-full max-w-[560px] overflow-y-auto rounded-[20px] bg-white shadow-[0_40px_90px_-40px_rgba(35,30,26,.6)]">
            <div className="flex items-start gap-3 px-6 pt-[22px]">
              <div className="min-w-0 flex-auto">
                <h2 className="m-0 text-[19px] font-extrabold tracking-[-0.02em]">Operating hours</h2>
                <p className="mb-0 mt-1.5 text-[12.5px] text-[#857A72]">Weekly hours staff and reports rely on.</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setHoursOpen(false)}
                className="size-8 flex-none cursor-pointer rounded-[10px] border border-solid border-[#EBE7E3] bg-white font-[inherit] text-[14px] text-[#857A72]"
              >
                ✕
              </button>
            </div>
            <div className="mx-6 mt-[18px]">
              <p className="mb-2.5 mt-0 text-[11px] font-extrabold uppercase tracking-[.06em] text-[#A79C93]">Weekly operating hours</p>
              <div className="flex flex-col gap-2">
                {DAYS.map((day) => {
                  const row = hoursDraft[day];
                  return (
                    <div key={day} className="flex flex-wrap items-center gap-2.5 rounded-[12px] border border-solid border-[#F2EEEA] px-3 py-2.5">
                      <span className="flex-[0_0_84px] text-[12.5px] font-bold">{DAY_LABELS[day]}</span>
                      {row.closed ? (
                        <span className="flex-auto text-[12px] text-[#A79C93]">Closed all day</span>
                      ) : (
                        <>
                          <input
                            type="time"
                            aria-label={`${DAY_LABELS[day]} opens`}
                            value={row.open}
                            onChange={(event) => setDay(day, { open: event.target.value })}
                            className="h-9 rounded-[10px] border border-solid border-[#E4DED9] px-2.5 font-[inherit] text-[12.5px]"
                          />
                          <span className="text-[12px] text-[#A79C93]">to</span>
                          <input
                            type="time"
                            aria-label={`${DAY_LABELS[day]} closes`}
                            value={row.close}
                            onChange={(event) => setDay(day, { close: event.target.value })}
                            className="h-9 rounded-[10px] border border-solid border-[#E4DED9] px-2.5 font-[inherit] text-[12.5px]"
                          />
                        </>
                      )}
                      <label className="ml-auto flex cursor-pointer items-center gap-[7px] text-[11.5px] text-[#857A72]">
                        <input type="checkbox" checked={row.closed} onChange={() => setDay(day, { closed: !row.closed })} className="size-[15px] cursor-pointer accent-[#F04E17]" />
                        Closed
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-[9px] border-0 border-t border-solid border-[#F2EEEA] px-6 py-4">
              <button
                type="button"
                onClick={() => setHoursOpen(false)}
                className="h-11 cursor-pointer rounded-[12px] border border-solid border-[#EBE7E3] bg-white px-[17px] font-[inherit] text-[13.5px] font-bold text-[#38312B]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updateBranch.isPending}
                onClick={() => void saveHours()}
                className="h-11 cursor-pointer rounded-[12px] border-0 bg-[#F04E17] px-[19px] font-[inherit] text-[13.5px] font-extrabold text-white shadow-[0_12px_26px_-14px_rgba(240,78,23,.75)]"
              >
                {updateBranch.isPending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <HandoffModal
        open={danger !== null}
        title={danger === 'delete' ? 'Delete organization' : 'Transfer organization ownership'}
        subtitle="This can't be done from inside ShiftOS."
        primary="Done"
        onPrimary={() => setDanger(null)}
        onClose={() => setDanger(null)}
      >
        <DialogNote>
          {danger === 'delete'
            ? 'Deleting an organization removes every person, schedule and attendance record for good, so ShiftOS support does it with you. Export your reports first, then contact support from your account email.'
            : 'Ownership moves between two people, so ShiftOS support makes the change with both of you. Contact support from your account email with the member who should take over.'}
        </DialogNote>
      </HandoffModal>
      <ScheduleToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
