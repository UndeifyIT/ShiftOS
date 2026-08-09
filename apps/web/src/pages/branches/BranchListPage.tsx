import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, DataTable, PageContainer, PageHeader, PermissionDenied } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcQuery } from '../../lib/useRpc.js';
import type { Branch } from '../../types/domain.js';

/** WEB-003 — Branch List. */
export default function BranchListPage(): React.ReactElement {
  const { hasPermission } = useSession();
  const navigate = useNavigate();
  const canRead = hasPermission('branches.read');
  const canCreate = hasPermission('branches.create');

  const { data, isLoading, error, refetch } = useRpcQuery<Branch[]>('list_branches', undefined, { enabled: canRead });

  if (!canRead) {
    return (
      <PageContainer>
        <PermissionDenied />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Branches"
        description="All locations in your organization."
        actions={canCreate ? <Button onClick={() => navigate('/branches/new')}>Add Branch</Button> : undefined}
      />
      <DataTable<Branch>
        columns={[
          { key: 'name', header: 'Name', primary: true, render: (b) => b.name },
          { key: 'address', header: 'Address', render: (b) => b.address ?? '—' },
          {
            key: 'status',
            header: 'Status',
            render: (b) => <Badge tone={b.is_active ? 'success' : 'neutral'}>{b.is_active ? 'Active' : 'Archived'}</Badge>
          }
        ]}
        rows={data ?? []}
        rowKey={(b) => b.id}
        loading={isLoading}
        error={error ? (error as Error).message : undefined}
        onRetry={() => void refetch()}
        onRowClick={(b) => navigate(`/branches/${b.id}`)}
        emptyTitle="No branches yet"
        emptyDescription="Add your first branch to start organizing employees and schedules."
        emptyAction={canCreate ? { label: 'Add Branch', onClick: () => navigate('/branches/new') } : undefined}
      />
    </PageContainer>
  );
}
