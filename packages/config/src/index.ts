import { existsSync, readFileSync } from 'fs';
import { ConfigError } from '@shiftos/errors';

export interface AppConfig {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  DATABASE_URL: string;
  NODE_ENV: 'development' | 'production' | 'test';
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
}

const requiredVariables = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'DATABASE_URL'] as const;

function parseDotenv(): void {
  if (!existsSync('.env')) {
    return;
  }

  const contents = readFileSync('.env', 'utf8');
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const [key, ...valueParts] = line.split('=');
    if (!key || valueParts.length === 0) {
      continue;
    }

    const value = valueParts.join('=').trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new ConfigError(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadConfig(): AppConfig {
  parseDotenv();

  const config: AppConfig = {
    SUPABASE_URL: requireEnv('SUPABASE_URL'),
    SUPABASE_ANON_KEY: requireEnv('SUPABASE_ANON_KEY'),
    DATABASE_URL: requireEnv('DATABASE_URL'),
    NODE_ENV: (process.env.NODE_ENV as AppConfig['NODE_ENV']) ?? 'development',
    LOG_LEVEL: (process.env.LOG_LEVEL as AppConfig['LOG_LEVEL']) ?? 'info'
  };

  return config;
}

export default loadConfig;
