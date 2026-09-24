import React, { useMemo, useState } from 'react';
import { useSession } from '../../auth/SessionProvider.js';
import { DashHeader, StatusPill } from '../dashboard/dashboardWidgets.js';

const SETTINGS_TABS = ['Profile', 'Organization', 'Branch Hours', 'Notifications', 'Security', 'Billing'] as const;

type SettingsTab = (typeof SETTINGS_TABS)[number];

const PROFILE = {
  first: 'Daniel',
  last: 'Okonkwo',
  email: 'daniel@abcsupermarket.com',
  phone: '+234 801 442 7788',
  title: 'Operations Manager',
  role: 'Manager'
} as const;

type OrgField = {
  label: string;
  value: string;
  disabled?: boolean;
  note?: string;
};

const ORG_FIELDS: OrgField[] = [
  { label: 'Organization name', value: 'ABC Supermarket Ltd.' },
  { label: 'Business type', value: 'Supermarket' },
  { label: 'Workspace URL', value: 'abc-supermarket.shiftos.app', disabled: true, note: 'Changing this breaks existing links for your team.' },
  { label: 'Country', value: 'Nigeria' },
  { label: 'Time zone', value: 'Africa/Lagos (UTC +1)' },
  { label: 'Week starts on', value: 'Monday' }
];

const RULES = [
  { label: 'Late threshold', body: 'How long after the shift start a clock-in counts as late.', value: '10 minutes', tone: 'warn' },
  { label: 'Absent threshold', body: 'After this, an un-clocked employee is marked absent.', value: '60 minutes', tone: 'bad' },
  { label: 'Early clock-in window', body: 'How early staff may clock in before their shift.', value: '15 minutes', tone: 'info' },
  { label: 'Supervisor corrections', body: 'Supervisors may correct attendance for their department.', value: 'Allowed', tone: 'ok' }
] as const;

const DANGERS = [
  { title: 'Transfer organization ownership', body: 'Hand the Manager role to another member. You keep your account.', cta: 'Transfer' },
  { title: 'Delete organization', body: 'Removes all people, schedules and attendance records. Export first.', cta: 'Delete' }
] as const;

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const DAY_LABELS: Record<(typeof DAYS)[number], string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday'
};

const HOURS = {
  Mon: '09:00 – 18:00',
  Tue: '09:00 – 18:00',
  Wed: '09:00 – 18:00',
  Thu: '09:00 – 18:00',
  Fri: '09:00 – 18:00',
  Sat: 'Closed',
  Sun: 'Closed'
} as const;

const NOTIFICATIONS = [
  { label: 'Coverage gaps', body: 'A published shift loses its last assigned person.', channels: [true, true, false] },
  { label: 'Unpublished schedule', body: 'A week is still in draft two days before it starts.', channels: [true, true, false] },
  { label: 'Absences', body: 'Someone is marked absent on any shift.', channels: [true, false, false] },
  { label: 'Leave requests', body: 'Staff submit time off needing approval.', channels: [true, true, false] },
  { label: 'Announcement acknowledgements', body: 'Weekly digest of who hasn’t read what.', channels: [false, true, false] },
  { label: 'Invitations', body: 'An invitation is accepted or expires unused.', channels: [true, false, false] }
] as const;

const SESSIONS = [
  { device: 'Chrome on Windows · Lagos', meta: 'This device · last active just now', status: 'Current', tone: 'ok' },
  { device: 'Safari on iPhone · Lagos', meta: 'Last active 2 hours ago', status: 'Active', tone: 'info' },
  { device: 'Chrome on Android · Ibadan', meta: 'Last active 6 days ago', status: 'Idle', tone: 'warn' }
] as const;

const BILLING_STATS = [
  { label: 'Employees', value: '20 of unlimited' },
  { label: 'Departments', value: '6' },
  { label: 'Next invoice', value: '₦12,000 on 1 Sep' }
] as const;

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { label: 'Includes a number', test: (value: string) => /\d/.test(value) },
  { label: 'Includes a letter', test: (value: string) => /[A-Za-z]/.test(value) },
  { label: 'Includes a symbol', test: (value: string) => /[^A-Za-z0-9]/.test(value) }
] as const;

