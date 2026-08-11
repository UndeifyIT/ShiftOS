import React from 'react';
import { Badge, DataTable, PageContainer, PageHeader, PermissionDenied } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcQuery } from '../../lib/useRpc.js';
import type { Member } from '../../types/domain.js';

/**
 * WEB-009 — Member & Role Administration. Real, backend-verified data:
 * `list_members` (packages/api/src/operations/membership.ts ->
 * MembershipService.listMembers()) requires `org.members.manage`, the
 * permission already seeded in migration 023, and reads directly from
 * organization_memberships/users/roles via a single joined repository query
 * — no fabricated data.
 *
 * Deliberately read-only: there is still no backend capability to invite a
 * new member (that requires the Supabase Auth admin API / service-role key —
 * see InvitationsPage) or to change a member's role/remove a member (no
 * update_member_role / remove_member RPC operation exists yet). Those remain
 * documented gaps, not silently faked here.
 */
export default function MembersPage(): React.ReactElement {
  const { hasPermission } = useSession();
  const canManage = hasPermission('org.members.manage');

  const { data: members, isLoading, error, refetch } = useRpcQuery<Member[]>('list_members', undefined, { enabled: canManage });

  if (!canManage) {
    return (
      <PageContainer>
        <PermissionDenied />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="Members & Roles" description="Everyone with access to your organization and the role they hold." />
      <DataTable<Member>
        columns={[
          { key: 'name', header: 'Name', primary: true, render: (m) => `${m.user_first_name} ${m.user_last_name}` },
          { key: 'email', header: 'Email', render: (m) => m.user_email },
          { key: 'role', header: 'Role', render: (m) => <Badge tone="neutral">{m.role_name}</Badge> },
          { key: 'status', header: 'Status', render: (m) => <Badge tone={m.is_active ? 'success' : 'neutral'}>{m.is_active ? 'Active' : 'Inactive'}</Badge> },
          { key: 'joined', header: 'Joined', render: (m) => new Date(m.joined_at).toLocaleDateString() }
        ]}
        rows={members ?? []}
        rowKey={(m) => m.id}
        loading={isLoading}
        error={error ? (error as Error).message : undefined}
        onRetry={() => void refetch()}
        emptyTitle="No members found"
        emptyDescription="This organization has no active memberships yet."
      />
      <p className="mt-6 text-sm text-neutral-500">
        Inviting new members, changing roles, and removing members aren&apos;t available from ShiftOS yet — see{' '}
        <span className="font-medium text-neutral-700">Invitations</span> for the same documented gap.
      </p>
    </PageContainer>
  );
}
