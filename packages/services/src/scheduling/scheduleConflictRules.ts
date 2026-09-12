/**
 * The weekly grid's conflict rules, taken literally from the design handoff
 * (`ShiftOS Dashboards.dc.html` schedVals "conflicts"): per employee per day,
 * any two time blocks that overlap is a double-booking; otherwise more than
 * 10 hours of *paid* time that day (every block's span minus its break) breaks
 * the 10-hour rule. At most one conflict is reported per employee/day, and
 * overlap wins over the 10-hour rule — same precedence as the handoff.
 *
 * Deliberately dependency-free (no @shiftos/* imports) so the web app's
 * schedule preview harness can reuse the exact same rules as
 * SchedulingService.getScheduleConflicts.
 */

export type ScheduleConflictKind = 'double_booking' | 'long_shift';

export interface ConflictShiftBlock {
  employeeId: string;
  /** The shift's own shift_date, 'YYYY-MM-DD'. */
  date: string;
  /** 'HH:MM' or 'HH:MM:SS'. */
  startTime: string;
  endTime: string;
  breakMinutes: number;
}

export interface DetectedScheduleConflict {
  employeeId: string;
  date: string;
  kind: ScheduleConflictKind;
  detail: string;
}

export const MAX_PAID_MINUTES_PER_DAY = 10 * 60;

function clockMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** A block's length in minutes; an end at or before the start runs past midnight (handoff blockSpan). */
export function blockSpanMinutes(block: Pick<ConflictShiftBlock, 'startTime' | 'endTime'>): number {
  let span = clockMinutes(block.endTime) - clockMinutes(block.startTime);
  if (span <= 0) span += 24 * 60;
  return span;
}

/** Paid minutes for one block — its span minus the break, never negative (handoff payMin). */
export function paidMinutes(block: Pick<ConflictShiftBlock, 'startTime' | 'endTime' | 'breakMinutes'>): number {
  return Math.max(0, blockSpanMinutes(block) - block.breakMinutes);
}

export function detectScheduleConflicts(blocks: ConflictShiftBlock[]): DetectedScheduleConflict[] {
  const byEmployeeDay = new Map<string, ConflictShiftBlock[]>();
  for (const block of blocks) {
    const key = `${block.employeeId}|${block.date}`;
    const list = byEmployeeDay.get(key) ?? [];
    list.push(block);
    byEmployeeDay.set(key, list);
  }

  const conflicts: DetectedScheduleConflict[] = [];
  for (const dayBlocks of byEmployeeDay.values()) {
    const ranges = dayBlocks.map((block) => {
      const start = clockMinutes(block.startTime);
      return [start, start + blockSpanMinutes(block)] as const;
    });
    let overlap = false;
    for (let i = 0; i < ranges.length && !overlap; i += 1) {
      for (let j = i + 1; j < ranges.length; j += 1) {
        if (ranges[i][0] < ranges[j][1] && ranges[j][0] < ranges[i][1]) {
          overlap = true;
          break;
        }
      }
    }
    const { employeeId, date } = dayBlocks[0];
    if (overlap) {
      conflicts.push({ employeeId, date, kind: 'double_booking', detail: 'Overlap with another shift' });
      continue;
    }
    const totalPaid = dayBlocks.reduce((sum, block) => sum + paidMinutes(block), 0);
    if (totalPaid > MAX_PAID_MINUTES_PER_DAY) {
      conflicts.push({ employeeId, date, kind: 'long_shift', detail: 'Exceeds 10 hrs rule' });
    }
  }

  return conflicts.sort((a, b) => (a.date === b.date ? a.employeeId.localeCompare(b.employeeId) : a.date.localeCompare(b.date)));
}
