import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { ConfigError } from '@shiftos/errors';

export interface AppConfig {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  DATABASE_URL: string;
  NODE_ENV: 'development' | 'production' | 'test';
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
}

const requiredVariables = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'DATABASE_URL'] as const;

/**
 * Walks up from the current working directory to find `.env`, bounded to 6
 * levels — plain `existsSync('.env')` only finds it when the process happens
 * to be launched from the repo root, which `pnpm --filter <pkg> <script>`
 * does NOT guarantee (it runs with cwd set to that package's directory).
 * Every consumer of loadConfig() should find the one repo-root `.env`
 * regardless of which package's script launched the process.
 */
function findDotenvPath(): string | null {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, '.env');
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return null;
}

function parseDotenv(): void {
  const dotenvPath = findDotenvPath();
  if (!dotenvPath) {
    return;
  }

  const contents = readFileSync(dotenvPath, 'utf8');
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
