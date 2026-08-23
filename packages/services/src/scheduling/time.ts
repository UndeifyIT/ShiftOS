import { ValidationError } from '@shiftos/errors';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

function toMinutes(time: string, fieldName: string): number {
  const match = TIME_PATTERN.exec(time);
  if (!match) {
    throw new ValidationError(`Invalid ${fieldName}`, [`${fieldName} must be a valid HH:MM or HH:MM:SS time`]);
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
}

/**
 * Computes the exact `duration` interval string the database's
 * chk_shifts_duration_matches_time_range / chk_shift_templates_duration_matches_time_range
 * constraints require, from start/end time + crosses_midnight — so callers
 * never have to compute a matching interval themselves (and can't send one
 * that silently disagrees with start/end time).
 */
export function computeDuration(startTime: string, endTime: string, crossesMidnight: boolean): string {
  const startMinutes = toMinutes(startTime, 'startTime');
  const endMinutes = toMinutes(endTime, 'endTime');

  if (startTime === endTime) {
    throw new ValidationError('Invalid shift time range', ['startTime and endTime must not be equal']);
  }
  if (crossesMidnight && endMinutes >= startMinutes) {
    throw new ValidationError('Invalid shift time range', ['endTime must be earlier than startTime when crossesMidnight is true']);
  }
  if (!crossesMidnight && endMinutes <= startMinutes) {
    throw new ValidationError('Invalid shift time range', ['endTime must be after startTime unless crossesMidnight is true']);
  }

  const totalMinutes = crossesMidnight ? endMinutes + 24 * 60 - startMinutes : endMinutes - startMinutes;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
}

/**
 * `date`-typed columns come back from the `pg` driver as JS `Date` objects
 * built from local calendar components (`new Date(year, month, day)`), not
 * UTC ones. Comparing one of those against an ISO date *string* via
 * `Date.parse` silently coerces the Date through `toString()` (local time)
 * while the string parses as UTC midnight — a real, previously-unnoticed bug
 * where a date exactly on a range boundary could be wrongly rejected,
 * depending on the server's timezone offset. Normalizing everything to a
 * plain YYYY-MM-DD string first (using local getters, matching how the
 * driver built the Date) sidesteps the mismatch entirely.
 */
function toDateOnlyString(value: string | Date): string {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return value.slice(0, 10);
}

/** True if `date` (YYYY-MM-DD) falls within [startDate, endDate] inclusive. */
export function isDateWithinRange(date: string, startDate: string | Date, endDate: string | Date): boolean {
  const target = toDateOnlyString(date);
  const start = toDateOnlyString(startDate);
  const end = toDateOnlyString(endDate);
  return target >= start && target <= end;
}
