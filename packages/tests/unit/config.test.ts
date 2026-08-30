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
    // Set to '' rather than delete: loadConfig()'s parseDotenv() re-reads
    // the real .env file on every call and fills in any key NOT already
    // present in process.env (`!(key in process.env)`) -- so `delete` here
    // would get silently overwritten by a real OPENAI_API_KEY value on a
    // machine that has one configured in .env for actual use. An empty
    // string is still present as a key (parseDotenv leaves it alone) and
    // is still falsy, so loadConfig()'s `|| undefined`/`|| 'gpt-4o-mini'`
    // fallbacks behave identically to a genuinely-unset variable.
    process.env.OPENAI_API_KEY = '';
    process.env.OPENAI_MODEL = '';
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
