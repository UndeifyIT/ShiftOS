import type { ActivityCategory, ActivityEvent } from '../dashboard/manager/overviewModel.js';

/*
 * The Recent Activity page's pure helpers: the handoff's four stat tiles, the
 * Type / Person / Date range filters, search, sort, the 8-row pager and the
 * CSV export. Events come from buildManagerOverview (the last 7 days).
 */

export const PAGE_SIZE = 8;
export const CATEGORIES: ActivityCategory[] = ['System Events', 'Employee Actions', 'Task Updates'];
export type DateRange = 'Today' | 'Last 7 days';
export const DATE_RANGES: DateRange[] = ['Today', 'Last 7 days'];
export type SortOrder = 'Newest first' | 'Oldest first';

export interface ActivityFilters {
  type: ActivityCategory | 'All Types';
  person: string | 'All People';
  range: DateRange;
  query: string;
  sort: SortOrder;
}

export const DEFAULT_FILTERS: ActivityFilters = { type: 'All Types', person: 'All People', range: 'Today', query: '', sort: 'Newest first' };

const sameDay = (a: Date, b: Date): boolean => a.toDateString() === b.toDateString();

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dd = (at: Date): string => String(at.getDate()).padStart(2, '0');

/** Handoff export Range: '16 May 2025' for today, '10 – 16 May 2025' for the last 7 days. */
export function rangeLabel(range: DateRange, now: Date): string {
  const end = `${dd(now)} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  if (range === 'Today') return end;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  if (start.getFullYear() !== now.getFullYear()) return `${dd(start)} ${MONTHS[start.getMonth()]} ${start.getFullYear()} – ${end}`;
  if (start.getMonth() !== now.getMonth()) return `${dd(start)} ${MONTHS[start.getMonth()]} – ${end}`;
  return `${dd(start)} – ${end}`;
}

export function inRange(events: ActivityEvent[], range: DateRange, now: Date): ActivityEvent[] {
  return range === 'Today' ? events.filter((event) => sameDay(event.at, now)) : events;
}

export interface ActivityStat {
  label: string;
  value: string;
  meta: string;
  icon: 'activity' | 'checkCircle' | 'users' | 'clipboard';
  tone: 'info' | 'ok' | 'primary' | 'violet';
}

/** Handoff ACTIVITY_STATS: the total, then each bucket with its share of the total. */
export function activityStats(events: ActivityEvent[], range: DateRange): ActivityStat[] {
  const total = events.length;
  const share = (category: ActivityCategory): { value: string; meta: string } => {
    const count = events.filter((event) => event.category === category).length;
    return { value: String(count), meta: total ? `${Math.round((count / total) * 100)}%` : '0%' };
  };
  return [
    { label: 'Total Activities', value: String(total), meta: range, icon: 'activity', tone: 'info' },
    { label: 'System Events', ...share('System Events'), icon: 'checkCircle', tone: 'ok' },
    { label: 'Employee Actions', ...share('Employee Actions'), icon: 'users', tone: 'primary' },
    { label: 'Task Updates', ...share('Task Updates'), icon: 'clipboard', tone: 'violet' }
  ];
}

/** Everyone who appears in the range, alphabetically — the Person filter's choices. */
export function peopleIn(events: ActivityEvent[]): string[] {
  return [...new Set(events.map((event) => event.person))].sort((a, b) => a.localeCompare(b));
}

export function filterActivity(events: ActivityEvent[], filters: ActivityFilters, now: Date): ActivityEvent[] {
  const needle = filters.query.trim().toLowerCase();
  const rows = inRange(events, filters.range, now).filter(
    (event) =>
      (filters.type === 'All Types' || event.category === filters.type) &&
      (filters.person === 'All People' || event.person === filters.person) &&
      (!needle || [event.title, event.desc, event.person, event.role].some((text) => text.toLowerCase().includes(needle)))
  );
  const direction = filters.sort === 'Newest first' ? -1 : 1;
  return [...rows].sort((a, b) => direction * (a.at.getTime() - b.at.getTime()));
}

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}

/** 'Showing 1 to 8 of 24 activities' */
export function showingLine(page: number, total: number): string {
  if (total === 0) return 'Showing 0 activities';
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  return `Showing ${from} to ${to} of ${total} ${total === 1 ? 'activity' : 'activities'}`;
}

/** The pager buttons: up to three page numbers around the current one, then → when there's a next page. */
export function pagerPages(page: number, pages: number): number[] {
  const start = Math.max(1, Math.min(page - 1, pages - 2));
  return Array.from({ length: Math.min(3, pages) }, (_, index) => start + index);
}

export function activityCsvRows(events: ActivityEvent[]): string[][] {
  return [
    ['Date', 'Time', 'Activity', 'Details', 'Person', 'Role', 'Type'],
    ...events.map((event) => [event.at.toLocaleDateString('en-GB'), event.time, event.title, event.desc, event.person, event.role, event.category])
  ];
}
