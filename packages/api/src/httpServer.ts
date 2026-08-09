import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import type { DatabaseClient } from '@shiftos/database';
import { buildErrorApiResponse } from '@shiftos/utils';
import { AuthorizationError, ValidationError } from '@shiftos/errors';
import type { RpcRegistry } from './rpc.js';

/**
 * The thinnest possible HTTP transport for the RPC registry — plain Node
 * `http`, not Express/Fastify/etc. (docs/backend API-001 §6: "the API layer
 * should not contain complex business rules"; this file contains none —
 * every request becomes exactly one registry.execute() call).
 *
 * Contract: POST /rpc/<operation_name>
 *   Headers: Authorization: Bearer <supabase-access-token>
 *   Body: JSON request input (or {} / omitted)
 *   Response: ApiResponse<T> JSON, always 200 — the success/error distinction
 *   lives in the body's `success` field per the standardized response
 *   contract, not the HTTP status. (A future transport that needs real HTTP
 *   status codes can derive one from toSafeApiError's statusCode; this
 *   minimal adapter intentionally doesn't, to stay thin.)
 *
 * `verifyAccessToken` is supplied by the caller (not implemented here) —
 * this module has no opinion on how a bearer token becomes an authUserId,
 * only that authentication happens before any operation runs.
 */
export type VerifyAccessToken = (accessToken: string) => Promise<{ authUserId: string }>;

export interface CreateHttpServerOptions {
  registry: RpcRegistry;
  client: DatabaseClient;
  verifyAccessToken: VerifyAccessToken;
  /** Optional cap on request body size, in bytes. Defaults to 1 MiB. */
  maxBodyBytes?: number;
}

function readBody(req: IncomingMessage, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new ValidationError('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function respondJson(res: ServerResponse, body: unknown): Promise<void> {
  const payload = JSON.stringify(body);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(payload);
}

export function createHttpServer(options: CreateHttpServerOptions): Server {
  const { registry, client, verifyAccessToken, maxBodyBytes = 1024 * 1024 } = options;

  return createServer((req, res) => {
    void (async () => {
      try {
        if (req.method !== 'POST' || !req.url?.startsWith('/rpc/')) {
          res.statusCode = 404;
          await respondJson(res, buildErrorApiResponse(new Error('Not found')));
          return;
        }

        const operationName = req.url.slice('/rpc/'.length);
        if (!registry.has(operationName)) {
          await respondJson(res, buildErrorApiResponse(new Error(`Unknown operation: ${operationName}`)));
          return;
        }

        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
          await respondJson(res, buildErrorApiResponse(new AuthorizationError('Missing or invalid Authorization header')));
          return;
        }
        const { authUserId } = await verifyAccessToken(authHeader.slice('Bearer '.length));

        const rawBody = await readBody(req, maxBodyBytes);
        let parsedBody: Record<string, unknown> = {};
        if (rawBody.trim().length > 0) {
          try {
            parsedBody = JSON.parse(rawBody) as Record<string, unknown>;
          } catch {
            await respondJson(res, buildErrorApiResponse(new ValidationError('Request body must be valid JSON')));
            return;
          }
        }

        const organizationId = typeof parsedBody.organizationId === 'string' ? parsedBody.organizationId : '';
        if (!organizationId) {
          await respondJson(res, buildErrorApiResponse(new ValidationError('organizationId is required')));
          return;
        }

        const result = await registry.execute(client, operationName, {
          authUserId,
          organizationId,
          input: parsedBody.input
        });
        await respondJson(res, result);
      } catch (error) {
        // Anything that reached here escaped registry.execute()'s own
        // catch-all (e.g. token verification threw, or body reading failed)
        // — still never a raw error, same safe-response contract.
        await respondJson(res, buildErrorApiResponse(error));
      }
    })();
  });
}
