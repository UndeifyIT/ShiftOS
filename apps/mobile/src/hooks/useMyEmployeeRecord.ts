import { useMemo } from 'react';
import { useRpcQuery } from '../lib/useRpc.js';
import { useSession } from '../auth/SessionProvider.js';
import type { Employee } from '../types/domain.js';

/**
 * §C.2 of the frontend foundation doc: an authenticated identity does not
 * necessarily have an employees row (no FK exists between users and
 * employees — DEC-016/DEC-032). This resolves it best-effort by matching
 * email, exactly like apps/web/src/pages/account/ProfilePage.tsx. Absence
 * is expected and must not be treated as an error.
 */
export function useMyEmployeeRecord() {
  const { profile } = useSession();
  const employeesQuery = useRpcQuery<Employee[]>('list_employees');

  const employee = useMemo(() => {
    if (!profile?.email) return null;
    return employeesQuery.data?.find((e) => e.email && e.email.toLowerCase() === profile.email.toLowerCase()) ?? null;
  }, [employeesQuery.data, profile?.email]);

  return { employee, isLoading: employeesQuery.isLoading };
}
