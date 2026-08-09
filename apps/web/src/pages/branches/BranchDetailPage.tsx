import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  ConfirmationDialog,
  ErrorState,
  FormField,
  InlineError,
  Input,
  PageContainer,
  PageHeader,
  PermissionDenied,
  SkeletonRows
} from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcMutation, useRpcQuery } from '../../lib/useRpc.js';
import type { Branch } from '../../types/domain.js';

/** WEB-004 — Branch Detail / Create / Edit (+ WEB-008-equivalent archive confirmation for branches). */
export default function BranchDetailPage(): React.ReactElement {
  const { branchId } = useParams<{ branchId: string }>();
  const isCreate = !branchId;
  const navigate = useNavigate();
  const { hasPermission } = useSession();
  const canRead = hasPermission('branches.read');
  const canCreate = hasPermission('branches.create');
  const canUpdate = hasPermission('branches.update');
  const canArchive = hasPermission('branches.archive');

  const { data: branch, isLoading, error, refetch } = useRpcQuery<Branch>(
    'get_branch',
    branchId ? { branchId } : undefined,
    { enabled: !isCreate && canRead }
  );

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);

  useEffect(() => {
    if (branch) {
      setName(branch.name);
      setAddress(branch.address ?? '');
    }
  }, [branch]);

  const createMutation = useRpcMutation<Branch, { name: string; address?: string | null }>('create_branch', {
    invalidates: ['list_branches'],
    onSuccess: (created) => navigate(`/branches/${created.id}`, { replace: true }),
    onError: (err) => setFormError(err.message)
  });

  const updateMutation = useRpcMutation<Branch, { branchId: string; name?: string; address?: string | null }>('update_branch', {
    invalidates: ['list_branches', 'get_branch'],
    onError: (err) => setFormError(err.message)
  });

  const archiveMutation = useRpcMutation<Branch, { branchId: string }>('archive_branch', {
    invalidates: ['list_branches', 'get_branch'],
    onSuccess: () => {
      setConfirmArchiveOpen(false);
      navigate('/branches');
    }
  });

  if (isCreate && !canCreate) {
    return (
      <PageContainer>
        <PermissionDenied />
      </PageContainer>
    );
  }
  if (!isCreate && !canRead) {
    return (
      <PageContainer>
        <PermissionDenied />
      </PageContainer>
    );
  }

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    if (!name.trim()) {
      setFormError('Branch name is required.');
      return;
    }
    setFormError(null);
    if (isCreate) {
      createMutation.mutate({ name: name.trim(), address: address.trim() || null });
    } else {
      updateMutation.mutate({ branchId: branchId!, name: name.trim(), address: address.trim() || null });
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title={isCreate ? 'Add Branch' : branch?.name ?? 'Branch'}
        actions={
          !isCreate && branch ? <Badge tone={branch.is_active ? 'success' : 'neutral'}>{branch.is_active ? 'Active' : 'Archived'}</Badge> : undefined
        }
      />
      {!isCreate && isLoading ? (
        <SkeletonRows rows={4} />
      ) : !isCreate && error ? (
        <ErrorState description={(error as Error).message} onRetry={() => void refetch()} />
      ) : (
        <Card className="max-w-xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FormField label="Branch name" htmlFor="branchName" required>
              {(fieldProps) => <Input {...fieldProps} value={name} onChange={(e) => setName(e.target.value)} disabled={!isCreate && !canUpdate} />}
            </FormField>
            <FormField label="Address" htmlFor="branchAddress">
              {(fieldProps) => <Input {...fieldProps} value={address} onChange={(e) => setAddress(e.target.value)} disabled={!isCreate && !canUpdate} />}
            </FormField>
            {formError ? <InlineError message={formError} /> : null}
            <div className="flex items-center gap-3">
              {isCreate || canUpdate ? (
                <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
                  {isCreate ? 'Create branch' : 'Save changes'}
                </Button>
              ) : null}
              {!isCreate && canArchive && branch?.is_active ? (
                <Button type="button" variant="destructive" onClick={() => setConfirmArchiveOpen(true)}>
                  Archive branch
                </Button>
              ) : null}
            </div>
          </form>
        </Card>
      )}

      <ConfirmationDialog
        open={confirmArchiveOpen}
        onClose={() => setConfirmArchiveOpen(false)}
        onConfirm={() => branchId && archiveMutation.mutate({ branchId })}
        title="Archive this branch?"
        description="Archived branches are hidden from active lists but their history is preserved. This cannot be undone from here."
        confirmLabel="Archive"
        destructive
        loading={archiveMutation.isPending}
      />
    </PageContainer>
  );
}
