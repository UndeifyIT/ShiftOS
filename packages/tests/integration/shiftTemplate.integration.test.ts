import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, TEST_FIXTURES, type TestContext } from '../testEnv.js';

describe('shift templates integration', () => {
  let ctx: TestContext;
  const templateIds: string[] = [];

  beforeAll(() => {
    ctx = createTestContext();
  });

  afterAll(async () => {
    if (templateIds.length > 0) {
      await ctx.client.query('DELETE FROM shift_templates WHERE organization_id = $1 AND id = ANY($2::uuid[])', [
        TEST_FIXTURES.organizationId,
        templateIds
      ]);
    }
    await ctx.client.close();
  });

  it('creates and lists a shift template for the fixture branch', async () => {
    const template = await ctx.call<{ id: string; name: string; duration: string }>('create_shift_template', {
      branchId: TEST_FIXTURES.branchId,
      name: `Integration Test Template ${Date.now()}`,
      startTime: '09:00',
      endTime: '17:00'
    });
    templateIds.push(template.id);
    expect(template.duration).toBe('08:00:00');

    const templates = await ctx.call<Array<{ id: string }>>('list_shift_templates', { branchId: TEST_FIXTURES.branchId });
    expect(templates.some((t) => t.id === template.id)).toBe(true);
  });

  it('rejects a template whose end time is not after its start time', async () => {
    const result = await ctx.callRaw('create_shift_template', {
      branchId: TEST_FIXTURES.branchId,
      name: `Invalid Template ${Date.now()}`,
      startTime: '17:00',
      endTime: '09:00'
    });
    expect(result.success).toBe(false);
  });
});
