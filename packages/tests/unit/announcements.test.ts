import { describe, it, expect } from 'vitest';
import {
  announcementsCount,
  announcementsSubtitle,
  buildCards,
  buildReceipts,
  filterCards,
  filterReceipts,
  orderAnnouncements,
  receiptSummary,
  whenLabel,
  type ReceiptRow
} from '../../../apps/web/src/pages/announcements/announcementsModel.js';
import type { Announcement } from '../../../apps/web/src/types/domain.js';

const BASE = { organization_id: 'org', created_at: '2025-05-12T09:00:00Z', updated_at: '2025-05-12T09:00:00Z', deleted_at: null };
const NOW = new Date(2025, 4, 16, 7, 58);
const at = (day: number, hour: number, minute: number): string => new Date(2025, 4, day, hour, minute).toISOString();

const announcement = (id: string, fields: Partial<Announcement>): Announcement =>
  ({
    ...BASE,
    id,
    branch_id: 'br',
    title: id,
    content: 'Body copy.',
    announcement_type: 'operational',
    visibility_type: 'branch',
    is_published: true,
    is_pinned: false,
    requires_acknowledgement: true,
    published_at: at(16, 7, 30),
    expires_at: null,
    created_by: 'user-manager',
    ...fields
  }) as Announcement;

const members = [
  {
    ...BASE,
    id: 'm1',
    user_id: 'user-manager',
    role_id: 'r1',
    joined_at: BASE.created_at,
    is_active: true,
    user_email: 'daniel@abc.test',
    user_first_name: 'Daniel',
    user_last_name: 'Okonkwo',
    role_name: 'Manager'
  }
];
const departments = [
  { ...BASE, id: 'dep-front', branch_id: 'br', name: 'Front End', description: null, is_active: true },
  { ...BASE, id: 'dep-bake', branch_id: 'br', name: 'Bakery', description: null, is_active: true }
];

const receiptRows: ReceiptRow[] = [
  { employeeId: 'p1', name: 'Grace Williams', departmentId: 'dep-bake', email: 'grace@abc.test', acknowledgedAt: at(16, 6, 55) },
  { employeeId: 'p2', name: 'Mary Johnson', departmentId: 'dep-front', email: 'mary@abc.test', acknowledgedAt: null },
  { employeeId: 'p3', name: 'Ada Eze', departmentId: null, email: null, acknowledgedAt: null }
];

const announcements = [
  announcement('stocktake', { title: 'Stocktake weekend', published_at: at(15, 17, 40), is_pinned: true }),
  announcement('promotion', { title: 'New promotion display', published_at: at(16, 7, 30) }),
  announcement('threshold', { title: 'Late threshold moves', published_at: at(12, 9, 0), branch_id: null, visibility_type: 'organization', requires_acknowledgement: false })
];

const receiptsById = new Map<string, ReceiptRow[]>([
  ['stocktake', receiptRows],
  ['promotion', receiptRows.map((row) => ({ ...row, acknowledgedAt: null }))],
  ['threshold', receiptRows]
]);

const cards = (): ReturnType<typeof buildCards> => buildCards({ announcements, members, employees: [], receiptsById, now: NOW });

describe('announcements', () => {
  it('puts pinned posts first, then the newest', () => {
    expect(orderAnnouncements(announcements).map((row) => row.id)).toEqual(['stocktake', 'promotion', 'threshold']);
  });

  it('reads each card the way the handoff writes it', () => {
    const [pinned, promotion, org] = cards();
    expect(pinned).toMatchObject({
      audience: 'Whole branch',
      pinned: true,
      time: 'Yesterday, 05:40 PM',
      author: 'Daniel Okonkwo · Manager',
      acknowledged: 1,
      total: 3,
      percent: 33,
      ackLabel: '1 of 3 acknowledged'
    });
    expect(promotion).toMatchObject({ time: 'Today, 07:30 AM', percent: 0, ackLabel: '0 of 3 acknowledged' });
    expect(org).toMatchObject({ audience: 'Whole organization', time: '12 May', requiresAcknowledgement: false });
  });

  it('labels a post nobody has to answer, and one still waiting', () => {
    expect(announcementsSubtitle(cards())).toBe('3 posted · 2 awaiting acknowledgement');
    expect(announcementsCount(cards(), 'All')).toBe('3 announcements');
    expect(announcementsCount(filterCards(cards(), 'Pinned', ''), 'Pinned')).toBe('1 announcement · pinned');
  });

  it('filters by pin, by what is outstanding, and by search', () => {
    expect(filterCards(cards(), 'Pinned', '').map((card) => card.id)).toEqual(['stocktake']);
    expect(filterCards(cards(), 'Unacknowledged', '').map((card) => card.id)).toEqual(['stocktake', 'promotion']);
    expect(filterCards(cards(), 'All', 'promotion').map((card) => card.id)).toEqual(['promotion']);
    expect(filterCards(cards(), 'All', 'daniel')).toHaveLength(3); // the author line is searchable too
  });

  it('builds receipts with the acknowledged first, and says why someone is unreachable', () => {
    const receipts = buildReceipts(receiptRows, departments, NOW);
    expect(receipts.map((receipt) => `${receipt.name} | ${receipt.meta} | ${receipt.status}`)).toEqual([
      'Grace Williams | Bakery · Today, 06:55 AM | Acknowledged',
      'Ada Eze | No email on file | Outstanding',
      'Mary Johnson | Front End · Not yet | Outstanding'
    ]);
    expect(receipts.map((receipt) => receipt.tone)).toEqual(['ok', 'bad', 'warn']);
  });

  it('filters the receipts panel', () => {
    const receipts = buildReceipts(receiptRows, departments, NOW);
    expect(filterReceipts(receipts, 'Everyone')).toHaveLength(3);
    expect(filterReceipts(receipts, 'Acknowledged')).toHaveLength(1);
    expect(filterReceipts(receipts, 'Outstanding')).toHaveLength(2);
  });

  it('summarises the panel, and says who the reminder can actually reach', () => {
    const summary = receiptSummary(buildReceipts(receiptRows, departments, NOW));
    expect(summary).toMatchObject({
      percent: 33,
      percentLabel: '33%',
      summary: '1 acknowledged · 1 outstanding · 1 with no email',
      remindLabel: 'Remind 1 outstanding · 1 unreachable',
      outstanding: 2,
      unreachable: 1,
      complete: false
    });

    const everyone = receiptSummary(buildReceipts(receiptRows.map((row) => ({ ...row, email: 'x@abc.test', acknowledgedAt: at(16, 7, 0) })), departments, NOW));
    expect(everyone).toMatchObject({ percent: 100, complete: true, outstanding: 0, remindLabel: 'Remind 0 outstanding' });
  });

  it('writes the time the way the design does', () => {
    expect(whenLabel(at(16, 7, 30), NOW)).toBe('Today, 07:30 AM');
    expect(whenLabel(at(15, 17, 40), NOW)).toBe('Yesterday, 05:40 PM');
    expect(whenLabel(at(12, 9, 0), NOW)).toBe('12 May');
    expect(whenLabel(null, NOW)).toBe('Draft');
  });
});
