import { describe, it, expect } from 'vitest';
import type { ActivityEvent } from '../../../apps/web/src/pages/dashboard/manager/overviewModel.js';
import {
  activityCsvRows,
  activityStats,
  DEFAULT_FILTERS,
  filterActivity,
  pagerPages,
  peopleIn,
  rangeLabel,
  showingLine
} from '../../../apps/web/src/pages/activity/activityModel.js';

const NOW = new Date(2025, 4, 16, 9, 0);

function event(key: string, hours: number, person: string, category: ActivityEvent['category'], day = 16): ActivityEvent {
  return {
    key,
    at: new Date(2025, 4, day, hours, 0),
    title: `${person} checked in`,
    time: `${hours}:00`,
    icon: 'checkCircle',
    tone: 'ok',
    headline: `${person} checked in`,
    accent: null,
    desc: 'Check-in time',
    person,
    role: 'Sales Floor',
    category,
    href: '/attendance'
  };
}

const EVENTS = [
  event('a', 8, 'Mary Johnson', 'Employee Actions'),
  event('b', 7, 'System', 'System Events'),
  event('c', 6, 'Michael Brown', 'Task Updates'),
  event('d', 7, 'Mary Johnson', 'Employee Actions', 13)
];

describe('Recent Activity model (design handoff Manager/Recent Activity)', () => {
  it('counts the day into the four stat tiles, each bucket with its share', () => {
    const today = filterActivity(EVENTS, DEFAULT_FILTERS, NOW);
    expect(activityStats(today, 'Today').map((s) => [s.label, s.value, s.meta])).toEqual([
      ['Total Activities', '3', 'Today'],
      ['System Events', '1', '33%'],
      ['Employee Actions', '1', '33%'],
      ['Task Updates', '1', '33%']
    ]);
  });

  it('filters by range, type, person and search, and sorts either way', () => {
    expect(filterActivity(EVENTS, DEFAULT_FILTERS, NOW).map((e) => e.key)).toEqual(['a', 'b', 'c']);
    expect(filterActivity(EVENTS, { ...DEFAULT_FILTERS, range: 'Last 7 days', sort: 'Oldest first' }, NOW).map((e) => e.key)).toEqual(['d', 'c', 'b', 'a']);
    expect(filterActivity(EVENTS, { ...DEFAULT_FILTERS, type: 'Task Updates' }, NOW).map((e) => e.key)).toEqual(['c']);
    expect(filterActivity(EVENTS, { ...DEFAULT_FILTERS, range: 'Last 7 days', person: 'Mary Johnson' }, NOW).map((e) => e.key)).toEqual(['a', 'd']);
    expect(filterActivity(EVENTS, { ...DEFAULT_FILTERS, query: 'michael' }, NOW).map((e) => e.key)).toEqual(['c']);
    expect(peopleIn(EVENTS)).toEqual(['Mary Johnson', 'Michael Brown', 'System']);
  });

  it('pages eight at a time with the handoff footer line', () => {
    expect(showingLine(1, 24)).toBe('Showing 1 to 8 of 24 activities');
    expect(showingLine(3, 21)).toBe('Showing 17 to 21 of 21 activities');
    expect(showingLine(1, 0)).toBe('Showing 0 activities');
    expect(pagerPages(1, 3)).toEqual([1, 2, 3]);
    expect(pagerPages(5, 9)).toEqual([4, 5, 6]);
    expect(pagerPages(1, 1)).toEqual([1]);
  });

  it('labels the export range and writes one CSV row per activity', () => {
    expect(rangeLabel('Today', NOW)).toBe('16 May 2025');
    expect(rangeLabel('Last 7 days', NOW)).toBe('10 – 16 May 2025');
    expect(rangeLabel('Last 7 days', new Date(2025, 5, 3))).toBe('28 May – 03 Jun 2025');
    const rows = activityCsvRows(EVENTS.slice(0, 1));
    expect(rows[0]).toEqual(['Date', 'Time', 'Activity', 'Details', 'Person', 'Role', 'Type']);
    expect(rows[1].slice(2)).toEqual(['Mary Johnson checked in', 'Check-in time', 'Mary Johnson', 'Sales Floor', 'Employee Actions']);
  });
});
