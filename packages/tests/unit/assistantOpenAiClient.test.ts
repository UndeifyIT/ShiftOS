import { describe, it, expect, vi, afterEach } from 'vitest';
import { callOpenAiChatCompletion, ASSISTANT_TOOLS } from '@shiftos/api';

describe('callOpenAiChatCompletion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the expected request shape and headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'hello', tool_calls: undefined } }] })
    });
    vi.stubGlobal('fetch', fetchMock);

    await callOpenAiChatCompletion('sk-test', 'gpt-4o-mini', [{ role: 'user', content: 'hi' }]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer sk-test');
    expect(options.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(options.body);
    expect(body.model).toBe('gpt-4o-mini');
    expect(body.messages).toEqual([{ role: 'user', content: 'hi' }]);
    expect(body.tools).toEqual(ASSISTANT_TOOLS);
  });

  it('parses a plain text response with no tool calls', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'The answer is 4.', tool_calls: undefined } }] })
    }));

    const result = await callOpenAiChatCompletion('sk-test', 'gpt-4o-mini', [{ role: 'user', content: 'hi' }]);
    expect(result.content).toBe('The answer is 4.');
    expect(result.toolCalls).toEqual([]);
  });

  it('parses a tool-call response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: null,
            tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'list_branches', arguments: '{}' } }]
          }
        }]
      })
    }));

    const result = await callOpenAiChatCompletion('sk-test', 'gpt-4o-mini', [{ role: 'user', content: 'hi' }]);
    expect(result.content).toBeNull();
    expect(result.toolCalls).toEqual([{ id: 'call_1', name: 'list_branches', arguments: '{}' }]);
  });

  it('throws a clear error when the HTTP call itself fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: { message: 'Invalid API key' } }) }));

    await expect(callOpenAiChatCompletion('sk-bad', 'gpt-4o-mini', [{ role: 'user', content: 'hi' }])).rejects.toThrow('Invalid API key');
  });
});
