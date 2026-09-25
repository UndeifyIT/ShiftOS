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
 */

export type AnnouncementFilter = 'All' | 'Pinned' | 'Unacknowledged' | 'Unread';
export const ANNOUNCEMENT_FILTERS: AnnouncementFilter[] = ['All', 'Pinned', 'Unacknowledged'];
export type ReceiptFilter = 'Everyone' | 'Acknowledged' | 'Outstanding';
export const RECEIPT_FILTERS: ReceiptFilter[] = ['Everyone', 'Acknowledged', 'Outstanding'];

export type ReceiptStatus = 'Acknowledged' | 'Outstanding' | 'Not delivered';
const RECEIPT_TONE: Record<ReceiptStatus, Tone> = { Acknowledged: 'ok', Outstanding: 'warn', 'Not delivered': 'bad' };
const RECEIPT_ORDER: Record<ReceiptStatus, number> = { Acknowledged: 0, Outstanding: 1, 'Not delivered': 2 };

export interface Receipt {
  employeeId: string;
  name: string;
  meta: string;
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
        author: authorLabel(author, announcement),
        receipts,
        acknowledged,
        pct,
        barColor: pct >= 80 ? 'ok' : pct >= 50 ? 'warn' : 'bad'
      };
    });
}

/** Published and someone in its audience hasn't acknowledged it yet. */
export const isAwaiting = (card: AnnouncementCard): boolean => !card.draft && card.acknowledged < card.receipts.length;

/** Staff layout (handoff Staff/Announcements): All, and Unread — what I still have to acknowledge. */
export const STAFF_FILTERS: AnnouncementFilter[] = ['All', 'Unread'];

/** `awaiting` decides Unacknowledged / Unread: anyone outstanding for a content manager, or "not by me" for everyone else. */
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

/** The Manager's '3 posted · 2 awaiting acknowledgement'; with a branch name, the Supervisor's 'Main Branch · 1 awaiting acknowledgement'. */
export function announcementsSubtitle(cards: AnnouncementCard[], branchName?: string): string {
  const posted = cards.filter((c) => !c.draft).length;
  const drafts = cards.length - posted;
  const awaiting = cards.filter(isAwaiting).length;
  if (branchName) return `${branchName} · ${awaiting} awaiting acknowledgement`;
  return [`${posted} posted`, drafts ? `${drafts} draft${drafts === 1 ? '' : 's'}` : null, `${awaiting} awaiting acknowledgement`].filter(Boolean).join(' · ');
}

export const countLine = (n: number): string => `${n} ${n === 1 ? 'announcement' : 'announcements'}`;

export function receiptsCsvRows(title: string, receipts: Receipt[]): string[][] {
  return [['Announcement', 'Name', 'Details', 'Status'], ...receipts.map((r) => [title, r.name, r.meta, r.status])];
}

/** 'Daniel Okonkwo · Manager' — from the member list when the reader has it, else the name list_announcements joins in. */
export function authorLabel(member: { user_first_name: string; user_last_name: string; role_name: string } | undefined, announcement: Announcement): string {
  if (member) return `${`${member.user_first_name} ${member.user_last_name}`.trim()} · ${member.role_name}`;
  if (announcement.author_name) return announcement.author_role ? `${announcement.author_name} · ${announcement.author_role}` : announcement.author_name;
  return 'ShiftOS';
}