const INVOICES = [
  { period: 'August 2026', ref: 'INV-2026-08-014', amount: '₦12,000', status: 'Paid', tone: 'ok' },
  { period: 'July 2026', ref: 'INV-2026-07-014', amount: '₦12,000', status: 'Paid', tone: 'ok' },
  { period: 'June 2026', ref: 'INV-2026-06-014', amount: '₦12,000', status: 'Paid', tone: 'ok' },
  { period: 'May 2026', ref: 'INV-2026-05-014', amount: '₦12,000', status: 'Refunded', tone: 'warn' }
] as const;

const TONE_PILL: Record<'ok' | 'warn' | 'bad' | 'info', string> = {
  ok: 'bg-success-50 text-success-600',
  warn: 'bg-warning-50 text-warning-600',
  bad: 'bg-error-50 text-error-600',
  info: 'bg-info-50 text-info-600'
};

function SettingPill({ tone, children }: { tone: 'ok' | 'warn' | 'bad' | 'info'; children: React.ReactNode }): React.ReactElement {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${TONE_PILL[tone]}`}>{children}</span>;
}

export default function SettingsPage(): React.ReactElement {
  const { hasPermission, myContext } = useSession();
  const [tab, setTab] = useState<SettingsTab>('Profile');
  const [channels, setChannels] = useState(() => NOTIFICATIONS.map((row) => row.channels.slice()));
  const [photoPresent, setPhotoPresent] = useState(true);
  const [saved, setSaved] = useState(false);
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' });

  const canAccessOrgSettings = hasPermission('organizations.read');
  const isLeader = myContext?.branchAccess.isOrgWide ?? false;

  const photoText = photoPresent ? 'DO' : '';
  const passwordScore = PASSWORD_RULES.filter((rule) => rule.test(password.next)).length;
  const passwordTone = passwordScore <= 1 ? 'text-[#C93A22]' : passwordScore === 2 ? 'text-[#B56A00]' : passwordScore === 3 ? 'text-[#1E6B45]' : 'text-[#1E6B45]';
  const passwordLabel = password.next.length === 0 ? 'Enter a password' : passwordScore <= 1 ? 'Weak' : passwordScore === 2 ? 'Fair' : passwordScore === 3 ? 'Good' : 'Strong';
  const passwordBarWidth = password.next.length === 0 ? '0%' : `${(passwordScore / PASSWORD_RULES.length) * 100}%`;
  const passwordBarClass = password.next.length === 0 ? 'bg-neutral-200' : passwordScore <= 1 ? 'bg-[#C93A22]' : passwordScore === 2 ? 'bg-[#D18800]' : passwordScore === 3 ? 'bg-[#1E6B45]' : 'bg-[#1E6B45]';

  const content = useMemo(() => {
    switch (tab) {
      case 'Profile':
        return (
          <>
            <section className="rounded-[16px] border border-[#EBE7E3] bg-white p-5">
              <h2 className="m-0 text-[15px] font-extrabold text-neutral-900">Profile photo</h2>
              <p className="mt-[5px] text-[12.5px] text-[#857A72]">Optional. Without a photo, ShiftOS shows your initials everywhere your name appears.</p>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <span className={`flex h-[76px] w-[76px] items-center justify-center rounded-full text-[22px] font-extrabold ${photoPresent ? 'bg-[#F9E5DD] text-[#1F4699]' : 'border border-dashed border-neutral-300 bg-white text-neutral-400'}`}>
                  {photoText || '+'}
                </span>
                <div className="min-w-0 flex-1 basis-[240px]">
                  <p className="m-0 text-[12.5px] font-bold text-neutral-900">{photoPresent ? 'Photo on file · uploaded 4 Aug 2026' : 'No photo — your initials are shown instead.'}</p>
                  <p className="mt-1 text-[11.5px] text-[#857A72]">JPG, PNG or WebP · max 2 MB · square images work best.</p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {photoPresent ? (
                      <>
                        <button type="button" className="h-[34px] cursor-pointer rounded-[10px] border border-[#EBE7E3] bg-white px-[13px] text-[12px] font-bold text-neutral-900">Replace photo</button>
                        <button type="button" onClick={() => setPhotoPresent(false)} className="h-[34px] cursor-pointer rounded-[10px] border border-[#F3C6BD] bg-white px-[13px] text-[12px] font-bold text-[#C93A22]">Remove photo</button>
                      </>
                    ) : (
                      <button type="button" onClick={() => setPhotoPresent(true)} className="h-[34px] cursor-pointer rounded-[10px] border-0 bg-brand-500 px-[13px] text-[12px] font-bold text-white">Upload photo</button>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[16px] border border-[#EBE7E3] bg-white p-5">
              <h2 className="m-0 mb-3.5 text-[15px] font-extrabold text-neutral-900">Personal details</h2>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[14px]">
                {[
                  { label: 'First name', value: PROFILE.first },
                  { label: 'Last name', value: PROFILE.last },
                  { label: 'Work email', value: PROFILE.email, disabled: true, note: 'Contact support to change the email on your account.' },
                  { label: 'Phone number', value: PROFILE.phone },
                  { label: 'Job title', value: PROFILE.title },
                  { label: 'Role', value: PROFILE.role, disabled: true, note: 'Granted when the organization was created.' }
                ].map((field) => (
                  <label key={field.label} className={field.note ? 'col-span-full' : ''}>
                    <span className="mb-1.5 block text-[12px] font-bold text-neutral-900">{field.label}</span>
                    <input
                      value={field.value}
                      disabled={field.disabled}
                      className={`h-[44px] w-full rounded-[12px] border px-[13px] text-[13.5px] outline-none ${field.disabled ? 'border-neutral-200 bg-[#F7F4F1] text-neutral-500' : 'border-[#E4DED9] bg-white text-neutral-900 focus:border-brand-500'}`}
                    />
                    {field.note ? <span className="mt-1.5 block text-[11.5px] text-[#A79C93]">{field.note}</span> : null}
                  </label>
                ))}
              </div>
            </section>

            {isLeader ? (
              <section className="rounded-[16px] border border-[#EBE7E3] bg-white p-5">
                <h2 className="m-0 text-[15px] font-extrabold text-neutral-900">Your role and access</h2>
                <p className="mt-[5px] text-[12.5px] text-[#857A72]">Roles are granted by a manager. You can see what you have, but not change it here.</p>
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {[
                    { label: 'Manage schedules', on: true },
                    { label: 'Mark attendance', on: true },
                    { label: 'Assign tasks', on: true },
                    { label: 'Post announcements', on: true },
                    { label: 'View reports', on: true },
                    { label: 'Manage members', on: true },
                    { label: 'Change billing', on: true }
                  ].map((item) => (
                    <span key={item.label} className={`inline-flex items-center gap-2 rounded-full border px-[13px] py-[8px] text-[12px] font-bold ${item.on ? 'border-[#BFE6CF] bg-[#E9F7EF] text-[#1E6B45]' : 'border-neutral-200 bg-white text-neutral-400'}`}>
                      <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-extrabold ${item.on ? 'bg-[#1E6B45] text-white' : 'border border-neutral-200 text-transparent'}`}>
                        {item.on ? '✓' : ''}
                      </span>
                      {item.label}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        );
      case 'Organization':
        return (
          <>
            <section className="rounded-[16px] border border-[#EBE7E3] bg-white p-5">
              <h2 className="m-0 mb-3.5 text-[15px] font-extrabold text-neutral-900">Organization details</h2>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[14px]">
                {ORG_FIELDS.map((field) => (
                  <label key={field.label} className={field.note ? 'col-span-full' : ''}>
                    <span className="mb-1.5 block text-[12px] font-bold text-neutral-900">{field.label}</span>
                    <input
                      value={field.value}
                      disabled={field.disabled}
                      className={`h-[44px] w-full rounded-[12px] border px-[13px] text-[13.5px] outline-none ${field.disabled ? 'border-neutral-200 bg-[#F7F4F1] text-neutral-500' : 'border-[#E4DED9] bg-white text-neutral-900 focus:border-brand-500'}`}
                    />
                    {field.note ? <span className="mt-1.5 block text-[11.5px] text-[#A79C93]">{field.note}</span> : null}
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-[16px] border border-[#EBE7E3] bg-white p-5">
              <h2 className="m-0 text-[15px] font-extrabold text-neutral-900">Attendance rules</h2>
              <p className="mt-[5px] text-[12.5px] text-[#857A72]">These thresholds decide when ShiftOS marks someone late or absent.</p>
              <div className="mt-3.5 flex flex-col gap-2.5">
                {RULES.map((rule) => (
                  <div key={rule.label} className="flex flex-wrap items-center gap-3 rounded-[13px] border border-[#F2EEEA] bg-[#FDFCFB] p-[13px_14px]">
                    <span className="min-w-0 flex-1 basis-[240px]">
                      <span className="block text-[12.5px] font-extrabold text-neutral-900">{rule.label}</span>
                      <span className="mt-0.5 block text-[11.5px] text-[#857A72]">{rule.body}</span>
                    </span>
                    <SettingPill tone={rule.tone as 'ok' | 'warn' | 'bad' | 'info'}>{rule.value}</SettingPill>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[16px] border border-[#F3C6BD] bg-[#FEF8F6] p-5">
              <h2 className="m-0 text-[15px] font-extrabold text-[#8E2A17]">Danger zone</h2>
              <p className="mt-[5px] text-[12.5px] text-[#8E2A17]">These actions cannot be undone from inside ShiftOS.</p>
              <div className="mt-3.5 flex flex-col gap-2.5">
                {DANGERS.map((danger) => (
                  <div key={danger.title} className="flex flex-wrap items-center gap-3 rounded-[13px] border border-[#F3C6BD] bg-white p-[13px_14px]">
                    <span className="min-w-0 flex-1 basis-[240px]">
                      <span className="block text-[12.5px] font-extrabold text-neutral-900">{danger.title}</span>
                      <span className="mt-0.5 block text-[11.5px] text-[#857A72]">{danger.body}</span>
                    </span>
                    <button type="button" className="h-[36px] cursor-pointer rounded-[10px] border border-[#C93A22] bg-white px-[14px] text-[12px] font-bold text-[#C93A22]">{danger.cta}</button>
                  </div>
                ))}
              </div>
            </section>
          </>
        );
      case 'Branch Hours':
        return (
          <section className="rounded-[16px] border border-[#EBE7E3] bg-white p-5">
            <h2 className="m-0 mb-3.5 text-[15px] font-extrabold text-neutral-900">Weekly operating hours</h2>
            <div className="flex flex-col gap-2">
              {DAYS.map((day) => (
                <div key={day} className="flex items-center gap-2 rounded-[12px] border border-[#F2EEEA] p-[10px_14px]">
                  <span className="w-[100px] text-[12.5px] font-bold text-neutral-900">{DAY_LABELS[day]}</span>
                  <span className="ml-auto text-[12.5px] text-[#57504A]">{HOURS[day]}</span>
                </div>
              ))}
            </div>
            <button type="button" className="mt-3.5 h-[38px] cursor-pointer rounded-[11px] border border-[#EBE7E3] bg-white px-[15px] text-[12.5px] font-bold text-neutral-900">Edit hours</button>
          </section>
        );
      case 'Notifications':
        return (
          <section className="overflow-hidden rounded-[16px] border border-[#EBE7E3] bg-white">
            <div className="grid grid-cols-[minmax(0,1fr)_74px_74px_74px] gap-2.5 border-b border-[#F2EEEA] px-[18px] py-[12px] text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-[#A79C93]">
              <span>Notify me about</span>
              <span className="text-center">In app</span>
              <span className="text-center">Email</span>
              <span className="text-center">WhatsApp</span>
            </div>
            {NOTIFICATIONS.map((item, rowIndex) => (
              <div key={item.label} className="grid grid-cols-[minmax(0,1fr)_74px_74px_74px] items-center gap-2.5 border-b border-[#F7F4F1] px-[18px] py-[13px] last:border-b-0">
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-bold text-neutral-900">{item.label}</span>
                  <span className="mt-0.5 block text-[11.5px] text-[#857A72]">{item.body}</span>
                </span>
                {['In app', 'Email', 'WhatsApp'].map((label, index) => {
                  const enabled = channels[rowIndex]?.[index] ?? item.channels[index];
                  return (
                    <span key={label} className="flex justify-center">
                      <button
                        type="button"
                        aria-label={`${label} notifications for ${item.label}`}
                        aria-checked={enabled}
                        onClick={() => {
                          setChannels((prev) => {
                            const next = prev.map((row) => row.slice());
                            next[rowIndex][index] = !next[rowIndex][index];
                            return next;
                          });
                        }}
                        className={`relative h-[22px] w-[38px] rounded-full border-0 p-0 ${enabled ? 'bg-[#F04E17]' : 'bg-[#E4DED9]'}`}
                      >
                        <span className={`absolute top-[3px] h-[16px] w-[16px] rounded-full bg-white shadow-sm ${enabled ? 'left-[19px]' : 'left-[3px]'}`} />
                      </button>
                    </span>
                  );
                })}
              </div>
            ))}
            <p className="m-0 px-[18px] py-[13px] text-[11.5px] text-[#A79C93]">WhatsApp delivery is available on Professional and Enterprise plans.</p>
          </section>
        );
      case 'Security':
        return (
          <>
            <section className="rounded-[16px] border border-[#EBE7E3] bg-white p-5">
              <h2 className="m-0 text-[15px] font-extrabold text-neutral-900">Password</h2>
              <p className="mt-[5px] text-[12.5px] text-[#857A72]">Change the password for your ShiftOS account. This is separate from anything your organization can change.</p>
              <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-[14px]">
                {[
                  { label: 'Current password', placeholder: 'Enter your current password', type: 'password', field: 'current' },
                  { label: 'New password', placeholder: 'Create a new password', type: 'password', field: 'next' },
                  { label: 'Confirm new password', placeholder: 'Repeat the new password', type: 'password', field: 'confirm' }
                ].map((field) => (
                  <label key={field.label} className={field.field === 'current' ? 'col-span-full' : ''}>
                    <span className="mb-1.5 block text-[12px] font-bold text-neutral-900">{field.label}</span>
                    <input
                      type={field.type}
                      placeholder={field.placeholder}
                      value={password[field.field as 'current' | 'next' | 'confirm']}
                      onChange={(event) => setPassword((prev) => ({ ...prev, [field.field]: event.target.value }))}
                      className="h-[44px] w-full rounded-[12px] border border-[#E4DED9] bg-white px-[13px] text-[13.5px] outline-none focus:border-brand-500"
                    />
                  </label>
                ))}
              </div>
              <div className="mt-4 rounded-[13px] border border-[#F2EEEA] bg-[#FDFCFB] p-[14px]">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[12px] font-bold text-[#857A72]">Password strength</span>
                  <span className={`text-[12px] font-extrabold ${passwordTone}`}>{passwordLabel}</span>
                  <div className="min-w-[120px] flex-1">
                    <div className="h-[6px] overflow-hidden rounded-full bg-[#EFEAE6]">
                      <div className={`h-full rounded-full ${passwordBarClass}`} style={{ width: passwordBarWidth }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {PASSWORD_RULES.map((rule) => {
                  const met = rule.test(password.next);
                  return (
                    <span key={rule.label} className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-[11px] font-bold ${met ? 'border-[#BFE6CF] bg-[#E9F7EF] text-[#1E6B45]' : 'border-neutral-200 bg-white text-[#857A72]'}`}>
                      <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${met ? 'bg-[#1E6B45] text-white' : 'border border-neutral-200 bg-white text-transparent'}`}>{met ? '✓' : ''}</span>
                      {rule.label}
                    </span>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="h-[42px] cursor-pointer rounded-[11px] bg-brand-500 px-5 text-[13px] font-bold text-white">Update password</button>
              </div>
            </section>

            <section className="rounded-[16px] border border-[#EBE7E3] bg-white overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-[#F2EEEA] px-[18px] py-[15px]">
                <h2 className="m-0 text-[15px] font-extrabold text-neutral-900">Active sessions</h2>
                <button type="button" className="h-[34px] cursor-pointer rounded-[10px] border border-[#F3C6BD] bg-white px-[13px] text-[12px] font-bold text-[#C93A22]">Sign out all others</button>
              </div>
              {SESSIONS.map((session) => (
                <div key={session.device} className="flex flex-wrap items-center gap-3 border-b border-[#F7F4F1] px-[18px] py-[13px] last:border-b-0">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-bold text-neutral-900">{session.device}</span>
                    <span className="mt-0.5 block text-[11.5px] text-[#857A72]">{session.meta}</span>
                  </span>
                  <SettingPill tone={session.tone as 'ok' | 'warn' | 'info'}>{session.status}</SettingPill>
                </div>
              ))}
            </section>
          </>
        );
      case 'Billing':
        return (
          <>
            <section className="rounded-[16px] border border-[#F7DFD1] bg-[#FEFAF7] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center rounded-full bg-brand-500 px-[11px] py-[4px] text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-white">Professional</span>
                  <h2 className="mt-[12px] text-[22px] font-extrabold tracking-[-0.025em] text-neutral-900">
                    ₦12,000 <span className="text-[13px] font-semibold text-[#857A72]">/ month</span>
                  </h2>
                  <p className="mt-[6px] text-[12.5px] text-[#857A72]">Unlimited employees · announcements and leave requests.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="h-[40px] cursor-pointer rounded-[11px] bg-brand-500 px-4 text-[12.5px] font-bold text-white">Change plan</button>
                  <button type="button" className="h-[40px] cursor-pointer rounded-[11px] border border-[#EBE7E3] bg-white px-[15px] text-[12.5px] font-bold text-neutral-900">Cancel subscription</button>
                </div>
              </div>
              <div className="mt-4 grid gap-3 border-t border-[#F7E3D6] pt-[14px] sm:grid-cols-3">
                {BILLING_STATS.map((item) => (
                  <div key={item.label}>
                    <p className="m-0 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#A79C93]">{item.label}</p>
                    <p className="mt-[3px] text-[15px] font-extrabold text-neutral-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-[16px] border border-[#EBE7E3] bg-white">
              <div className="border-b border-[#F2EEEA] px-[18px] py-[15px]">
                <h2 className="m-0 text-[15px] font-extrabold text-neutral-900">Invoices</h2>
              </div>
              {INVOICES.map((invoice) => (
                <div key={invoice.ref} className="flex flex-wrap items-center gap-3 border-b border-[#F7F4F1] px-[18px] py-[13px] last:border-b-0">
                  <span className="min-w-0 flex-1 basis-[200px]">
                    <span className="block text-[12.5px] font-bold text-neutral-900">{invoice.period}</span>
                    <span className="mt-0.5 block text-[11.5px] text-[#857A72]">{invoice.ref}</span>
                  </span>
                  <span className="text-[12.5px] font-extrabold text-neutral-900">{invoice.amount}</span>
                  <SettingPill tone={invoice.tone as 'ok' | 'warn'}>{invoice.status}</SettingPill>
                </div>
              ))}
            </section>
          </>
        );
      default:
        return null;
    }
  }, [tab, channels, photoPresent]);

  if (!canAccessOrgSettings) {
    return (
      <div className="px-4 pb-10 pt-[72px] sm:px-6 lg:px-8">
        <DashHeader title="Settings" subtitle="ABC Supermarket Ltd. · Main Branch" />
        <div className="rounded-[16px] border border-dashed border-neutral-200 bg-white px-6 py-10 text-center">
          <p className="text-[15px] font-extrabold text-neutral-900">Settings aren’t available for this account</p>
          <p className="mt-2 text-[12.5px] text-neutral-500">Ask a manager to grant access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-10 pt-[72px] sm:px-6 lg:px-8">
      <DashHeader title="Settings" subtitle="ABC Supermarket Ltd. · Main Branch" />

      <div className="mt-4 flex flex-wrap items-start gap-5">
        <nav className="sticky top-0 min-w-[180px] flex-[0_1_200px] rounded-[12px] border border-[#EBE7E3] bg-white p-1 shadow-none">
          {SETTINGS_TABS.map((label) => {
            const active = label === tab;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setTab(label)}
                className={`block w-full rounded-[10px] px-[12px] py-[9px] text-left transition-colors ${active ? 'bg-[#F04E17] text-white shadow-[0_8px_18px_-12px_rgba(240,78,23,0.8)]' : 'bg-transparent text-[#857A72]'}`}
              >
                <span className="block text-[13px] font-bold">{label}</span>
                <span className={`mt-0.5 block text-[10.5px] ${active ? 'text-white/80' : 'text-[#A79C93]'}`}>
                  {label === 'Profile' ? 'Your details and photo' : label === 'Organization' ? 'Name, branding, attendance rules' : label === 'Branch Hours' ? 'Weekly hours and address' : label === 'Notifications' ? 'In-app, email and WhatsApp' : label === 'Security' ? 'Password and sessions' : 'Plan and invoices'}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1 space-y-4">{content}</div>
      </div>

      {saved ? <p className="mt-4 text-[12px] font-medium text-success-600">Settings saved.</p> : null}
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => setSaved(true)}
          className="h-[42px] cursor-pointer rounded-[11px] bg-brand-500 px-5 text-[13px] font-bold text-white shadow-[0_10px_22px_-13px_rgba(240,78,23,0.75)]"
        >
          Save changes
        </button>
      </div>
    </div>
  );
}
