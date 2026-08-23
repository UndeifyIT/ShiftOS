/**
 * Extension point for actually delivering a notification outside the
 * in-app feed (email/push/SMS). No implementation of this interface exists
 * anywhere in this codebase, and none is registered by default -- there are
 * no provider credentials (SendGrid/Twilio/FCM/etc.) anywhere in this
 * repository or its .env, so building one would mean fabricating a
 * successful send that never actually happened. See
 * docs/backend-completion-audit.md for the "BLOCKED BY INFRASTRUCTURE" note.
 *
 * What IS real: `notify()` (notificationService.ts) always writes the
 * in-app notification row (guaranteed delivery through the one channel this
 * system can actually serve), and, when asked to deliver through a
 * non-in-app channel, always logs a notification_delivery_attempts row
 * reflecting what actually happened -- 'delivered' only if a registered
 * provider's send() call reports success, 'failed' with a clear reason
 * otherwise (including the honest "no provider configured" case). Adding a
 * real provider later is then a small, additive change: implement this
 * interface against a real SDK, and pass it into notify()'s `providers`
 * argument from wherever credentials become available -- no redesign of
 * this abstraction needed.
 */
export type DeliveryChannel = 'email' | 'push' | 'sms';

export interface NotificationDeliveryTarget {
  email: string | null;
  phone: string | null;
}

export interface NotificationDeliveryResult {
  delivered: boolean;
  /** Present when delivered is false; a human-readable reason, never a raw provider exception. */
  error?: string;
}

export interface NotificationDeliveryProvider {
  readonly channel: DeliveryChannel;
  send(target: NotificationDeliveryTarget, title: string, content: string): Promise<NotificationDeliveryResult>;
}

export type NotificationDeliveryProviders = Partial<Record<DeliveryChannel, NotificationDeliveryProvider>>;
