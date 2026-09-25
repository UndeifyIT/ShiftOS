import { useMemo } from 'react';
import { useSession } from '../../auth/SessionProvider.js';
import { useDefaultBranchId } from '../../auth/useDefaultBranchId.js';
import { useRpcQueries, useRpcQuery } from '../../lib/useRpc.js';
import type { Announcement, Branch, Department, Employee, Member } from '../../types/domain.js';
import { buildCards, orderAnnouncements, type AnnouncementCard, type ReceiptRow } from './announcementsModel.js';

/**
 * Everything the Announcements screen reads: the branch's announcements, the
 * people they went to, and — for the acknowledgement bars and the receipts
 * panel — who has acknowledged each one. Receipts are one read per
 * announcement, which is what the RPC offers; each is gated by the permission
 * it checks, so a missing one leaves that part empty instead of failing.
 */
export interface AnnouncementsState {
  loading: boolean;
  branchId: string;
  branchName: string;
  announcements: Announcement[];
  cards: AnnouncementCard[];
  receiptsById: Map<string, ReceiptRow[]>;
  employees: Employee[];
  departments: Department[];
}

export function useAnnouncements(now: Date): AnnouncementsState {
  const { hasPermission } = useSession();
  const branchId = useDefaultBranchId() ?? '';
  const scoped = branchId ? { branchId } : undefined;
  const has = Boolean(branchId);

  const branches = useRpcQuery<Branch[]>('list_branches', undefined, { enabled: hasPermission('branches.read') });
  const announcementsQuery = useRpcQuery<Announcement[]>('list_announcements', scoped, { enabled: has && hasPermission('announcements.read') });
  const employees = useRpcQuery<Employee[]>('list_employees', scoped, { enabled: has && hasPermission('employees.read') });
  const departments = useRpcQuery<Department[]>('list_departments', scoped, { enabled: has && hasPermission('departments.read') });
  const members = useRpcQuery<Member[]>('list_members', undefined, { enabled: hasPermission('org.members.manage') });

  const announcements = useMemo(() => orderAnnouncements((announcementsQuery.data ?? []).filter((row) => !row.deleted_at)), [announcementsQuery.data]);

  const receiptQueries = useRpcQueries<ReceiptRow[]>(
    'list_announcement_receipts',
    announcements.map((announcement) => ({ announcementId: announcement.id })),
    { enabled: hasPermission('employees.read') }
  );

  const receiptsById = useMemo(() => {
    const map = new Map<string, ReceiptRow[]>();
    announcements.forEach((announcement, index) => {
      const data = receiptQueries[index]?.data;
      if (data) map.set(announcement.id, data);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcements, receiptQueries.map((query) => query.data).join('|').length, receiptQueries.filter((query) => query.data).length]);

  const cards = useMemo(
    () => buildCards({ announcements, members: members.data ?? [], employees: employees.data ?? [], receiptsById, now }),
    [announcements, members.data, employees.data, receiptsById, now]
  );

  return {
    loading: announcementsQuery.isLoading,
    branchId,
    branchName: (branches.data ?? []).find((branch) => branch.id === branchId)?.name ?? 'your branch',
    announcements,
    cards,
    receiptsById,
    employees: employees.data ?? [],
    departments: departments.data ?? []
  };
}
