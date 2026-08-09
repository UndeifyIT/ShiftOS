import { supabase } from './supabase.js';
import { appConfig } from './config.js';

interface ApiResponseBody<T> {
  success: boolean;
  data: T | null;
  error?: { message: string; code: string };
}

export class ApiClientError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/**
 * Mobile counterpart of apps/web/src/lib/apiClient.ts. Unlike the web app
 * (which relies on Vite's dev proxy for a same-origin path), there is no
 * dev-server proxy on a device/simulator, so this calls the backend's
 * absolute URL directly (appConfig.apiUrl) — CORS is not a concern for
 * native fetch, only for the browser.
 */
export async function callRpc<TOutput>(operation: string, organizationId: string, input?: unknown): Promise<TOutput> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new ApiClientError('Your session has expired. Please sign in again.', 'AUTHORIZATION_ERROR');
  }

  let response: Response;
  try {
    response = await fetch(`${appConfig.apiUrl ?? ''}/rpc/${operation}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ organizationId, input: input ?? {} })
    });
  } catch {
    throw new ApiClientError('Unable to connect. Check your internet connection and try again.', 'NETWORK_ERROR');
  }

  const body = (await response.json()) as ApiResponseBody<TOutput>;
  if (!body.success || body.data === null) {
    throw new ApiClientError(body.error?.message ?? 'Request failed', body.error?.code ?? 'SHIFTOS_ERROR');
  }
  return body.data;
}
