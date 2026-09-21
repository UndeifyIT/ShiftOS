import type { Announcement, AnnouncementType, Department, Employee, Member } from '../../types/domain.js';
import { emailKey } from '../../lib/members.js';
import type { Tone } from '../scheduling/grid/scheduleFormat.js';

/*
 * The Announcements screen, as the design handoff draws it
 * (`ShiftOS Dashboards.dc.html`: `PAGES["Manager/Announcements"]`, the
 * `kindAnnouncements` markup at lines 1215-1283, `ANNOUNCEMENTS` /
 * `RECIPIENTS` at 3502-3530 and the values at 4966-5016): a list of cards on
 * the left, each with its audience, its acknowledgement bar and a Receipts
 * button, and the receipts panel for the selected one on the right.
 */

export type AnnouncementFilter = 'All' | 'Pinned' | 'Unacknowledged';
export const ANNOUNCEMENT_FILTERS: AnnouncementFilter[] = ['All', 'Pinned', 'Unacknowledged'];

export type ReceiptFilter = 'Everyone' | 'Acknowledged' | 'Outstanding';
export const RECEIPT_FILTERS: ReceiptFilter[] = ['Everyone', 'Acknowledged', 'Outstanding'];

/** The handoff gives each audience pill its own tone; ours follow the announcement's type. */
export const TYPE_TONE: Record<AnnouncementType, Tone> = {
  general: 'info',
  operational: 'primary',
  policy: 'violet',
  safety: 'warn',
  emergency: 'bad'
};

export interface AnnouncementCard {
  id: string;
  audience: string;
  tone: Tone;
  pinned: boolean;
  time: string;
  title: string;
  body: string;
  author: string;
  published: boolean;
  requiresAcknowledgement: boolean;
  /** Acknowledged out of everyone it went to. */
  acknowledged: number;
  total: number;
  percent: number;
  ackLabel: string;
}

export interface Receipt {
  employeeId: string;
  name: string;
  meta: string;
  status: 'Acknowledged' | 'Outstanding';
  tone: Tone;
  acknowledgedAt: string | null;
}

