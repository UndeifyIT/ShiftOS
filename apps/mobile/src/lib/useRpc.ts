import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { callRpc } from './apiClient.js';
import { useSession } from '../auth/SessionProvider.js';

export function useRpcQuery<TOutput>(operation: string, input?: unknown, options?: Omit<UseQueryOptions<TOutput>, 'queryKey' | 'queryFn'>) {
  const { myContext } = useSession();
  const organizationId = myContext?.organizationId;

  return useQuery<TOutput>({
    queryKey: [operation, organizationId, input],
    queryFn: () => callRpc<TOutput>(operation, organizationId as string, input),
    enabled: Boolean(organizationId) && (options?.enabled ?? true),
    ...options
  });
}
