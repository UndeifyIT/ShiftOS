import { describe, it, expect } from 'vitest';
import { detectScheduleConflicts, paidMinutes, blockSpanMinutes } from '@shiftos/services';

const block = (startTime: string, endTime: string, breakMinutes: number, employeeId = 'e1', date = '2025-05-13') => ({
  employeeId,
  date,
  startTime,
  endTime,
  breakMinutes
});

describe('schedule conflict rules (design handoff schedVals)', () => {
  it('measures spans across midnight and subtracts breaks from paid time', () => {
    expect(blockSpanMinutes(block('22:00', '06:00', 0))).toBe(480);
    expect(paidMinutes(block('07:30', '17:00', 60))).toBe(510);
    expect(paidMinutes(block('09:00', '09:30', 45))).toBe(0);
  });

  it('allows exactly 10 paid hours (11:30 AM – 10:30 PM with a 1 hour break)', () => {
    expect(detectScheduleConflicts([block('11:30', '22:30', 60)])).toEqual([]);
  });

  it('flags more than 10 paid hours in one day as the 10-hour rule', () => {
    expect(detectScheduleConflicts([block('11:30', '22:30', 0, 'e7')])).toEqual([
      { employeeId: 'e7', date: '2025-05-13', kind: 'long_shift', detail: 'Exceeds 10 hrs rule' }
    ]);
  });

  it('sums paid time across split blocks on the same day', () => {
    const conflicts = detectScheduleConflicts([block('06:00', '12:00', 0), block('13:00', '18:30', 0)]);
    expect(conflicts.map((c) => c.kind)).toEqual(['long_shift']);
  });

  it('reports overlapping blocks as a double-booking, taking precedence over the 10-hour rule', () => {
    const conflicts = detectScheduleConflicts([block('14:30', '22:30', 60, 'e6', '2025-05-16'), block('20:00', '23:00', 0, 'e6', '2025-05-16')]);
    expect(conflicts).toEqual([{ employeeId: 'e6', date: '2025-05-16', kind: 'double_booking', detail: 'Overlap with another shift' }]);
  });

  it('does not treat touching blocks, other days, or other employees as overlaps', () => {
    expect(
      detectScheduleConflicts([
        block('09:00', '13:00', 0),
        block('13:00', '17:00', 0),
        block('12:00', '16:00', 0, 'e2'),
        block('12:00', '16:00', 0, 'e1', '2025-05-14')
      ])
    ).toEqual([]);
  });
});
