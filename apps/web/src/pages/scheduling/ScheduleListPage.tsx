import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, DataTable, PageContainer, PageHeader, PermissionDenied, Select } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcQuery } from '../../lib/useRpc.js';
import type { Branch, Schedule, ScheduleStatus } from '../../types/domain.js';

const STATUS_TONE: Record<ScheduleStatus, 'neutral' | 'success' | 'warning'> = {
  draft: 'warning',
  published: 'success',
  archived: 'neutral'
};

/** WEB-011 — Schedule List. */
export default function ScheduleListPage(): React.ReactElement {
  const { hasPermission } = useSession();
  const navigate = useNavigate();
  const canRead = hasPermission('schedules.read');
  const canCreate = hasPermission('schedules.create');

  const { data: branches } = useRpcQuery<Branch[]>('list_branches', undefined, { enabled: canRead });
  const [branchId, setBranchId] = useState<string>('');

  const activeBranchId = branchId || branches?.[0]?.id;
  const { data: schedules, isLoading, error, refetch } = useRpcQuery<Schedule[]>(
    'list_schedules',
    activeBranchId ? { branchId: activeBranchId } : undefined,
    { enabled: canRead && Boolean(activeBranchId) }
  );

  const branchOptions = useMemo(() => (branches ?? []).map((b) => ({ value: b.id, label: b.name })), [branches]);

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
        title="Scheduling"
        description="Browse schedules by branch and period."
        actions={canCreate ? <Button onClick={() => navigate('/schedules/new')}>Create Schedule</Button> : undefined}
      />
      {branchOptions.length > 1 ? (
        <div className="mb-4 max-w-xs">
          <Select
            aria-label="Branch"
            value={activeBranchId ?? ''}
            onChange={(e) => setBranchId(e.target.value)}
            options={branchOptions}
          />
        </div>
      ) : null}
      <DataTable<Schedule>
        columns={[
          { key: 'name', header: 'Name', primary: true, render: (s) => s.name },
          { key: 'range', header: 'Period', render: (s) => `${s.start_date} – ${s.end_date}` },
          { key: 'status', header: 'Status', render: (s) => <Badge tone={STATUS_TONE[s.status]}>{s.status}</Badge> }
        ]}
        rows={schedules ?? []}
        rowKey={(s) => s.id}
        loading={isLoading}
        error={error ? (error as Error).message : undefined}
        onRetry={() => void refetch()}
        onRowClick={(s) => navigate(`/schedules/${s.id}`)}
        emptyTitle="No schedules created for this period"
        emptyDescription="Create a schedule to start building shifts for this branch."
        emptyAction={canCreate ? { label: 'Create Schedule', onClick: () => navigate('/schedules/new') } : undefined}
      />
    </PageContainer>
  );
}
