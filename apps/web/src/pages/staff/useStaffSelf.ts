import { useMemo } from 'react';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcQueries, useRpcQuery } from '../../lib/useRpc.js';
import type { Announcement, Employee, LeaveRequest, ShiftSwap } from '../../types/domain.js';

/*
 * What a Staff member reads about themselves. ShiftOS links a login to its
 * employee record by email (the services' resolveMyEmployee), so the web does
 * the same: the one employee on the branch whose email is the account's.
 */

/** The signed-in person's own employee record (null when their login isn't linked to one yet), and the branch's people it was found among. */
export function useMyEmployee(): { employee: Employee | null; employees: Employee[]; loading: boolean } {
  const { profile, hasPermission } = useSession();
  const { data, isLoading } = useRpcQuery<Employee[]>('list_employees', undefined, { enabled: hasPermission('employees.read') });
  const email = profile?.email?.toLowerCase() ?? '';
  const employees = useMemo(() => data ?? [], [data]);
  const employee = useMemo(() => employees.find((e) => !e.deleted_at && Boolean(e.email) && e.email!.toLowerCase() === email) ?? null, [employees, email]);
  return { employee, employees, loading: isLoading };
}

/** A swap still in play: waiting on the other person, or accepted and waiting on the supervisor. */
export const isOpenSwap = (swap: ShiftSwap): boolean => swap.status === 'pending' || swap.status === 'accepted';

/** My own swaps and leave (list_my_shift_swaps / list_my_leave). */
export function useMyRequests(enabled = true): { swaps: ShiftSwap[]; leave: LeaveRequest[]; loading: boolean } {
  const { hasPermission } = useSession();
  const swaps = useRpcQuery<ShiftSwap[]>('list_my_shift_swaps', undefined, { enabled: enabled && hasPermission('swaps.read') });
  const leave = useRpcQuery<LeaveRequest[]>('list_my_leave', undefined, { enabled: enabled && hasPermission('leave.read') });
  return { swaps: swaps.data ?? [], leave: leave.data ?? [], loading: swaps.isLoading || leave.isLoading };
}

/** Published notices and whether I've acknowledged each (has_acknowledged_announcement). */
export function useMyAnnouncements(enabled = true): { published: Announcement[]; acknowledged: Map<string, boolean>; loading: boolean } {
  const { hasPermission } = useSession();
  const query = useRpcQuery<Announcement[]>('list_announcements', undefined, { enabled: enabled && hasPermission('announcements.read') });
  const published = useMemo(() => (query.data ?? []).filter((a) => a.is_published && !a.deleted_at), [query.data]);
  const mine = useRpcQueries<{ acknowledged: boolean }>(
    'has_acknowledged_announcement',
    published.map((a) => ({ announcementId: a.id })),
    { enabled: enabled && hasPermission('announcements.acknowledge') }
  );
  const acknowledged = new Map(published.map((a, index) => [a.id, Boolean(mine[index]?.data?.acknowledged)]));
  return { published, acknowledged, loading: query.isLoading };
}
