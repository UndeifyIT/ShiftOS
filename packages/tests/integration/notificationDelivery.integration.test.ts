import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { notify } from '@shiftos/services';
import { createTestContext, TEST_FIXTURES, type TestContext } from '../testEnv.js';

/**
 * notify() is deliberately not exposed as its own RPC (see notificationService.ts's
 * doc comment: a notification's recipient/content is decided by the triggering
 * domain event, never by arbitrary client input) -- so it is exercised here the
 * same way every other internal service caller uses it: as a direct function
 * call against the real database client, not through RpcRegistry.execute().
 */
describe('notification delivery integration', () => {
  let ctx: TestContext;
  let ownerUserId: string;
  const notificationIds: string[] = [];

  beforeAll(async () => {
    ctx = createTestContext();
    const rows = await ctx.client.query<{ id: string }>('SELECT id FROM users WHERE auth_user_id = $1', [TEST_FIXTURES.ownerAuthUserId]);
    ownerUserId = rows[0].id;
  });

  afterAll(async () => {
    if (notificationIds.length > 0) {
      // notification_delivery_attempts cascades on notification delete (016).
      await ctx.client.query('DELETE FROM notifications WHERE id = ANY($1::uuid[])', [notificationIds]);
    }
    await ctx.client.query("DELETE FROM notification_preferences WHERE organization_id = $1 AND user_id = $2 AND channel = 'sms'", [
      TEST_FIXTURES.organizationId,
      ownerUserId
    ]);
    await ctx.client.close();
  });

  it('reports every channel as enabled by default, then persists a disabled preference', async () => {
    const before = await ctx.call<Array<{ channel: string; is_enabled: boolean }>>('get_my_notification_preferences', {});
    expect(before.map((p) => p.channel).sort()).toEqual(['email', 'in_app', 'push', 'sms']);
    expect(before.find((p) => p.channel === 'sms')?.is_enabled).toBe(true);

    const updated = await ctx.call<{ channel: string; is_enabled: boolean }>('set_my_notification_preference', {
      channel: 'sms',
      isEnabled: false
    });
    expect(updated.is_enabled).toBe(false);

    const after = await ctx.call<Array<{ channel: string; is_enabled: boolean }>>('get_my_notification_preferences', {});
    expect(after.find((p) => p.channel === 'sms')?.is_enabled).toBe(false);
  });

  it('rejects an unknown channel', async () => {
    const result = await ctx.callRaw('set_my_notification_preference', { channel: 'carrier_pigeon', isEnabled: true });
    expect(result.success).toBe(false);
  });

  it('skips delivery and logs why when the recipient has disabled the channel', async () => {
    await notify(ctx.client, TEST_FIXTURES.organizationId, ownerUserId, 'Delivery test: disabled channel', 'body', 'normal', 'sms');

    const created = await ctx.client.query<{ id: string; channel: string }>(
      "SELECT id, channel FROM notifications WHERE user_id = $1 AND title = 'Delivery test: disabled channel' ORDER BY created_at DESC LIMIT 1",
      [ownerUserId]
    );
    expect(created).toHaveLength(1);
    notificationIds.push(created[0].id);
    expect(created[0].channel).toBe('sms');

    const attempts = await ctx.client.query<{ status: string; error_message: string | null }>(
      'SELECT status, error_message FROM notification_delivery_attempts WHERE notification_id = $1',
      [created[0].id]
    );
    expect(attempts).toHaveLength(1);
    expect(attempts[0].status).toBe('failed');
    expect(attempts[0].error_message).toContain('disabled');
  });

  it('skips delivery and logs the honest reason when no provider is configured for an enabled channel', async () => {
    await notify(ctx.client, TEST_FIXTURES.organizationId, ownerUserId, 'Delivery test: no provider', 'body', 'normal', 'email');

    const created = await ctx.client.query<{ id: string }>(
      "SELECT id FROM notifications WHERE user_id = $1 AND title = 'Delivery test: no provider' ORDER BY created_at DESC LIMIT 1",
      [ownerUserId]
    );
    notificationIds.push(created[0].id);

    const attempts = await ctx.client.query<{ status: string; error_message: string | null }>(
      'SELECT status, error_message FROM notification_delivery_attempts WHERE notification_id = $1',
      [created[0].id]
    );
    expect(attempts).toHaveLength(1);
    expect(attempts[0].status).toBe('failed');
    expect(attempts[0].error_message).toContain('no email delivery provider is configured');
  });

  it('still writes the in-app row (and no delivery attempt) when no channel is requested, unchanged from every other caller', async () => {
    await notify(ctx.client, TEST_FIXTURES.organizationId, ownerUserId, 'Delivery test: in-app only', 'body');

    const created = await ctx.client.query<{ id: string; channel: string }>(
      "SELECT id, channel FROM notifications WHERE user_id = $1 AND title = 'Delivery test: in-app only' ORDER BY created_at DESC LIMIT 1",
      [ownerUserId]
    );
    notificationIds.push(created[0].id);
    expect(created[0].channel).toBe('in_app');

    const attempts = await ctx.client.query('SELECT 1 FROM notification_delivery_attempts WHERE notification_id = $1', [created[0].id]);
    expect(attempts).toHaveLength(0);
  });
});
