import { AnnouncementService } from '@shiftos/services';
import type { AnnouncementType } from '@shiftos/repositories';
import { defineRpc } from '../rpc.js';
import { asRecord, requiredStringField, stringField, numberField } from '../parse.js';

export const createAnnouncement = defineRpc('create_announcement', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new AnnouncementService(context).createAnnouncement({
    branchId: stringField(input, 'branchId') ?? null,
    title: requiredStringField(input, 'title'),
    content: requiredStringField(input, 'content'),
    announcementType: stringField(input, 'announcementType') as AnnouncementType | undefined,
    expiresAt: stringField(input, 'expiresAt') ?? null
  });
});

export const updateAnnouncement = defineRpc('update_announcement', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  const announcementId = requiredStringField(input, 'announcementId');
  return new AnnouncementService(context).updateAnnouncement(announcementId, {
    title: stringField(input, 'title'),
    content: stringField(input, 'content'),
    announcementType: stringField(input, 'announcementType') as AnnouncementType | undefined,
    expiresAt: stringField(input, 'expiresAt') ?? (input.expiresAt === null ? null : undefined)
  });
});

export const publishAnnouncement = defineRpc('publish_announcement', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new AnnouncementService(context).publishAnnouncement(requiredStringField(input, 'announcementId'));
});

export const archiveAnnouncement = defineRpc('archive_announcement', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new AnnouncementService(context).archiveAnnouncement(requiredStringField(input, 'announcementId'));
});

export const getAnnouncement = defineRpc('get_announcement', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new AnnouncementService(context).getAnnouncement(requiredStringField(input, 'announcementId'));
});

export const listAnnouncements = defineRpc('list_announcements', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput ?? {});
  return new AnnouncementService(context).listAnnouncements(stringField(input, 'branchId'), {
    limit: numberField(input, 'limit'),
    offset: numberField(input, 'offset')
  });
});

export const acknowledgeAnnouncement = defineRpc('acknowledge_announcement', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  await new AnnouncementService(context).acknowledgeAnnouncement(requiredStringField(input, 'announcementId'));
  return { acknowledged: true };
});

export const hasAcknowledgedAnnouncement = defineRpc('has_acknowledged_announcement', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  const acknowledged = await new AnnouncementService(context).hasAcknowledged(requiredStringField(input, 'announcementId'));
  return { acknowledged };
});

export const announcementOperations = [
  createAnnouncement, updateAnnouncement, publishAnnouncement, archiveAnnouncement,
  getAnnouncement, listAnnouncements, acknowledgeAnnouncement, hasAcknowledgedAnnouncement
];
