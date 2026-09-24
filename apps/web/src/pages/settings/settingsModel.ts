import type { Tone } from '../scheduling/grid/scheduleFormat.js';

/*
 * The Settings page's pure helpers, after the design handoff's settingsV2
 * ("Manager/Settings": STNG_TAB_META, STNG_PERMISSIONS, STNG_RULES,
 * STNG_NOTIFICATIONS and the operating-hours dialog). Everything here is what
 * ShiftOS actually does — the attendance rules describe the real late/absent
 * behaviour, the notification rows are the events it really sends.
 */

export type SettingsTab = 'Profile' | 'Organization' | 'Branch Hours' | 'Notifications' | 'Security' | 'Billing';

export const TAB_SUBS: Record<SettingsTab, string> = {
  Profile: 'Your details and photo',
  Organization: 'Name, branding, attendance rules',
  'Branch Hours': 'Weekly hours and address',
  Notifications: 'In-app, email and WhatsApp',
  Security: 'Password and sessions',
  Billing: 'Plan and invoices'
};

/** The tabs a person sees: everyone has Profile, Notifications and Security; the rest follow their permissions. */
export function settingsTabs(can: (code: string) => boolean): SettingsTab[] {
  const tabs: SettingsTab[] = ['Profile'];
  if (can('organizations.read')) tabs.push('Organization');
  if (can('branches.read')) tabs.push('Branch Hours');
  tabs.push('Notifications', 'Security');
  if (can('organizations.update')) tabs.push('Billing');
  return tabs;
}

/** Handoff STNG_PERMISSIONS.Supervisor, each backed by the permission that grants it. */
export const SUPERVISOR_ACCESS_CHIPS: Array<{ label: string; permission: string }> = [
  { label: 'Manage schedules', permission: 'schedules.update' },
  { label: 'Mark attendance', permission: 'attendance.update' },
  { label: 'Assign tasks', permission: 'tasks.assign' },
  { label: 'Post announcements', permission: 'announcements.create' },
  { label: 'Approve swaps', permission: 'swaps.approve' },
  { label: 'Organization settings', permission: 'organizations.update' },
  { label: 'Change billing', permission: 'organizations.update' }
];

/** Handoff STNG_PERMISSIONS.Manager, each backed by the permission that grants it. */
export const ACCESS_CHIPS: Array<{ label: string; permission: string }> = [
  { label: 'Manage schedules', permission: 'schedules.update' },
  { label: 'Mark attendance', permission: 'attendance.update' },
  { label: 'Assign tasks', permission: 'tasks.assign' },
  { label: 'Post announcements', permission: 'announcements.create' },
  { label: 'View reports', permission: 'reports.read' },
  { label: 'Manage members', permission: 'org.members.manage' },
  { label: 'Change settings', permission: 'organizations.update' }
];

export interface AttendanceRule {
  label: string;
  body: string;
  value: string;
  tone: Tone;
}

/**
 * The rules ShiftOS applies today (migration 047 and AttendanceService): lateness
 * starts at the shift's start time with no grace period, absences are marked by
 * a person, clock-in isn't limited to a window, and corrections follow the
 * supervisor role's Mark attendance permission.
 */
export function attendanceRules(supervisorsCanCorrect: boolean | null): AttendanceRule[] {
  return [
    { label: 'Late threshold', body: 'A clock-in after the shift start counts as late — there is no grace period.', value: '0 minutes', tone: 'warn' },
    { label: 'Absent threshold', body: 'Nobody is marked absent automatically — a supervisor marks it from Attendance.', value: 'Manual', tone: 'bad' },
    { label: 'Early clock-in window', body: 'Staff can clock in for an assigned shift at any time before it starts.', value: 'No limit', tone: 'info' },
    {
      label: 'Supervisor corrections',
      body: 'Supervisors may correct attendance for their department.',
      value: supervisorsCanCorrect === null ? 'Set per role' : supervisorsCanCorrect ? 'Allowed' : 'Not allowed',
      tone: supervisorsCanCorrect === false ? 'neutral' : 'ok'
    }
  ];
}

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export type Day = (typeof DAYS)[number];
export const DAY_LABELS: Record<Day, string> = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };

export interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}
export type WeekHours = Record<Day, DayHours>;

