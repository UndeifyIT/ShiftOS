import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmationDialog,
  DataTable,
  ErrorState,
  PageContainer,
  PageHeader,
  PermissionDenied,
  SkeletonRows,
  Tabs
} from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcMutation, useRpcQuery } from '../../lib/useRpc.js';
import { useSignedAvatarUrl } from '../../lib/avatars.js';
import type { Branch, Employee, EmployeeHistoryEntry, EmploymentStatus } from '../../types/domain.js';

const STATUS_TONE: Record<EmploymentStatus, 'success' | 'neutral' | 'error' | 'warning'> = {
  active: 'success',
  inactive: 'neutral',
  terminated: 'error',
  on_leave: 'warning'
};

/** WEB-006 — Employee Profile Detail, with WEB-008's archive confirmation folded in as a page action. */
export default function EmployeeDetailPage(): React.ReactElement {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useSession();
  const canRead = hasPermission('employees.read');
  const canUpdate = hasPermission('employees.update');
  const canArchive = hasPermission('employees.archive');
  const [tab, setTab] = useState<'profile' | 'history'>('profile');
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);

  const { data: employee, isLoading, error, refetch } = useRpcQuery<Employee>('get_employee', { employeeId }, { enabled: canRead });
  const { data: branches } = useRpcQuery<Branch[]>('list_branches', undefined, { enabled: canRead });
  const { data: history, isLoading: historyLoading } = useRpcQuery<EmployeeHistoryEntry[]>(
    'get_employee_history',
    { employeeId },
    { enabled: canRead && tab === 'history' }
  );

  const archiveMutation = useRpcMutation<Employee, { employeeId: string }>('archive_employee', {
    invalidates: ['list_employees', 'get_employee'],
    onSuccess: () => setConfirmArchiveOpen(false)
  });

  if (!canRead) {
    return (
      <PageContainer>
        <PermissionDenied />
      </PageContainer>
    );
  }
  if (isLoading) {
    return (
      <PageContainer>
        <SkeletonRows rows={5} />
      </PageContainer>
    );
  }
  if (error || !employee) {
    return (
      <PageContainer>
        <ErrorState description={(error as Error | undefined)?.message} onRetry={() => void refetch()} />
      </PageContainer>
    );
  }

  const branchName = branches?.find((b) => b.id === employee.branch_id)?.name ?? '—';

  return (
    <PageContainer>
      <div className="mb-2 flex items-center gap-4">
        <EmployeeAvatar employee={employee} />
      </div>
      <PageHeader
        title={`${employee.first_name} ${employee.last_name}`}
        description={`Employee #${employee.employee_number} · ${branchName}`}
        actions={
          <>
            <Badge tone={STATUS_TONE[employee.employment_status]}>{employee.employment_status.replace('_', ' ')}</Badge>
            {canUpdate ? (
              <Button variant="secondary" onClick={() => navigate(`/employees/${employeeId}/edit`)}>
                Edit
              </Button>
            ) : null}
            {canArchive && employee.is_active ? (
              <Button variant="destructive" onClick={() => setConfirmArchiveOpen(true)}>
                Archive
              </Button>
            ) : null}
          </>
        }
      />

      <Tabs
        items={[
          { key: 'profile', label: 'Profile' },
          { key: 'history', label: 'Employment History' }
        ]}
        activeKey={tab}
        onChange={(key) => setTab(key as 'profile' | 'history')}
        className="mb-5"
      />

      {tab === 'profile' ? (
        <Card className="max-w-2xl">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Email" value={employee.email ?? '—'} />
            <Field label="Phone" value={employee.phone ?? '—'} />
            <Field label="Hire date" value={new Date(employee.hire_date).toLocaleDateString()} />
            <Field label="Date of birth" value={employee.date_of_birth ? new Date(employee.date_of_birth).toLocaleDateString() : '—'} />
            <div className="sm:col-span-2">
              <Field label="Notes" value={employee.notes ?? '—'} />
            </div>
          </dl>
        </Card>
      ) : (
        <DataTable<EmployeeHistoryEntry>
          columns={[
            { key: 'field', header: 'Field', primary: true, render: (h) => h.field_changed ?? '—' },
            { key: 'previous', header: 'Previous value', render: (h) => String(h.previous_value ?? '—') },
            { key: 'new', header: 'New value', render: (h) => String(h.new_value ?? '—') },
            { key: 'changed_at', header: 'Changed at', render: (h) => new Date(h.changed_at).toLocaleString() }
          ]}
          rows={history ?? []}
          rowKey={(h) => h.id}
          loading={historyLoading}
          emptyTitle="No changes recorded yet"
          emptyDescription="Employment history appears here as this record is updated."
        />
      )}

      <ConfirmationDialog
        open={confirmArchiveOpen}
        onClose={() => setConfirmArchiveOpen(false)}
        onConfirm={() => employeeId && archiveMutation.mutate({ employeeId })}
        title={`Archive ${employee.first_name} ${employee.last_name}?`}
        description="Their record and history are preserved, but they will no longer appear in active lists or be assignable to shifts."
        confirmLabel="Archive"
        destructive
        loading={archiveMutation.isPending}
      />
    </PageContainer>
  );
}

function EmployeeAvatar({ employee }: { employee: Employee }): React.ReactElement {
  const signedUrl = useSignedAvatarUrl(employee.avatar_url);
  return <Avatar name={`${employee.first_name} ${employee.last_name}`} src={signedUrl} size={56} />;
}

function Field({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</dt>
      <dd className="mt-1 text-sm text-neutral-900">{value}</dd>
    </div>
  );
}
