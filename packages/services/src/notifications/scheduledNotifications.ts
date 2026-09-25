import { NotificationDispatchRepository } from '@shiftos/repositories';
import type { DatabaseClient } from '@shiftos/database';
import { notifyBranchEvent, notifyEvent } from './notificationService.js';

/*
 * The Settings → Notifications events that no request triggers — they are
 * about time passing (design handoff STNG_NOTIFICATIONS):
 *
 * - Unpublished schedule: a week still in draft two days before it starts.
 * - Invitations: an invitation was accepted, or expired unused. Accepting
 *   happens inside Postgres (the accept-invitation function), so the job is
 *   what notices it too.
 * - Announcement acknowledgements: a weekly digest, on Mondays, of who hasn't
 *   acknowledged what, sent to each notice's author.
 *
 * The RPC server runs this every few minutes (packages/backend/src/server.ts).
 * Every notification is claimed in notification_dispatches (071) before it is
 * sent, so however often the job runs — or on however many servers — each one
 * goes out once.
 */

const DAY_MS = 86_400_000;

/** 'YYYY-MM-DD' (UTC) of an instant. */
export function utcDate(at: Date): string {
  return at.toISOString().slice(0, 10);
}

/** ISO week, e.g. '2026-W39' — the digest's once-a-week key. */
export function isoWeekKey(at: Date): string {
  const day = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
  const weekday = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((day.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
  return `${day.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** A draft starting today, tomorrow or the day after is "two days before it starts" — or later than that and still unpublished. */
export function draftNeedsReminder(startDate: string, today: string): boolean {
  const days = Math.round((Date.parse(`${startDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);
  return days >= 0 && days <= 2;
}

/** The digest goes out on Mondays (UTC). */
export const isDigestDay = (at: Date): boolean => at.getUTCDay() === 1;

export interface DigestLine {
  title: string;
  outstanding: number;
  audience: number;
}

/** '2 notices still waiting on acknowledgement' / the lines listing them, most outstanding first. */
export function digestMessage(lines: DigestLine[]): { title: string; content: string } {
  const sorted = [...lines].sort((a, b) => b.outstanding - a.outstanding);
  return {
    title: `Weekly digest: ${sorted.length} ${sorted.length === 1 ? 'notice' : 'notices'} still waiting on acknowledgement`,
    content: sorted.map((l) => `${l.title} — ${l.outstanding} of ${l.audience} haven't acknowledged`).join('\n')
  };
}

export interface ScheduledRunResult {
  unpublishedSchedules: number;
  invitations: number;
  digests: number;
  errors: string[];
}

export async function runScheduledNotifications(client: DatabaseClient, now: Date = new Date()): Promise<ScheduledRunResult> {
  const dispatches = new NotificationDispatchRepository(client);
  const result: ScheduledRunResult = { unpublishedSchedules: 0, invitations: 0, digests: 0, errors: [] };
  const today = utcDate(now);

  // Unpublished schedule — to whoever can publish in that branch.
  try {
    const drafts = await client.query<{ id: string; organization_id: string; branch_id: string; name: string; start_date: string }>(
      `SELECT s.id, s.organization_id, s.branch_id, s.name, s.start_date::text AS start_date
         FROM schedules s
        WHERE s.status = 'draft' AND s.deleted_at IS NULL
          AND s.start_date BETWEEN $1::date AND ($1::date + 2)
          AND NOT EXISTS (
            SELECT 1 FROM schedules p
             WHERE p.organization_id = s.organization_id AND p.branch_id = s.branch_id
               AND p.status = 'published' AND p.deleted_at IS NULL
               AND p.start_date <= s.start_date AND p.end_date >= s.start_date
          )`,
      [today]
    );
    for (const draft of drafts.filter((d) => draftNeedsReminder(d.start_date, today))) {
      if (!(await dispatches.claim(draft.organization_id, 'unpublished_schedule', `unpublished:${draft.id}`))) continue;
      await notifyBranchEvent(
        client,
        draft.organization_id,
        draft.branch_id,
        'schedules.publish',
        'unpublished_schedule',
        `${draft.name} is still a draft`,
        `It starts ${draft.start_date}. Publish it so your team can see their shifts and raise swaps.`,
        { priority: 'high' }
      );
      result.unpublishedSchedules += 1;
    }
  } catch (error) {
    result.errors.push(`unpublished_schedule: ${(error as Error).message}`);
  }

  // Invitations — accepted, or expired unused, in the last week — to the person who sent them.
  try {
    const invitations = await client.query<{
      id: string;
      organization_id: string;
      email: string;
      first_name: string | null;
      last_name: string | null;
      invited_by: string;
      status: string;
    }>(
      `SELECT id, organization_id, email, first_name, last_name, invited_by, status
         FROM invitations
        WHERE (status = 'accepted' AND accepted_at > now() - interval '7 days')
           OR (status IN ('pending', 'expired') AND expires_at < now() AND expires_at > now() - interval '7 days')`
    );
    for (const invitation of invitations) {
      const accepted = invitation.status === 'accepted';
      const key = `${accepted ? 'invitation-accepted' : 'invitation-expired'}:${invitation.id}`;
      if (!(await dispatches.claim(invitation.organization_id, 'invitations', key))) continue;
      const who = `${invitation.first_name ?? ''} ${invitation.last_name ?? ''}`.trim() || invitation.email;
      await notifyEvent(
        client,
        invitation.organization_id,
        invitation.invited_by,
        'invitations',
        accepted ? `${who} accepted your invitation` : `Your invitation to ${who} expired unused`,
        accepted ? `${invitation.email} has joined your organization on ShiftOS.` : `${invitation.email} never accepted it. You can send a new invitation.`
      );
      result.invitations += 1;
    }
  } catch (error) {
    result.errors.push(`invitations: ${(error as Error).message}`);
  }

  // Announcement acknowledgements — Mondays, one digest per author per week.
  if (isDigestDay(now)) {
    try {
      const rows = await client.query<{ organization_id: string; created_by: string; title: string; audience: string | number; acknowledged: string | number }>(
        `SELECT a.organization_id, a.created_by, a.title,
                (SELECT count(*) FROM employees e
                  WHERE e.organization_id = a.organization_id AND e.deleted_at IS NULL AND e.is_active = true
                    AND e.employment_status = 'active' AND (a.branch_id IS NULL OR e.branch_id = a.branch_id)) AS audience,
                (SELECT count(*) FROM announcement_acknowledgements k WHERE k.announcement_id = a.id) AS acknowledged
           FROM announcements a
          WHERE a.is_published = true AND a.deleted_at IS NULL
            AND a.published_at > now() - interval '30 days'
            AND (a.expires_at IS NULL OR a.expires_at > now())`
      );
      const byAuthor = new Map<string, { organizationId: string; lines: DigestLine[] }>();
      for (const row of rows) {
        const audience = Number(row.audience);
        const outstanding = Math.max(0, audience - Number(row.acknowledged));
        if (outstanding === 0) continue;
        const key = `${row.organization_id}:${row.created_by}`;
        const entry = byAuthor.get(key) ?? { organizationId: row.organization_id, lines: [] };
        entry.lines.push({ title: row.title, outstanding, audience });
        byAuthor.set(key, entry);
      }
      const week = isoWeekKey(now);
      for (const [key, entry] of byAuthor) {
        const authorId = key.split(':')[1];
        if (!(await dispatches.claim(entry.organizationId, 'announcement_digest', `digest:${authorId}:${week}`))) continue;
        const message = digestMessage(entry.lines);
        await notifyEvent(client, entry.organizationId, authorId, 'announcement_digest', message.title, message.content);
        result.digests += 1;
      }
    } catch (error) {
      result.errors.push(`announcement_digest: ${(error as Error).message}`);
    }
  }

  return result;
}
