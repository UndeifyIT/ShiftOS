import type { DatabaseClient } from '@shiftos/database';
import { ScheduleRepository, type Schedule } from './scheduleRepository.js';
import { ScheduleVersionRepository, type ScheduleVersion } from './scheduleVersionRepository.js';

export interface PublishScheduleResult {
  schedule: Schedule;
  version: ScheduleVersion;
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

    const schedule = await scheduleRepo.publish(organizationId, scheduleId);

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

    return { schedule, version };
  });
}
