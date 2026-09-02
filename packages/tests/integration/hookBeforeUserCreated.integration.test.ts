import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, type TestContext } from '../testEnv.js';

/**
 * hook_before_user_created (supabase/migrations/052_create_signup_abuse_hook.sql)
 * — the Supabase "Before User Created" auth hook that blocks disposable-email
 * signups and rate-limits signup bursts per IP.
 *
 * Until this file existed, every branch of this function had only ever been
 * verified by ad hoc session SQL that is long gone. The function is called by
 * Supabase Auth with a single jsonb argument shaped
 *   { "user": { "email": ... }, "metadata": { "ip_address": ... } }
 * and returns {} to allow or { "error": { "http_code", "message" } } to reject.
 * Each case below invokes it exactly that way.
 *
 * IP addresses: 203.0.113.0/24 is TEST-NET-3, reserved for documentation and
 * testing by RFC 5737. It can never appear in real signup traffic, so these
 * rows are unambiguously this test's own and the cleanup filters below cannot
 * touch anyone else's data. signup_attempts and security_events are shared,
 * live tables — nothing here deletes by anything other than the test IP.
 */
const TEST_IP = '203.0.113.99';

const DISPOSABLE_MESSAGE = 'Please use a permanent email address to create your account.';
const RATE_LIMIT_MESSAGE = 'Too many attempts. Please wait a few minutes and try again.';

interface HookError {
  http_code?: number;
  message?: string;
}
interface HookResult {
  error?: HookError;
}

describe('hook_before_user_created integration', () => {
  let ctx: TestContext;
  /** A domain confirmed present in the live blocklist, resolved in beforeAll. */
  let disposableDomain: string;

  async function callHook(event: unknown): Promise<HookResult> {
    const rows = await ctx.client.query<{ result: HookResult }>(
      'SELECT public.hook_before_user_created($1::jsonb) AS result',
      [JSON.stringify(event)]
    );
    const result = rows[0]?.result;
    if (result === undefined || result === null) {
      throw new Error('hook_before_user_created returned no row');
    }
    return result;
  }

  async function countAttempts(): Promise<number> {
    const rows = await ctx.client.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM public.signup_attempts WHERE ip_address = $1::inet',
      [TEST_IP]
    );
    return Number(rows[0]?.count ?? 0);
  }

  /**
   * Removes every row this test can have created, filtered on the TEST-NET IP
   * only. Called inline after each assertion block as well as in afterAll, so
   * a mid-test failure cannot leave residue behind for the next run (or for
   * the rate-limit case, skew its count).
   *
   * security_events is append-only: migration 024 attaches
   * trg_security_events_block_mutation (BEFORE UPDATE OR DELETE, FOR EACH ROW),
   * which raises unconditionally for every role — including the owner this
   * test connects as. The DELETE is still attempted, deliberately: if the
   * immutability guarantee is ever relaxed the rows get cleaned up, and while
   * it holds, the raise is caught here rather than failing the test. The
   * surviving rows carry ip_address = 203.0.113.99, so they are trivially
   * identifiable as test-originated.
   */
  async function cleanup(): Promise<void> {
    await ctx.client.query('DELETE FROM public.signup_attempts WHERE ip_address = $1::inet', [TEST_IP]);
    try {
      await ctx.client.query('DELETE FROM public.security_events WHERE ip_address = $1::inet', [TEST_IP]);
    } catch {
      // Expected: security_events is append-only (024). Nothing to do.
    }
  }

  beforeAll(async () => {
    ctx = createTestContext();

    const preferred = await ctx.client.query<{ domain: string }>(
      'SELECT domain FROM public.disposable_email_domains WHERE domain = $1',
      ['mailinator.com']
    );
    if (preferred[0]) {
      disposableDomain = preferred[0].domain;
    } else {
      const any = await ctx.client.query<{ domain: string }>(
        'SELECT domain FROM public.disposable_email_domains ORDER BY domain LIMIT 1'
      );
      if (!any[0]) {
        throw new Error('disposable_email_domains is empty — the blocklist seed (051) has not been applied');
      }
      disposableDomain = any[0].domain;
    }

    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await ctx.client.close();
  });

  it('rejects a known disposable domain with the spec 400 message', async () => {
    try {
      const result = await callHook({
        user: { email: `probe@${disposableDomain}` },
        metadata: { ip_address: TEST_IP }
      });

      expect(result.error).toBeDefined();
      expect(result.error?.http_code).toBe(400);
      expect(result.error?.message).toBe(DISPOSABLE_MESSAGE);
    } finally {
      await cleanup();
    }
  });

  it('allows a legitimate domain, returning an empty object with no error key', async () => {
    try {
      const result = await callHook({
        user: { email: 'someone@gmail.com' },
        metadata: { ip_address: TEST_IP }
      });

      expect(result).toEqual({});
      expect(result.error).toBeUndefined();
    } finally {
      await cleanup();
    }
  });

  it('fails open when the metadata key is missing entirely', async () => {
    try {
      const result = await callHook({ user: { email: 'someone@gmail.com' } });

      expect(result).toEqual({});
      expect(result.error).toBeUndefined();
    } finally {
      await cleanup();
    }
  });

  it('fails open when ip_address is unparseable', async () => {
    try {
      const result = await callHook({
        user: { email: 'someone@gmail.com' },
        metadata: { ip_address: 'not-an-ip' }
      });

      expect(result).toEqual({});
      expect(result.error).toBeUndefined();
    } finally {
      await cleanup();
    }
  });

  it('rate-limits at the threshold and does not extend its own window on a blocked retry', async () => {
    try {
      // Exactly the threshold (c_max_attempts = 8) inside the 10-minute window,
      // spread across the last few minutes so none of them is on the boundary.
      await ctx.client.query(
        `INSERT INTO public.signup_attempts (ip_address, email_domain, created_at)
         SELECT $1::inet, 'gmail.com', now() - (g * interval '30 seconds')
           FROM generate_series(1, 8) AS g`,
        [TEST_IP]
      );
      expect(await countAttempts()).toBe(8);

      const result = await callHook({
        user: { email: 'someone@gmail.com' },
        metadata: { ip_address: TEST_IP }
      });

      expect(result.error).toBeDefined();
      expect(result.error?.http_code).toBe(429);
      expect(result.error?.message).toBe(RATE_LIMIT_MESSAGE);

      // The anti-lockout property, and the reason the rate-limit branch has no
      // signup_attempts INSERT of its own: a blocked retry must not stamp a
      // fresh created_at inside the window. If it did, a legitimate user behind
      // shared NAT who follows the error message's advice and retries would
      // push their own countdown forward on every attempt and could lock
      // themselves out indefinitely. 8, not 9.
      expect(await countAttempts()).toBe(8);
    } finally {
      await cleanup();
    }
  });

  it('leaves no signup_attempts rows for the test IP behind', async () => {
    expect(await countAttempts()).toBe(0);
  });
});
