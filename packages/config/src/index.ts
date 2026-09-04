import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { ConfigError } from '@shiftos/errors';

export interface AppConfig {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  DATABASE_URL: string;
  NODE_ENV: 'development' | 'production' | 'test';
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  /**
   * Optional on purpose: not every environment needs admin-level Supabase Auth
   * operations (member invitations). Only ever read here, in this Node-only
   * server process — never bundled into apps/web (Vite only exposes VITE_-
   * prefixed vars to the client, and this module is never imported there).
   * Consumers must fail closed when it's absent (see packages/auth's
   * createAdminClient), not silently degrade.
   */
  SUPABASE_SERVICE_ROLE_KEY?: string;
  /**
   * The app's own public origin (e.g. https://shiftos-web.vercel.app), no
   * trailing slash. Optional on purpose, same reasoning as
   * SUPABASE_SERVICE_ROLE_KEY: without it, packages/auth's inviteUser() omits
   * redirectTo and Supabase Auth falls back to the project's dashboard-
   * configured Site URL for the invite email's link — which is exactly the
   * bug this variable exists to fix (that fallback pointed invitees at
   * /sign-in instead of /accept-invitation, discovered via live Phase I
   * browser testing of the onboarding-ux-audit feature). Consumers must
   * degrade to the old (broken) behavior when absent, not throw — this repo
   * has no confirmed record of every deployment target already having this
   * set.
   */
  SITE_URL?: string;
  /**
   * Optional: the AI assistant (packages/api/src/operations/assistant.ts)
   * checks for this itself and returns a typed "not configured" result
   * when absent, rather than the app failing to boot without it.
   */
  OPENAI_API_KEY?: string;
  /** Defaults to a cheap, tool-calling-capable model — no reason to default larger for short Q&A + tool selection. */
  OPENAI_MODEL: string;
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
    LOG_LEVEL: (process.env.LOG_LEVEL as AppConfig['LOG_LEVEL']) ?? 'info',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || undefined,
    SITE_URL: process.env.SITE_URL || undefined,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || undefined,
    OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini'
  };

  return config;
}

export default loadConfig;
