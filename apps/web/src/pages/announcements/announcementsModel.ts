<<<<<<< HEAD
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
=======
import type { Announcement, AnnouncementAcknowledgement, Department, Employee, Member } from '../../types/domain.js';
import { daysAgo, relativeStamp } from '../dashboard/manager/overviewModel.js';
import { fullName, type Tone } from '../scheduling/grid/scheduleFormat.js';

/*
 * The Announcements page's pure helpers, after the design handoff's
 * ANNOUNCEMENTS + RECIPIENTS ("Manager/Announcements"). A recipient is an
 * active employee in the announcement's audience (its branch, or the whole
 * visible branch when it's organization-wide). ShiftOS records
 * acknowledgements, not reads, so a receipt is Acknowledged, Outstanding (can
 * see it in ShiftOS, hasn't acknowledged) or Not delivered (no ShiftOS login
 * to see it with).
>>>>>>> origin/main
 */

export type AnnouncementFilter = 'All' | 'Pinned' | 'Unacknowledged';
export const ANNOUNCEMENT_FILTERS: AnnouncementFilter[] = ['All', 'Pinned', 'Unacknowledged'];
<<<<<<< HEAD

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
=======
export type ReceiptFilter = 'Everyone' | 'Acknowledged' | 'Outstanding';
export const RECEIPT_FILTERS: ReceiptFilter[] = ['Everyone', 'Acknowledged', 'Outstanding'];

export type ReceiptStatus = 'Acknowledged' | 'Outstanding' | 'Not delivered';
const RECEIPT_TONE: Record<ReceiptStatus, Tone> = { Acknowledged: 'ok', Outstanding: 'warn', 'Not delivered': 'bad' };
const RECEIPT_ORDER: Record<ReceiptStatus, number> = { Acknowledged: 0, Outstanding: 1, 'Not delivered': 2 };
>>>>>>> origin/main

export interface Receipt {
  employeeId: string;
  name: string;
  meta: string;
<<<<<<< HEAD
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
=======
  status: ReceiptStatus;
  tone: Tone;
  /** When they acknowledged ('' if they haven't). */
  at: string;
}

export interface AnnouncementCard {
  announcement: Announcement;
  audience: string;
  audienceTone: Tone;
  pinned: boolean;
  draft: boolean;
  time: string;
  author: string;
  receipts: Receipt[];
  acknowledged: number;
  /** 0-100 — the card's progress bar. */
  pct: number;
  barColor: 'ok' | 'warn' | 'bad';
}

export interface AnnouncementsInput {
  announcements: Announcement[];
  acknowledgements: Map<string, AnnouncementAcknowledgement[]>;
  employees: Employee[];
  departments: Department[];
  members: Member[];
  now: Date;
}

const pad = (n: number): string => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const hhmm = (at: Date): string => `${pad(at.getHours())}:${pad(at.getMinutes())}`;
const dayMonth = (at: Date): string => `${pad(at.getDate())} ${MONTHS[at.getMonth()]}`;

/** Handoff receipt times: 'Today 06:55', 'Yesterday 18:42', '12 May 09:02'. */
export function receiptStamp(iso: string, now: Date): string {
  const at = new Date(iso);
  const days = daysAgo(iso, now);
  return `${days === 0 ? 'Today' : days === 1 ? 'Yesterday' : dayMonth(at)} ${hhmm(at)}`;
}

/** Handoff 'Delivered 07:30' (today) / 'Delivered yesterday' / 'Delivered 12 May'. */
export function deliveredStamp(iso: string, now: Date): string {
  const days = daysAgo(iso, now);
  return `Delivered ${days === 0 ? hhmm(new Date(iso)) : days === 1 ? 'yesterday' : dayMonth(new Date(iso))}`;
}

const isLive = (employee: Employee): boolean => employee.is_active && !employee.deleted_at && employee.employment_status === 'active';
const PLAIN_ROLE = /^(employee|staff)$/i;

export function recipientsOf(announcement: Announcement, employees: Employee[]): Employee[] {
  return employees.filter((employee) => isLive(employee) && (!announcement.branch_id || employee.branch_id === announcement.branch_id));
}

export function buildReceipts(announcement: Announcement, input: Omit<AnnouncementsInput, 'announcements'>): Receipt[] {
  const acks = new Map((input.acknowledgements.get(announcement.id) ?? []).map((row) => [row.employee_id, row]));
  const departments = new Map(input.departments.map((d) => [d.id, d.name]));
  const loginsByEmail = new Map(input.members.filter((m) => m.is_active && !m.deleted_at).map((m) => [m.user_email.toLowerCase(), m]));
  const deliveredAt = announcement.published_at ?? announcement.created_at;
  return recipientsOf(announcement, input.employees)
    .map((employee): Receipt => {
      const login = employee.email ? loginsByEmail.get(employee.email.toLowerCase()) : undefined;
      const department = (employee.department_id && departments.get(employee.department_id)) || 'No department';
      const who = login && !PLAIN_ROLE.test(login.role_name) ? `${department} · ${login.role_name}` : department;
      const ack = acks.get(employee.id);
      const status: ReceiptStatus = ack ? 'Acknowledged' : login ? 'Outstanding' : 'Not delivered';
      const when = ack ? receiptStamp(ack.acknowledged_at, input.now) : login ? deliveredStamp(deliveredAt, input.now) : 'No ShiftOS login';
      return { employeeId: employee.id, name: fullName(employee), meta: `${who} · ${when}`, status, tone: RECEIPT_TONE[status], at: ack?.acknowledged_at ?? '' };
    })
    // Acknowledged first in the order they came in, then outstanding, then undelivered, each by name.
    .sort((a, b) => RECEIPT_ORDER[a.status] - RECEIPT_ORDER[b.status] || a.at.localeCompare(b.at) || a.name.localeCompare(b.name));
}

