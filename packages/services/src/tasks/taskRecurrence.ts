import type { TaskRecurrence } from '@shiftos/repositories';

/**
 * When a repeating task comes back (066).
 *
 * There is no scheduler in this system, so the chain advances on completion:
 * finishing today's cold-room check is what creates tomorrow's. Dates are
 * handled as plain 'YYYY-MM-DD' strings in UTC so no timezone can shift a due
 * date by a day.
 */

export const TASK_RECURRENCES: readonly TaskRecurrence[] = ['none', 'daily', 'weekdays', 'weekly'];

const DAY = 86_400_000;

/** The date a repeating task is next due, or null for a one-off. */
export function nextTaskOccurrence(from: string, recurrence: TaskRecurrence): string | null {
  if (recurrence === 'none') return null;
  const start = Date.parse(`${from}T00:00:00Z`);
  if (Number.isNaN(start)) return null;

  if (recurrence === 'weekly') return iso(start + 7 * DAY);
  if (recurrence === 'daily') return iso(start + DAY);

  // Weekdays: Friday and the weekend all land on the next Monday.
  let next = start + DAY;
  while (isWeekend(next)) next += DAY;
  return iso(next);
}

const iso = (time: number): string => new Date(time).toISOString().slice(0, 10);

function isWeekend(time: number): boolean {
  const day = new Date(time).getUTCDay();
  return day === 0 || day === 6;
}
