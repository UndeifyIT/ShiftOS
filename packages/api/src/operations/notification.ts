import { NotificationService } from '@shiftos/services';
import { defineRpc } from '../rpc.js';
import { asRecord, booleanField, numberField, requiredStringField } from '../parse.js';

export const getMyNotificationPreferences = defineRpc('get_my_notification_preferences', async (context) => {
  return new NotificationService(context).getMyPreferences();
});

export const setMyNotificationPreference = defineRpc('set_my_notification_preference', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new NotificationService(context).setMyPreference(requiredStringField(input, 'channel'), booleanField(input, 'isEnabled') ?? true);
});

export const listMyNotifications = defineRpc('list_my_notifications', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput ?? {});
  return new NotificationService(context).listMine({
    unreadOnly: booleanField(input, 'unreadOnly'),
    limit: numberField(input, 'limit'),
    offset: numberField(input, 'offset')
  });
});

export const markNotificationRead = defineRpc('mark_notification_read', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new NotificationService(context).markRead(requiredStringField(input, 'notificationId'));
});

export const markAllNotificationsRead = defineRpc('mark_all_notifications_read', async (context) => {
  const count = await new NotificationService(context).markAllRead();
  return { markedRead: count };
});

export const notificationOperations = [
  listMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getMyNotificationPreferences,
  setMyNotificationPreference
];