export function buildCards(input: AnnouncementsInput): AnnouncementCard[] {
  const members = new Map(input.members.map((m) => [m.user_id, m]));
  return input.announcements
    .filter((a) => !a.deleted_at && (!a.expires_at || new Date(a.expires_at).getTime() > input.now.getTime()))
    .sort((a, b) => Number(Boolean(b.is_pinned)) - Number(Boolean(a.is_pinned)) || (b.published_at ?? b.created_at).localeCompare(a.published_at ?? a.created_at))
    .map((announcement) => {
      const receipts = announcement.is_published ? buildReceipts(announcement, input) : [];
      const acknowledged = receipts.filter((r) => r.status === 'Acknowledged').length;
      const pct = receipts.length ? Math.round((acknowledged / receipts.length) * 100) : 0;
      const author = members.get(announcement.created_by);
      return {
        announcement,
        audience: announcement.branch_id ? 'Whole branch' : 'Whole organization',
        audienceTone: announcement.branch_id ? 'primary' : 'info',
        pinned: Boolean(announcement.is_pinned),
        draft: !announcement.is_published,
        time: relativeStamp(announcement.published_at ?? announcement.created_at, input.now),
        author: author ? `${`${author.user_first_name} ${author.user_last_name}`.trim()} · ${author.role_name}` : 'ShiftOS',
        receipts,
        acknowledged,
        pct,
        barColor: pct >= 80 ? 'ok' : pct >= 50 ? 'warn' : 'bad'
      };
    });
}

/** Published and someone in its audience hasn't acknowledged it yet. */
export const isAwaiting = (card: AnnouncementCard): boolean => !card.draft && card.acknowledged < card.receipts.length;

/** Staff layout (handoff Staff/Announcements): just All and what I still have to acknowledge. */
export const STAFF_FILTERS: AnnouncementFilter[] = ['All', 'Unacknowledged'];

/** `awaiting` decides Unacknowledged: anyone outstanding for a content manager, or "not by me" for everyone else. */
export function filterCards(cards: AnnouncementCard[], filter: AnnouncementFilter, query: string, awaiting: (card: AnnouncementCard) => boolean = isAwaiting): AnnouncementCard[] {
  const needle = query.trim().toLowerCase();
  return cards.filter(
    (card) =>
      (filter === 'All' || (filter === 'Pinned' ? card.pinned : awaiting(card))) &&
      (!needle || `${card.announcement.title} ${card.announcement.content} ${card.author}`.toLowerCase().includes(needle))
  );
}

export function filterReceipts(receipts: Receipt[], filter: ReceiptFilter): Receipt[] {
  if (filter === 'Everyone') return receipts;
  return receipts.filter((r) => (filter === 'Acknowledged' ? r.status === 'Acknowledged' : r.status !== 'Acknowledged'));
}

export interface ReceiptSummary {
  pct: number;
  complete: boolean;
  summary: string;
  outstanding: number;
  undelivered: number;
  remindLabel: string;
}

/** The receipts panel's bar, 'n acknowledged · n outstanding · n undelivered' line and Remind button label. */
export function summarizeReceipts(receipts: Receipt[]): ReceiptSummary {
  const count = (status: ReceiptStatus): number => receipts.filter((r) => r.status === status).length;
  const acknowledged = count('Acknowledged');
  const outstanding = count('Outstanding');
  const undelivered = count('Not delivered');
  return {
    pct: receipts.length ? Math.round((acknowledged / receipts.length) * 100) : 0,
    complete: receipts.length > 0 && acknowledged === receipts.length,
    summary: `${acknowledged} acknowledged · ${outstanding} outstanding · ${undelivered} undelivered`,
    outstanding,
    undelivered,
    remindLabel: undelivered ? `Remind ${outstanding} outstanding · ${undelivered} undelivered` : `Remind ${outstanding} outstanding`
  };
}

/** '3 posted · 2 awaiting acknowledgement' */
export function announcementsSubtitle(cards: AnnouncementCard[]): string {
  const posted = cards.filter((c) => !c.draft).length;
  const drafts = cards.length - posted;
  const awaiting = cards.filter(isAwaiting).length;
  return [`${posted} posted`, drafts ? `${drafts} draft${drafts === 1 ? '' : 's'}` : null, `${awaiting} awaiting acknowledgement`].filter(Boolean).join(' · ');
}

export const countLine = (n: number): string => `${n} ${n === 1 ? 'announcement' : 'announcements'}`;

export function receiptsCsvRows(title: string, receipts: Receipt[]): string[][] {
  return [['Announcement', 'Name', 'Details', 'Status'], ...receipts.map((r) => [title, r.name, r.meta, r.status])];
}
>>>>>>> origin/main
