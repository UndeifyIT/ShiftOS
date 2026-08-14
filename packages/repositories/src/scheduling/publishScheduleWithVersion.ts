import type { DatabaseClient } from '@shiftos/database';
import { ScheduleRepository, type Schedule } from './scheduleRepository.js';
import { ScheduleVersionRepository, type ScheduleVersion } from './scheduleVersionRepository.js';
import { ShiftRepository, type Shift } from './shiftRepository.js';

export interface PublishScheduleResult {
  schedule: Schedule;
  version: ScheduleVersion;
  publishedShifts: Shift[];
}

/**
 * Publishing a schedule and recording its version must succeed or fail
 * together — a published schedule with no corresponding version row (or a
 * version row for a schedule that failed to publish) is an inconsistent
 * state, so both writes run inside one transaction (see section 18 of the
 * Milestone 3 brief: "creating schedule + schedule version records").
 *
 * Repository instances are constructed against the transaction-scoped client
 * the callback receives, not the outer `client` — that's what makes both
 * writes part of the same BEGIN/COMMIT/ROLLBACK (see
 * packages/database/src/postgresClient.ts's transaction()).
 */
export async function publishScheduleWithVersion(
  client: DatabaseClient,
  organizationId: string,
  scheduleId: string,
  publishedBy: string | null,
  changesSummary: string | null
): Promise<PublishScheduleResult> {
  return client.transaction(async (trxClient) => {
    const scheduleRepo = new ScheduleRepository(trxClient);
    const versionRepo = new ScheduleVersionRepository(trxClient);
    const shiftRepo = new ShiftRepository(trxClient);

    const schedule = await scheduleRepo.publish(organizationId, scheduleId);

    // Publishing a schedule must also publish its shifts (031's audit found
    // this was the missing link: ShiftRepository.publish() already existed
    // but nothing ever called it — a schedule could be "published" while
    // every one of its shifts stayed 'draft' forever). Shifts belong to a
    // schedule by branch_id + shift_date within range, not a schedule_id FK
    // (see SchedulingService's class doc for why). Only 'draft' shifts move;
    // a shift already 'cancelled'/'archived' within the range is left alone.
    const shiftsInRange = await shiftRepo.findByBranchAndDateRange(organizationId, schedule.branch_id, schedule.start_date, schedule.end_date);
    const publishedShifts: Shift[] = [];
    for (const shift of shiftsInRange) {
      if (shift.status === 'draft') {
        publishedShifts.push(await shiftRepo.publish(organizationId, shift.id));
      }
    }

    const previousVersions = await versionRepo.listForSchedule(organizationId, scheduleId);
    const nextVersionNumber = previousVersions.length > 0
      ? Math.max(...previousVersions.map((entry) => entry.version)) + 1
      : 1;

    const version = await versionRepo.recordVersion(organizationId, {
      schedule_id: scheduleId,
      version: nextVersionNumber,
      published_by: publishedBy,
      changes_summary: changesSummary
    });

    return { schedule, version, publishedShifts };
  });
}
