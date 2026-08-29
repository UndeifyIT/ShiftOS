import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { askAssistant } from '@shiftos/api';

describe('askAssistant when OPENAI_API_KEY is not configured', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Self-contained, like config.test.ts (Task 1) — doesn't rely on a real
    // .env being present, and explicitly clears OPENAI_API_KEY regardless
    // of what the real environment has it set to.
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  it('returns a typed "not configured" answer without calling OpenAI', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    // A minimal stand-in context — the not-configured check must happen
    // before anything reads from it, so its shape doesn't matter here.
    const fakeContext = {} as Parameters<typeof askAssistant.handler>[0];

    const result = await askAssistant.handler(fakeContext, { question: 'How many branches do we have?' });

    expect(result.answer).toBe("AI assistant isn't configured yet.");
    expect(result.navigateTo).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
