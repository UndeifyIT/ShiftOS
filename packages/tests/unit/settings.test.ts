import { describe, it, expect } from 'vitest';
import {
  attendanceRules,
  deviceName,
  hoursLine,
  passwordStrength,
  notificationRows,
  preferenceMap,
  readHours,
  settingsTabs,
  uploadedOn,
  validHours,
  DEFAULT_HOURS
} from '../../../apps/web/src/pages/settings/settingsModel.js';

describe('Settings model (design handoff Manager/Settings)', () => {
  it('shows the tabs a person has permission for', () => {
    expect(settingsTabs(() => true)).toEqual(['Profile', 'Organization', 'Branch Hours', 'Notifications', 'Security', 'Billing']);
    expect(settingsTabs((code) => code === 'branches.read')).toEqual(['Profile', 'Branch Hours', 'Notifications', 'Security']);
  });

  it("describes the attendance rules ShiftOS really applies", () => {
    expect(attendanceRules(true).map((r) => [r.label, r.value])).toEqual([
      ['Late threshold', '0 minutes'],
      ['Absent threshold', 'Manual'],
      ['Early clock-in window', 'No limit'],
      ['Supervisor corrections', 'Allowed']
    ]);
    expect(attendanceRules(false)[3]).toMatchObject({ value: 'Not allowed', tone: 'neutral' });
    expect(attendanceRules(null)[3].value).toBe('Set per role');
  });

  it('reads, formats and validates branch hours', () => {
    expect(readHours({})).toBeNull();
    expect(hoursLine(null, 'Mon')).toBe('Not set');
    const hours = readHours({ operatingHours: { ...DEFAULT_HOURS, Sun: { open: '09:00', close: '18:00', closed: true } } });
    expect(hoursLine(hours, 'Mon')).toBe('09:00 – 18:00');
    expect(hoursLine(hours, 'Sun')).toBe('Closed');
    expect(validHours(DEFAULT_HOURS)).toBe(true);
    expect(validHours({ ...DEFAULT_HOURS, Tue: { open: '18:00', close: '09:00', closed: false } })).toBe(false);
    expect(validHours({ ...DEFAULT_HOURS, Tue: { open: '18:00', close: '09:00', closed: true } })).toBe(true);
  });

  it("starts each switch at the handoff's default, then applies saved ones", () => {
    const map = preferenceMap([{ event_type: 'leave_decisions', channel: 'email', is_enabled: false }]);
    expect(map['leave_decisions:email']).toBe(false);
    expect(map['swap_updates:in_app']).toBe(true);
    expect(map['absences:email']).toBe(false);
    expect(map['announcement_digest:in_app']).toBe(false);
    expect(Object.keys(map)).toHaveLength(18);
  });

  it('shows the handoff six rows to people who run a branch, and staff their own three', () => {
    expect(notificationRows(true).map((r) => r.label)).toEqual(['Coverage gaps', 'Unpublished schedule', 'Absences', 'Leave requests', 'Announcement acknowledgements', 'Invitations']);
    expect(notificationRows(false).map((r) => r.event)).toEqual(['swap_updates', 'leave_decisions', 'announcement_reminders']);
  });

  it('rates passwords with the shared rules, reads upload dates and names devices', () => {
    expect(passwordStrength('')).toMatchObject({ met: 0, label: 'Enter a password' });
    expect(passwordStrength('abc').label).toBe('Weak');
    expect(passwordStrength('abcdefgh').label).toBe('Fair');
    expect(passwordStrength('Abcdefg1')).toMatchObject({ met: 4, label: 'Strong' });
    expect(uploadedOn(`users/abc/${new Date(2026, 7, 4, 12).getTime()}.png`)).toBe('4 Aug 2026');
    expect(uploadedOn('users/abc/photo.png')).toBeNull();
    expect(deviceName('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36')).toBe('Chrome on Windows');
    expect(deviceName('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')).toBe('Safari on iPhone');
  });
});
