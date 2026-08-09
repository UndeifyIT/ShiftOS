import { supabase } from './supabase.js';
import { ApiClientError, type ApiErrorCode } from './errors.js';

interface ApiErrorBody {
  message: string;
  code: string;
  details?: string[];
}

interface ApiResponseBody<T> {
  success: boolean;
  data: T | null;
  error?: ApiErrorBody;
}

const KNOWN_CODES: ApiErrorCode[] = [
  'VALIDATION_ERROR',
  'AUTHORIZATION_ERROR',
  'NOT_FOUND',
  'DATABASE_ERROR',
  'CONFIGURATION_ERROR',
  'HTTP_ERROR',
  'SHIFTOS_ERROR'
];

function toApiErrorCode(code: string | undefined): ApiErrorCode {
  return (KNOWN_CODES as string[]).includes(code ?? '') ? (code as ApiErrorCode) : 'SHIFTOS_ERROR';
}

/**
 * The single transport for every Tier-1 domain operation
 * (organizations/branches/employees/scheduling/context) — POSTs to
 * packages/backend's /rpc/<operation> endpoint (packages/api/src/httpServer.ts's
 * documented contract), never touches Postgres or Supabase tables directly
 * for this data (instruction #12: UI -> API client -> RPC -> services ->
 * repositories -> database).
 */
export async function callRpc<TOutput>(operation: string, organizationId: string, input?: unknown): Promise<TOutput> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new ApiClientError('Your session has expired. Please sign in again.', 'AUTHORIZATION_ERROR');
  }

  let response: Response;
  try {
    response = await fetch(`/rpc/${operation}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({ organizationId, input: input ?? {} })
    });
  } catch {
    throw new ApiClientError('Unable to connect. Check your internet connection and try again.', 'NETWORK_ERROR');
  }

  let body: ApiResponseBody<TOutput>;
  try {
    body = (await response.json()) as ApiResponseBody<TOutput>;
  } catch {
    throw new ApiClientError('We could not complete this action. Please try again.', 'HTTP_ERROR');
  }

  if (!body.success || body.data === null) {
    throw new ApiClientError(body.error?.message ?? 'Request failed', toApiErrorCode(body.error?.code), body.error?.details);
  }

  return body.data;
}