export interface ReceiptRow {
  employeeId: string;
  name: string;
  departmentId: string | null;
  email: string | null;
  acknowledgedAt: string | null;
}

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`;

/** 'Today, 07:30 AM', 'Yesterday, 17:40', or '12 May'. */
export function whenLabel(iso: string | null, now: Date): string {
  if (!iso) return 'Draft';
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '';
  const day = (date: Date): string => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const clock = `${String(at.getHours() % 12 === 0 ? 12 : at.getHours() % 12).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')} ${at.getHours() < 12 ? 'AM' : 'PM'}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (day(at) === day(now)) return `Today, ${clock}`;
  if (day(at) === day(yesterday)) return `Yesterday, ${clock}`;
  return at.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

/** The handoff's audience pill. Our schema targets a branch or the whole organization — nothing narrower. */
export const audienceOf = (announcement: Announcement): string => (announcement.branch_id ? 'Whole branch' : 'Whole organization');

export interface CardSources {
  announcements: Announcement[];
  members: Member[];
  employees: Employee[];
  /** announcement id → its receipts, when they have been read. */
  receiptsById: Map<string, ReceiptRow[]>;
  now: Date;
}

/** The author line — "Daniel Okonkwo · Manager", from the membership that posted it. */
function authorOf(announcement: Announcement, members: Member[], employees: Employee[]): string {
  const member = members.find((row) => row.user_id === announcement.created_by);
  if (member) {
    const name = `${member.user_first_name ?? ''} ${member.user_last_name ?? ''}`.trim();
    if (name) return `${name} · ${member.role_name}`;
    const employee = employees.find((row) => emailKey(row.email) === emailKey(member.user_email));
    if (employee) return `${employee.first_name} ${employee.last_name}`.trim();
  }
  return 'ShiftOS';
}

export function buildCards({ announcements, members, employees, receiptsById, now }: CardSources): AnnouncementCard[] {
  return orderAnnouncements(announcements.filter((announcement) => !announcement.deleted_at))
    .map((announcement) => {
      const receipts = receiptsById.get(announcement.id) ?? [];
      const acknowledged = receipts.filter((receipt) => receipt.acknowledgedAt).length;
      const total = receipts.length;
      const percent = total === 0 ? 0 : Math.round((acknowledged / total) * 100);
      return {
        id: announcement.id,
        audience: audienceOf(announcement),
        tone: TYPE_TONE[announcement.announcement_type] ?? 'info',
        pinned: announcement.is_pinned,
        time: whenLabel(announcement.published_at, now),
        title: announcement.title,
        body: announcement.content,
        author: authorOf(announcement, members, employees),
        published: announcement.is_published,
        requiresAcknowledgement: announcement.requires_acknowledgement,
        acknowledged,
        total,
        percent,
        ackLabel: total === 0 ? 'No recipients' : `${acknowledged} of ${total} acknowledged`
      };
    });
}

/** Pinned first, then newest — sorting needs the raw timestamps, not the labels. */
export function orderAnnouncements(announcements: Announcement[]): Announcement[] {
  return [...announcements].sort((left, right) => {
    if (left.is_pinned !== right.is_pinned) return left.is_pinned ? -1 : 1;
    const at = (row: Announcement): string => row.published_at ?? row.created_at;
    return at(right).localeCompare(at(left));
  });
}

export function filterCards(cards: AnnouncementCard[], filter: AnnouncementFilter, query: string): AnnouncementCard[] {
  const needle = query.trim().toLowerCase();
  return cards.filter((card) => {
    if (needle && !`${card.title} ${card.body} ${card.author}`.toLowerCase().includes(needle)) return false;
    if (filter === 'Pinned') return card.pinned;
    if (filter === 'Unacknowledged') return card.requiresAcknowledgement && card.acknowledged < card.total;
    return true;
  });
}

/** The toolbar's right-hand count. */
export function announcementsCount(cards: AnnouncementCard[], filter: AnnouncementFilter): string {
  return filter === 'All' ? plural(cards.length, 'announcement') : `${plural(cards.length, 'announcement')} · ${filter.toLowerCase()}`;
}

/** "3 posted · 2 awaiting acknowledgement". */
export function announcementsSubtitle(cards: AnnouncementCard[]): string {
  const posted = cards.filter((card) => card.published).length;
  const waiting = cards.filter((card) => card.requiresAcknowledgement && card.total > 0 && card.acknowledged < card.total).length;
  return `${posted} posted · ${waiting} awaiting acknowledgement`;
}

/** One receipt line: the handoff's four statuses collapse to the two this system can prove. */
export function buildReceipts(rows: ReceiptRow[], departments: Department[], now: Date): Receipt[] {
  const departmentById = new Map(departments.map((department) => [department.id, department.name]));
  return rows
    .map((row) => {
      const department = row.departmentId ? departmentById.get(row.departmentId) ?? null : null;
      const when = row.acknowledgedAt ? whenLabel(row.acknowledgedAt, now) : row.email ? 'Not yet' : 'No email on file';
      return {
        employeeId: row.employeeId,
        name: row.name,
        meta: [department, when].filter(Boolean).join(' · '),
        status: (row.acknowledgedAt ? 'Acknowledged' : 'Outstanding') as Receipt['status'],
        tone: (row.acknowledgedAt ? 'ok' : row.email ? 'warn' : 'bad') as Tone,
        acknowledgedAt: row.acknowledgedAt
      };
    })
    .sort((left, right) => {
      if (Boolean(left.acknowledgedAt) !== Boolean(right.acknowledgedAt)) return left.acknowledgedAt ? -1 : 1;
      return left.name.localeCompare(right.name);
    });
}

export const filterReceipts = (receipts: Receipt[], filter: ReceiptFilter): Receipt[] =>
  filter === 'Everyone' ? receipts : receipts.filter((receipt) => (filter === 'Acknowledged' ? receipt.status === 'Acknowledged' : receipt.status === 'Outstanding'));

export interface ReceiptSummary {
  percent: number;
  percentLabel: string;
  summary: string;
  remindLabel: string;
  outstanding: number;
  unreachable: number;
  complete: boolean;
}

export function receiptSummary(receipts: Receipt[]): ReceiptSummary {
  const total = receipts.length;
  const acknowledged = receipts.filter((receipt) => receipt.status === 'Acknowledged').length;
  const unreachable = receipts.filter((receipt) => receipt.meta.endsWith('No email on file')).length;
  const outstanding = total - acknowledged;
  const percent = total === 0 ? 0 : Math.round((acknowledged / total) * 100);
  return {
    percent,
    percentLabel: `${percent}%`,
    summary: `${acknowledged} acknowledged · ${outstanding - unreachable} outstanding · ${unreachable} with no email`,
    remindLabel: unreachable ? `Remind ${outstanding - unreachable} outstanding · ${unreachable} unreachable` : `Remind ${outstanding} outstanding`,
    outstanding,
    unreachable,
    complete: total > 0 && acknowledged === total
  };
}
