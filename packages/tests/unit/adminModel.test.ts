import { describe, it, expect } from 'vitest';
import { answerAdmin, filterBranches, hoursSummary, orgStats, summarizeBranches } from '../../../apps/web/src/pages/adminConsole/adminModel.js';
import type { Branch, Employee, Member } from '../../../apps/web/src/types/domain.js';

const BASE = { organization_id: 'org', created_at: '2025-05-01T09:00:00Z', updated_at: '2025-05-01T09:00:00Z', deleted_at: null };

const week = (open: string, close: string, closedDays: string[] = []) =>
  Object.fromEntries(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => [d, { open, close, closed: closedDays.includes(d) }]));

const branch = (id: string, name: string, extra: Partial<Branch> = {}): Branch =>
  ({
    ...BASE,
    id,
    name,
    code: null,
    address: '12 Allen Ave',
    timezone: 'Africa/Lagos',
    is_active: true,
    settings: { city: 'Ikeja', state: 'LA', country: 'NG', operatingHours: week('08:00', '22:00') },
    ...extra
  }) as unknown as Branch;

const employee = (id: string, branchId: string): Employee => ({ ...BASE, id, branch_id: branchId, employment_status: 'active' }) as unknown as Employee;

const member = (id: string, roleName: string, branchIds: string[], orgWide = false): Member =>
  ({
    ...BASE,
    id,
    user_id: `u-${id}`,
    role_id: `role-${roleName}`,
    is_active: true,
    user_email: `${id}@example.com`,
    user_first_name: id,
    user_last_name: 'Test',
    role_name: roleName,
    role_org_wide: orgWide,
    branch_ids: branchIds
  }) as unknown as Member;

describe('hoursSummary', () => {
  it('reads one set of hours across the week', () => {
    expect(hoursSummary(week('08:00', '22:00') as never)).toBe('Mon–Sun · 8:00 AM–10:00 PM');
  });
  it('says so when hours are missing, closed or vary', () => {
    expect(hoursSummary(null)).toBe('Not set');
    expect(hoursSummary(week('08:00', '22:00', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) as never)).toBe('Closed every day');
    const varied = { ...week('08:00', '22:00'), Sat: { open: '10:00', close: '18:00', closed: false } };
    expect(hoursSummary(varied as never)).toBe('Varies by day');
  });
  it('lists non-contiguous open days', () => {
    expect(hoursSummary(week('09:00', '17:00', ['Tue', 'Thu', 'Sat', 'Sun']) as never)).toBe('Mon, Wed, Fri · 9:00 AM–5:00 PM');
  });
});

describe('summarizeBranches', () => {
  const branches = [branch('b1', 'Ikeja'), branch('b2', 'Lekki'), branch('b3', 'Old', { is_active: false }), branch('b4', 'Fresh', { settings: {} })];
  const employees = [employee('e1', 'b1'), employee('e2', 'b1'), employee('e3', 'b2'), employee('e4', 'b4')];
  const members = [member('mgr', 'Manager', [], true), member('sup', 'Supervisor', ['b1']), member('adm', 'Admin', ['b1', 'b2', 'b3', 'b4'])];
  const list = summarizeBranches(branches, employees, members);
  const byName = Object.fromEntries(list.map((b) => [b.name, b]));

  it('gives every branch its org-wide managers and only its own supervisors — never the Admin', () => {
    expect(byName.Ikeja.managers.map((m) => m.id)).toEqual(['mgr']);
    expect(byName.Ikeja.supervisors.map((m) => m.id)).toEqual(['sup']);
    expect(byName.Lekki.supervisors).toEqual([]);
  });

  it('derives status and the attention note', () => {
    expect(byName.Ikeja.status).toBe('Active');
    expect(byName.Ikeja.attentionNote).toBeNull();
    expect(byName.Lekki.attentionNote).toBe('No supervisor assigned.');
    expect(byName.Fresh.status).toBe('Pending setup');
    expect(byName.Fresh.attentionNote).toBe('Branch setup is incomplete.');
    expect(byName.Old.status).toBe('Archived');
    expect(list[list.length - 1].name).toBe('Old');
  });

  it('counts staff and formats location', () => {
    expect(byName.Ikeja.employees).toBe(2);
    expect(byName.Ikeja.location).toBe('Ikeja, Lagos');
  });

  it('filters and totals', () => {
    expect(filterBranches(list, 'Attention').map((b) => b.name)).toEqual(['Lekki', 'Fresh']);
    expect(filterBranches(list, 'Pending setup').map((b) => b.name)).toEqual(['Fresh']);
    expect(orgStats(list)).toEqual({ branches: 3, employees: 4, managers: 1, supervisors: 1 });
  });

  it('answers the assistant read-only, navigating where it can', () => {
    expect(answerAdmin('open lekki', list)).toEqual({ text: 'Opening Lekki…', to: '/branches/b2' });
    expect(answerAdmin('Show billing', list).to).toBe('/subscription');
    expect(answerAdmin('how many employees?', list).text).toBe('You have 4 employees across 3 branches.');
    expect(answerAdmin('anything need attention', list).text).toContain('Lekki (No supervisor assigned.)');
    expect(answerAdmin('hello', list).to).toBeNull();
  });
});
