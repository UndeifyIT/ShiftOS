import { useMutation, useQuery, useQueryClient, type UseMutationOptions, type UseQueryOptions } from '@tanstack/react-query';
import { callRpc } from './apiClient.js';
import { useSession } from '../auth/SessionProvider.js';

/**
 * Thin React Query wrapper around callRpc(), scoped to the currently active
 * organization (UI-004 §5 "server state": fetching, caching, invalidation).
 * `enabled` automatically requires a resolved organizationId so screens
 * never fire a request before the session context is ready.
 */
export function useRpcQuery<TOutput>(
  operation: string,
  input?: unknown,
  options?: Omit<UseQueryOptions<TOutput>, 'queryKey' | 'queryFn'>
) {
  const { myContext } = useSession();
  const organizationId = myContext?.organizationId;

  return useQuery<TOutput>({
    queryKey: [operation, organizationId, input],
    queryFn: () => callRpc<TOutput>(operation, organizationId as string, input),
    enabled: Boolean(organizationId) && (options?.enabled ?? true),
    ...options
  });
}

export function useRpcMutation<TOutput, TInput = unknown>(
  operation: string,
  options?: Omit<UseMutationOptions<TOutput, Error, TInput>, 'mutationFn'> & { invalidates?: string[] }
) {
  const { myContext } = useSession();
  const organizationId = myContext?.organizationId;
  const queryClient = useQueryClient();

  return useMutation<TOutput, Error, TInput>({
    mutationFn: (input: TInput) => callRpc<TOutput>(operation, organizationId as string, input),
    ...options,
    onSuccess: (...args) => {
      options?.invalidates?.forEach((key) => void queryClient.invalidateQueries({ queryKey: [key] }));
      options?.onSuccess?.(...args);
    }
  });
}