/** A branch's hours from branch.settings.operatingHours, or null when they were never set. */
export function readHours(settings: Record<string, unknown> | undefined): WeekHours | null {
  const raw = settings?.operatingHours;
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, Partial<DayHours>>;
  const hours = {} as WeekHours;
  for (const day of DAYS) {
    const row = source[day];
    if (!row || typeof row.open !== 'string' || typeof row.close !== 'string') return null;
    hours[day] = { open: row.open, close: row.close, closed: Boolean(row.closed) };
  }
  return hours;
}

export const DEFAULT_HOURS: WeekHours = Object.fromEntries(DAYS.map((d) => [d, { open: '09:00', close: '18:00', closed: false }])) as WeekHours;

/** Handoff stngHoursRows: '09:00 – 18:00', 'Closed' or 'Not set'. */
export function hoursLine(hours: WeekHours | null, day: Day): string {
  const row = hours?.[day];
  if (!row) return 'Not set';
  return row.closed ? 'Closed' : `${row.open} – ${row.close}`;
}

/** Handoff saveHours(): every open day closes after it opens. */
export const validHours = (hours: WeekHours): boolean => DAYS.every((d) => hours[d].closed || (Boolean(hours[d].open) && Boolean(hours[d].close) && hours[d].open < hours[d].close));

export type EventType = 'swap_updates' | 'leave_decisions' | 'announcement_reminders';
export type EventChannel = 'in_app' | 'email';

/** The events ShiftOS sends notifications for (067) — the handoff's "Notify me about" rows. */
export const NOTIFICATION_ROWS: Array<{ event: EventType; label: string; body: string }> = [
  { event: 'swap_updates', label: 'Shift swaps', body: 'A swap you raised is accepted, approved or declined.' },
  { event: 'leave_decisions', label: 'Leave decisions', body: 'Your time off is approved or declined.' },
  { event: 'announcement_reminders', label: 'Announcement reminders', body: 'Someone asks you to acknowledge a notice.' }
];

export type EventPreferences = Record<`${EventType}:${EventChannel}`, boolean>;

export function preferenceMap(rows: Array<{ event_type: EventType; channel: EventChannel; is_enabled: boolean }> | undefined): EventPreferences {
  const map = {} as EventPreferences;
  for (const { event } of NOTIFICATION_ROWS) {
    for (const channel of ['in_app', 'email'] as const) map[`${event}:${channel}`] = true;
  }
  for (const row of rows ?? []) map[`${row.event_type}:${row.channel}`] = row.is_enabled;
  return map;
}

/** Password rules shared with Sign Up / Reset (handoff PW_RULES) and the strength line. */
export const PASSWORD_RULES: Array<{ label: string; test: (value: string) => boolean }> = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { label: 'One number', test: (v) => /[0-9]/.test(v) }
];

export function passwordStrength(value: string): { met: number; label: string; color: string } {
  const met = PASSWORD_RULES.filter((rule) => rule.test(value)).length;
  return {
    met,
    label: met === 0 ? 'Enter a password' : met <= 1 ? 'Weak' : met === 2 ? 'Fair' : met === 3 ? 'Good' : 'Strong',
    color: met <= 2 ? '#B77714' : met === 3 ? '#2563EB' : '#2E9E62'
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Avatar paths end in the upload's epoch milliseconds (lib/avatars.ts) — '4 Aug 2026', or null when it can't be read. */
export function uploadedOn(path: string | null | undefined): string | null {
  const match = path ? /\/(\d{12,14})\.[a-z0-9]+$/i.exec(path) : null;
  if (!match) return null;
  const at = new Date(Number(match[1]));
  return Number.isNaN(at.getTime()) ? null : `${at.getDate()} ${MONTHS[at.getMonth()]} ${at.getFullYear()}`;
}

/** 'Chrome on Windows' from a user agent. */
export function deviceName(userAgent: string): string {
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /OPR\//.test(userAgent)
      ? 'Opera'
      : /Firefox\//.test(userAgent)
        ? 'Firefox'
        : /Chrome\//.test(userAgent)
          ? 'Chrome'
          : /Safari\//.test(userAgent)
            ? 'Safari'
            : 'Browser';
  const os = /Windows/.test(userAgent)
    ? 'Windows'
    : /iPhone|iPad/.test(userAgent)
      ? 'iPhone'
      : /Android/.test(userAgent)
        ? 'Android'
        : /Mac OS X/.test(userAgent)
          ? 'Mac'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : 'this device';
  return `${browser} on ${os}`;
}
