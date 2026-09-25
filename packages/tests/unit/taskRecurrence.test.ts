import { describe, it, expect } from 'vitest';
import { nextTaskOccurrence, TASK_RECURRENCES } from '@shiftos/services';

/** 2025-05-16 is a Friday; 17th and 18th are the weekend. */
describe('task recurrence', () => {
  it('offers exactly the four choices the form does', () => {
    expect([...TASK_RECURRENCES]).toEqual(['none', 'daily', 'weekdays', 'weekly']);
  });

  it('gives a one-off no next date', () => {
    expect(nextTaskOccurrence('2025-05-16', 'none')).toBeNull();
  });

  it('moves a daily task to the next calendar day, weekend or not', () => {
    expect(nextTaskOccurrence('2025-05-16', 'daily')).toBe('2025-05-17');
    expect(nextTaskOccurrence('2025-05-31', 'daily')).toBe('2025-06-01');
    expect(nextTaskOccurrence('2025-12-31', 'daily')).toBe('2026-01-01');
  });

  it('carries a weekday task over the weekend to Monday', () => {
    expect(nextTaskOccurrence('2025-05-16', 'weekdays')).toBe('2025-05-19');
    expect(nextTaskOccurrence('2025-05-17', 'weekdays')).toBe('2025-05-19');
    expect(nextTaskOccurrence('2025-05-19', 'weekdays')).toBe('2025-05-20');
  });

  it('keeps a weekly task on its own day of the week', () => {
    expect(nextTaskOccurrence('2025-05-16', 'weekly')).toBe('2025-05-23');
    expect(new Date('2025-05-23T00:00:00Z').getUTCDay()).toBe(5);
  });

  it('refuses to guess at a date it cannot read', () => {
    expect(nextTaskOccurrence('not-a-date', 'daily')).toBeNull();
  });
});
