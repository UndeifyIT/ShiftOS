import { createClient } from '@supabase/supabase-js';
import { loadConfig } from '@shiftos/config';
import { createDatabaseClient } from '@shiftos/database';
import { createDefaultRegistry, createHttpServer, type VerifyAccessToken } from '@shiftos/api';
import { SupabaseAuthProvider } from '@shiftos/auth';

/**
 * Local/production entrypoint for the RPC HTTP transport (packages/api's
 * httpServer.ts). Nothing here contains business logic — it only wires the
 * already-built pieces (registry, DB pool, token verification) together and
 * listens. `apps/web` never talks to Postgres or Supabase Auth admin
 * directly for Tier-1 domain data; it POSTs to this server's /rpc/<op>
 * endpoints (docs/frontend/SHIFTOS-FRONTEND-FOUNDATION.md §L "Server
 * Authority" / instruction #12 in this task).
 *
 * verifyAccessToken uses the anon client's auth.getUser(jwt), which asks
 * Supabase Auth to validate the token — no service-role key is needed or
 * used here.
 */
function main(): void {
  const config = loadConfig();
  const port = Number(process.env.PORT ?? 8787);

  const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const verifyAccessToken: VerifyAccessToken = async (accessToken) => {
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user) {
      throw new Error('Invalid or expired access token');
    }
    return { authUserId: data.user.id };
  };

  const client = createDatabaseClient({ connectionString: config.DATABASE_URL });
  const registry = createDefaultRegistry();

  // Only constructed when a service-role key is actually configured — admin
  // operations (member invitations) fail closed via AuthorizationError when
  // this is undefined, rather than this process silently pretending to have
  // a capability it doesn't.
  const authProvider = config.SUPABASE_SERVICE_ROLE_KEY
    ? new SupabaseAuthProvider({
        supabaseUrl: config.SUPABASE_URL,
        supabaseAnonKey: config.SUPABASE_ANON_KEY,
        supabaseServiceRoleKey: config.SUPABASE_SERVICE_ROLE_KEY
      })
    : undefined;

  const server = createHttpServer({ registry, client, verifyAccessToken, authProvider });

  server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`ShiftOS RPC server listening on http://localhost:${port}`);
  });

  const shutdown = async (): Promise<void> => {
    server.close();
    await client.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

main();
