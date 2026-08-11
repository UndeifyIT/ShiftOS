import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Badge, Button, DataTable, Input, PageContainer, PageHeader, PermissionDenied } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcQuery } from '../../lib/useRpc.js';
import { useSignedAvatarUrl } from '../../lib/avatars.js';
import type { Branch, Employee, EmploymentStatus } from '../../types/domain.js';

function EmployeeNameCell({ employee }: { employee: Employee }): React.ReactElement {
  const name = `${employee.first_name} ${employee.last_name}`;
  const signedUrl = useSignedAvatarUrl(employee.avatar_url);
  return (
    <div className="flex items-center gap-3">
      <Avatar name={name} src={signedUrl} size={32} />
      <div>
        <p className="font-medium text-neutral-900">{name}</p>
        <p className="text-xs text-neutral-500">{employee.employee_number}</p>
      </div>
    </div>
  );
}

const STATUS_TONE: Record<EmploymentStatus, 'success' | 'neutral' | 'error' | 'warning'> = {
  active: 'success',
  inactive: 'neutral',
  terminated: 'error',
  on_leave: 'warning'
};

const STATUS_LABEL: Record<EmploymentStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  terminated: 'Terminated',
  on_leave: 'On Leave'
};

/** WEB-005 — Employee Directory. */
export default function EmployeeDirectoryPage(): React.ReactElement {
  const { hasPermission } = useSession();
  const navigate = useNavigate();
  const canRead = hasPermission('employees.read');
  const canCreate = hasPermission('employees.create');
  const [search, setSearch] = useState('');

  const { data: employees, isLoading, error, refetch } = useRpcQuery<Employee[]>('list_employees', undefined, { enabled: canRead });
  const { data: branches } = useRpcQuery<Branch[]>('list_branches', undefined, { enabled: canRead });
  const branchNameById = useMemo(() => new Map((branches ?? []).map((b) => [b.id, b.name])), [branches]);

  const filtered = useMemo(() => {
    if (!employees) return [];
    const query = search.trim().toLowerCase();
    if (!query) return employees;
    return employees.filter((e) =>
      `${e.first_name} ${e.last_name} ${e.employee_number}`.toLowerCase().includes(query)
    );
  }, [employees, search]);

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
        title="Employees"
        description="Everyone on your team, across the branches you can access."
        actions={canCreate ? <Button onClick={() => navigate('/employees/new')}>Add Employee</Button> : undefined}
      />
      <div className="mb-4 max-w-xs">
        <Input placeholder="Search by name or employee #" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search employees" />
      </div>
      <DataTable<Employee>
        columns={[
          { key: 'name', header: 'Name', primary: true, render: (e) => <EmployeeNameCell employee={e} /> },
          { key: 'branch', header: 'Branch', render: (e) => branchNameById.get(e.branch_id) ?? '—' },
          { key: 'status', header: 'Status', render: (e) => <Badge tone={STATUS_TONE[e.employment_status]}>{STATUS_LABEL[e.employment_status]}</Badge> }
        ]}
        rows={filtered}
        rowKey={(e) => e.id}
        loading={isLoading}
        error={error ? (error as Error).message : undefined}
        onRetry={() => void refetch()}
        onRowClick={(e) => navigate(`/employees/${e.id}`)}
        emptyTitle={search ? `No employees match "${search}"` : 'Your team has not been added yet'}
        emptyDescription={search ? 'Try another search term.' : 'Add your first employee to start managing shifts.'}
        emptyAction={!search && canCreate ? { label: 'Add Employee', onClick: () => navigate('/employees/new') } : undefined}
      />
    </PageContainer>
  );
}
