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

/** True if `date` (YYYY-MM-DD) falls within [startDate, endDate] inclusive. */
export function isDateWithinRange(date: string, startDate: string, endDate: string): boolean {
  const target = Date.parse(date);
  const start = Date.parse(startDate);
  const end = Date.parse(endDate);
  return target >= start && target <= end;
}
