import type { DatabaseClient } from '@shiftos/database';
import type { ApiResponse } from '@shiftos/types';
import type { AuthenticationProvider } from '@shiftos/auth';
import { buildApiResponse, buildErrorApiResponse } from '@shiftos/utils';
import { NotFoundError } from '@shiftos/errors';
import { createApplicationContext, type ApplicationContext } from '@shiftos/services';

/**
 * The API boundary: HTTP request -> authentication -> request validation ->
 * application context -> domain service -> safe response (docs/backend
 * API-001 §6/§7, API-002 RPC Standards). Operations are named verb_object
 * per API-002 §6 (publish_schedule, not update_schedule_table).
 *
 * This is transport-agnostic on purpose — RpcRegistry.execute() takes
 * already-authenticated identity + organization + input, not an HTTP
 * request. httpServer.ts is one thin adapter on top of it; a future
 * mobile/CLI/test caller can call execute() directly without going through
 * HTTP at all.
 */
export interface RpcRequest {
  /** The Supabase Auth identity making the call. The transport adapter is responsible for verifying the access token this came from — RpcRegistry trusts it was already authenticated, not that the organizationId below was. */
  authUserId: string;
  /** May be arbitrary client input; createApplicationContext verifies the caller actually belongs to it before anything else runs. */
  organizationId: string;
  input: unknown;
}

export type RpcHandler<TInput, TOutput> = (context: ApplicationContext, input: TInput) => Promise<TOutput>;

export interface RpcOperation<TInput = unknown, TOutput = unknown> {
  name: string;
  handler: RpcHandler<TInput, TOutput>;
}

export function defineRpc<TInput, TOutput>(name: string, handler: RpcHandler<TInput, TOutput>): RpcOperation<TInput, TOutput> {
  return { name, handler };
}

export class RpcRegistry {
  // Storage is intentionally erased to `unknown` generics: a registry holding
  // operations with heterogeneous input/output types can't stay strongly
  // typed at the storage layer. The single assertion in register() is the
  // one documented, narrow type-erasure boundary this requires; every
  // operation keeps its real types at its defineRpc() call site.
  private readonly operations = new Map<string, RpcOperation<unknown, unknown>>();

  /**
   * The single type-erasure boundary in this file: `input as TInput` below is
   * safe by construction, not a suppressed error — execute() only ever
   * invokes a handler through the wrapper it was registered with here, so
   * the value flowing in was always produced for this exact operation.
   */
  register<TInput, TOutput>(operation: RpcOperation<TInput, TOutput>): void {
    if (this.operations.has(operation.name)) {
      throw new Error(`RPC operation "${operation.name}" is already registered`);
    }
    const erased: RpcOperation<unknown, unknown> = {
      name: operation.name,
      handler: async (context, input) => operation.handler(context, input as TInput)
    };
    this.operations.set(operation.name, erased);
  }

  has(operationName: string): boolean {
    return this.operations.has(operationName);
  }

  /**
   * Runs one operation end to end: resolve authorization context (which
   * verifies organization membership), execute the handler, return a safe
   * ApiResponse. Never throws — every failure mode (unknown operation,
   * validation, authorization, not-found, unexpected) becomes
   * buildErrorApiResponse(error), so a transport adapter never has to
   * catch anything itself.
   */
  async execute(
    client: DatabaseClient,
    operationName: string,
    request: RpcRequest,
    authProvider?: AuthenticationProvider
  ): Promise<ApiResponse<unknown>> {
    const operation = this.operations.get(operationName);
    if (!operation) {
      return buildErrorApiResponse(new NotFoundError(`Unknown operation: ${operationName}`));
    }

    try {
      const context = await createApplicationContext(client, request.authUserId, request.organizationId, authProvider);
      const result = await operation.handler(context, request.input);
      return buildApiResponse(result);
    } catch (error) {
      return buildErrorApiResponse(error);
    }
  }
}
