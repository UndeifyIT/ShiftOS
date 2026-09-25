import { describe, it, expect } from 'vitest';
import { digestMessage, draftNeedsReminder, isDigestDay, isoWeekKey } from '../../services/src/notifications/scheduledNotifications.js';

describe('Scheduled notifications (handoff Settings → Notifications)', () => {
  it('reminds about a draft from two days before it starts', () => {
    expect(draftNeedsReminder('2026-09-27', '2026-09-25')).toBe(true);
    expect(draftNeedsReminder('2026-09-25', '2026-09-25')).toBe(true);
    expect(draftNeedsReminder('2026-09-28', '2026-09-25')).toBe(false);
    expect(draftNeedsReminder('2026-09-24', '2026-09-25')).toBe(false);
  });

  it('sends the digest on Mondays, once per ISO week', () => {
    expect(isDigestDay(new Date('2026-09-28T08:00:00Z'))).toBe(true);
    expect(isDigestDay(new Date('2026-09-25T08:00:00Z'))).toBe(false);
    expect(isoWeekKey(new Date('2026-09-28T08:00:00Z'))).toBe('2026-W40');
    expect(isoWeekKey(new Date('2027-01-01T08:00:00Z'))).toBe('2026-W53');
  });

  it('lists the notices with the most people outstanding first', () => {
    const message = digestMessage([
      { title: 'Stocktake weekend', outstanding: 2, audience: 20 },
      { title: 'Late threshold', outstanding: 9, audience: 20 }
    ]);
    expect(message.title).toBe('Weekly digest: 2 notices still waiting on acknowledgement');
    expect(message.content.split('\n')[0]).toBe("Late threshold — 9 of 20 haven't acknowledged");
  });
});
