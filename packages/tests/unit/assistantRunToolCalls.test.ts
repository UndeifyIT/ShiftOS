import { describe, it, expect } from 'vitest';
import { runToolCalls } from '@shiftos/api';
import { AuthorizationError, ValidationError } from '@shiftos/errors';
import type { RpcOperation } from '@shiftos/api';

const fakeContext = {} as Parameters<typeof runToolCalls>[0];

function fakeResolver(operations: Record<string, RpcOperation<unknown, unknown>>) {
  return (name: string) => operations[name];
}

describe('runToolCalls', () => {
  it('reports malformed JSON arguments without throwing', async () => {
    const { toolMessages, navigateTo } = await runToolCalls(
      fakeContext,
      [{ id: 'call_1', name: 'list_branches', arguments: '{not json' }],
      fakeResolver({})
    );
    expect(toolMessages).toEqual([{ role: 'tool', tool_call_id: 'call_1', content: 'invalid request: malformed arguments' }]);
    expect(navigateTo).toBeUndefined();
  });

  it('sets navigateTo for an allowed navigate path', async () => {
    const { toolMessages, navigateTo } = await runToolCalls(
      fakeContext,
      [{ id: 'call_1', name: 'navigate', arguments: JSON.stringify({ path: '/attendance' }) }],
      fakeResolver({})
    );
    expect(navigateTo).toBe('/attendance');
    expect(toolMessages).toEqual([{ role: 'tool', tool_call_id: 'call_1', content: 'navigating' }]);
  });

  it('rejects a navigate path that is not a real route', async () => {
    const { toolMessages, navigateTo } = await runToolCalls(
      fakeContext,
      [{ id: 'call_1', name: 'navigate', arguments: JSON.stringify({ path: 'https://evil.example.com' }) }],
      fakeResolver({})
    );
    expect(navigateTo).toBeUndefined();
    expect(toolMessages).toEqual([{ role: 'tool', tool_call_id: 'call_1', content: 'invalid request: not a real app route' }]);
  });

  it('reports an unknown tool name without throwing', async () => {
    const { toolMessages } = await runToolCalls(
      fakeContext,
      [{ id: 'call_1', name: 'not_a_real_tool', arguments: '{}' }],
      fakeResolver({})
    );
    expect(toolMessages).toEqual([{ role: 'tool', tool_call_id: 'call_1', content: 'invalid request: unknown tool' }]);
  });

  it('classifies AuthorizationError from the operation as "not permitted"', async () => {
    const operation: RpcOperation<unknown, unknown> = {
      name: 'list_branches',
      handler: async () => {
        throw new AuthorizationError('missing branches.read');
      }
    };
    const { toolMessages } = await runToolCalls(
      fakeContext,
      [{ id: 'call_1', name: 'list_branches', arguments: '{}' }],
      fakeResolver({ list_branches: operation })
    );
    expect(toolMessages).toEqual([{ role: 'tool', tool_call_id: 'call_1', content: 'not permitted' }]);
  });

  it('classifies ValidationError from the operation as an invalid-request message', async () => {
    const operation: RpcOperation<unknown, unknown> = {
      name: 'list_schedules',
      handler: async () => {
        throw new ValidationError('branchId is required');
      }
    };
    const { toolMessages } = await runToolCalls(
      fakeContext,
      [{ id: 'call_1', name: 'list_schedules', arguments: '{}' }],
      fakeResolver({ list_schedules: operation })
    );
    expect(toolMessages).toEqual([{ role: 'tool', tool_call_id: 'call_1', content: 'invalid request: branchId is required' }]);
  });

  it('rethrows an unexpected error instead of swallowing it', async () => {
    const operation: RpcOperation<unknown, unknown> = {
      name: 'list_employees',
      handler: async () => {
        throw new Error('unexpected database failure');
      }
    };
    await expect(
      runToolCalls(fakeContext, [{ id: 'call_1', name: 'list_employees', arguments: '{}' }], fakeResolver({ list_employees: operation }))
    ).rejects.toThrow('unexpected database failure');
  });

  it('returns an empty toolMessages array for an empty toolCalls input', async () => {
    const { toolMessages, navigateTo } = await runToolCalls(fakeContext, [], fakeResolver({}));
    expect(toolMessages).toEqual([]);
    expect(navigateTo).toBeUndefined();
  });
});
