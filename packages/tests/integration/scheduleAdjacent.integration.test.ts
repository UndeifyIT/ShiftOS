import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, TEST_FIXTURES, type TestContext } from '../testEnv.js';

describe('find adjacent schedule integration', () => {
  let ctx: TestContext;
  const scheduleIds: string[] = [];

  beforeAll(() => {
    ctx = createTestContext();
  });

  afterAll(async () => {
    if (scheduleIds.length > 0) {
      await ctx.client.query('DELETE FROM schedules WHERE organization_id = $1 AND id = ANY($2::uuid[])', [
        TEST_FIXTURES.organizationId,
        scheduleIds
      ]);
    }
    await ctx.client.close();
  });

  it('finds the next and previous schedule by start date, and returns null past the ends', async () => {
    const earlier = await ctx.call<{ id: string }>('create_schedule', {
      branchId: TEST_FIXTURES.branchId,
      name: 'Adjacent test — earlier week',
      startDate: '2027-12-06',
      endDate: '2027-12-12'
    });
    scheduleIds.push(earlier.id);

    const middle = await ctx.call<{ id: string }>('create_schedule', {
      branchId: TEST_FIXTURES.branchId,
      name: 'Adjacent test — middle week',
      startDate: '2027-12-13',
      endDate: '2027-12-19'
    });
    scheduleIds.push(middle.id);

    const later = await ctx.call<{ id: string }>('create_schedule', {
      branchId: TEST_FIXTURES.branchId,
      name: 'Adjacent test — later week',
      startDate: '2027-12-20',
      endDate: '2027-12-26'
    });
    scheduleIds.push(later.id);

    const next = await ctx.call<{ id: string } | null>('find_adjacent_schedule', { scheduleId: middle.id, direction: 'next' });
    expect(next?.id).toBe(later.id);

    const prev = await ctx.call<{ id: string } | null>('find_adjacent_schedule', { scheduleId: middle.id, direction: 'prev' });
    expect(prev?.id).toBe(earlier.id);

    const pastTheEnd = await ctx.call<{ id: string } | null>('find_adjacent_schedule', { scheduleId: later.id, direction: 'next' });
    expect(pastTheEnd).toBeNull();
  });
});
