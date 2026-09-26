import { useMemo } from 'react';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcQuery } from '../../lib/useRpc.js';
import type { Branch, Employee, Member, Organization } from '../../types/domain.js';
import { summarizeBranches, orgStats, type BranchSummary, type OrgStats } from './adminModel.js';

export interface AdminOrg {
  loading: boolean;
  organization: Organization | undefined;
  orgName: string;
  branches: BranchSummary[];
  stats: OrgStats;
  employees: Employee[];
  members: Member[];
}

/**
 * Everything the Admin console reads about the organization: every branch the
 * Admin can see (074 grants them all, and new ones as they open), the people on
 * them and the members who lead them. Each read is gated by the permission its
 * RPC checks.
 */
export function useAdminOrg(): AdminOrg {
  const { hasPermission, activeOrganization } = useSession();
  const branchesQuery = useRpcQuery<Branch[]>('list_branches', undefined, { enabled: hasPermission('branches.read') });
  const employeesQuery = useRpcQuery<Employee[]>('list_employees', undefined, { enabled: hasPermission('employees.read') });
  const membersQuery = useRpcQuery<Member[]>('list_members', undefined, { enabled: hasPermission('org.members.manage') });
  const orgQuery = useRpcQuery<Organization>('get_organization', undefined, { enabled: hasPermission('organizations.read') });

  const employees = employeesQuery.data ?? [];
  const members = membersQuery.data ?? [];
  const branches = useMemo(() => summarizeBranches(branchesQuery.data ?? [], employees, members), [branchesQuery.data, employees, members]);

  return {
    loading: branchesQuery.isLoading || employeesQuery.isLoading || membersQuery.isLoading,
    organization: orgQuery.data,
    orgName: orgQuery.data?.name ?? activeOrganization?.name ?? 'Your organization',
    branches,
    stats: orgStats(branches),
    employees,
    members
  };
}
