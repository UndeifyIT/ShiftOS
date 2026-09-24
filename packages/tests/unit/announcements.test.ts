import { describe, it, expect } from 'vitest';
import {
  announcementsSubtitle,
  buildCards,
  deliveredStamp,
  filterCards,
  filterReceipts,
  receiptStamp,
  summarizeReceipts,
  type AnnouncementsInput
} from '../../../apps/web/src/pages/announcements/announcementsModel.js';

const BASE = { organization_id: 'org', created_at: '2025-05-01T09:00:00Z', updated_at: '2025-05-01T09:00:00Z', deleted_at: null };
const NOW = new Date(2025, 4, 16, 8, 0);
const at = (day: number, h: number, m: number): string => new Date(2025, 4, day, h, m).toISOString();

function employee(id: string, first: string, email: string | null, branch = 'br') {
  return {
    ...BASE,
    id,
    branch_id: branch,
    employee_number: id,
    first_name: first,
    last_name: 'Test',
    email,
    phone: null,
    date_of_birth: null,
    hire_date: '2024-01-01',
    employment_status: 'active' as const,
    notes: null,
    avatar_url: null,
    department_id: 'd-sales',
    is_active: true
  };
}

function member(userId: string, first: string, email: string, role: string) {
  return { ...BASE, id: `m-${userId}`, user_id: userId, role_id: 'r', joined_at: BASE.created_at, is_active: true, user_email: email, user_first_name: first, user_last_name: 'Test', role_name: role };
}

function announcement(id: string, published: string | null, pinned = false, branch: string | null = 'br') {
  return {
    ...BASE,
    id,
    branch_id: branch,
    title: `Notice ${id}`,
    content: 'Body',
    announcement_type: 'general' as const,
    visibility_type: branch ? ('branch' as const) : ('organization' as const),
    is_published: published !== null,
    is_pinned: pinned,
    published_at: published,
    expires_at: null,
    created_by: 'u-me'
  };
}

function input(overrides: Partial<AnnouncementsInput> = {}): AnnouncementsInput {
  return {
    announcements: [announcement('a', at(16, 7, 30)), announcement('b', at(15, 17, 40), true), announcement('c', null)],
    acknowledgements: new Map([
      ['a', [{ id: 'k1', organization_id: 'org', announcement_id: 'a', employee_id: 'e2', acknowledged_at: at(16, 7, 45) }]],
      [
        'b',
        [
          { id: 'k2', organization_id: 'org', announcement_id: 'b', employee_id: 'e2', acknowledged_at: at(16, 6, 55) },
          { id: 'k3', organization_id: 'org', announcement_id: 'b', employee_id: 'e1', acknowledged_at: at(15, 18, 42) }
        ]
      ]
    ]),
    employees: [employee('e1', 'Sarah', 'sarah@x.test'), employee('e2', 'John', 'john@x.test'), employee('e3', 'Mary', null), employee('e4', 'Other', 'o@x.test', 'br-2')],
    departments: [{ ...BASE, id: 'd-sales', branch_id: 'br', name: 'Sales Floor', description: null, is_active: true }],
    members: [member('u-me', 'Daniel', 'daniel@x.test', 'Manager'), member('u1', 'Sarah', 'SARAH@x.test', 'Supervisor'), member('u2', 'John', 'john@x.test', 'Employee')],
    now: NOW,
    ...overrides
  };
}

describe('Announcements model (design handoff Manager/Announcements)', () => {
  it('orders pinned first, then newest, and marks drafts', () => {
    const cards = buildCards(input());
    expect(cards.map((c) => [c.announcement.id, c.pinned, c.draft, c.audience, c.time, c.author])).toEqual([
      ['b', true, false, 'Whole branch', 'Yesterday, 05:40 PM', 'Daniel Test · Manager'],
      ['a', false, false, 'Whole branch', 'Today, 07:30 AM', 'Daniel Test · Manager'],
      ['c', false, true, 'Whole branch', '01 May', 'Daniel Test · Manager']
    ]);
  });

  it('builds receipts from the audience: acknowledged in order, then outstanding, then no-login undelivered', () => {
    const [stocktake, promo] = buildCards(input());
    expect(stocktake.receipts.map((r) => [r.name, r.status, r.meta])).toEqual([
      ['Sarah Test', 'Acknowledged', 'Sales Floor · Supervisor · Yesterday 18:42'],
      ['John Test', 'Acknowledged', 'Sales Floor · Today 06:55'],
      ['Mary Test', 'Not delivered', 'Sales Floor · No ShiftOS login']
    ]);
    expect(promo.receipts.map((r) => [r.name, r.status, r.meta])).toEqual([
      ['John Test', 'Acknowledged', 'Sales Floor · Today 07:45'],
      ['Sarah Test', 'Outstanding', 'Sales Floor · Supervisor · Delivered 07:30'],
      ['Mary Test', 'Not delivered', 'Sales Floor · No ShiftOS login']
    ]);
    expect([promo.acknowledged, promo.pct, promo.barColor]).toEqual([1, 33, 'bad']);
  });

  it('summarises the receipts panel and filters it', () => {
    const promo = buildCards(input())[1];
    expect(summarizeReceipts(promo.receipts)).toMatchObject({
      pct: 33,
      complete: false,
      summary: '1 acknowledged · 1 outstanding · 1 undelivered',
      remindLabel: 'Remind 1 outstanding · 1 undelivered'
    });
    expect(filterReceipts(promo.receipts, 'Acknowledged').map((r) => r.name)).toEqual(['John Test']);
    expect(filterReceipts(promo.receipts, 'Outstanding').map((r) => r.name)).toEqual(['Sarah Test', 'Mary Test']);
  });

  it('filters the list and writes the header subtitle', () => {
    const cards = buildCards(input());
    expect(filterCards(cards, 'Pinned', '').map((c) => c.announcement.id)).toEqual(['b']);
    expect(filterCards(cards, 'Unacknowledged', '').map((c) => c.announcement.id)).toEqual(['b', 'a']);
    expect(filterCards(cards, 'All', 'notice a').map((c) => c.announcement.id)).toEqual(['a']);
    expect(announcementsSubtitle(cards)).toBe('2 posted · 1 draft · 2 awaiting acknowledgement');
  });

  it('formats the handoff receipt and delivery times', () => {
    expect(receiptStamp(at(16, 6, 55), NOW)).toBe('Today 06:55');
    expect(receiptStamp(at(15, 18, 42), NOW)).toBe('Yesterday 18:42');
    expect(receiptStamp(at(12, 9, 2), NOW)).toBe('12 May 09:02');
    expect(deliveredStamp(at(16, 7, 30), NOW)).toBe('Delivered 07:30');
    expect(deliveredStamp(at(15, 7, 30), NOW)).toBe('Delivered yesterday');
    expect(deliveredStamp(at(9, 7, 30), NOW)).toBe('Delivered 09 May');
  });
});
