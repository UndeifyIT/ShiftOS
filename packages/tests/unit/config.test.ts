import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '@shiftos/config';

const REQUIRED_ENV = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db'
};

describe('loadConfig OpenAI fields', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    for (const [key, value] of Object.entries(REQUIRED_ENV)) {
      process.env[key] = value;
    }
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('defaults OPENAI_API_KEY to undefined and OPENAI_MODEL to gpt-4o-mini when unset', () => {
    const config = loadConfig();
    expect(config.OPENAI_API_KEY).toBeUndefined();
    expect(config.OPENAI_MODEL).toBe('gpt-4o-mini');
  });

  it('reads OPENAI_API_KEY and OPENAI_MODEL from the environment when set', () => {
    process.env.OPENAI_API_KEY = 'sk-test-key';
    process.env.OPENAI_MODEL = 'gpt-4o';
    const config = loadConfig();
    expect(config.OPENAI_API_KEY).toBe('sk-test-key');
    expect(config.OPENAI_MODEL).toBe('gpt-4o');
  });
});
