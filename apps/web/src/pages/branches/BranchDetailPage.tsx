import React, { useEffect, useMemo, useState } from 'react';
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
  Select,
  SkeletonRows
} from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcMutation, useRpcQuery } from '../../lib/useRpc.js';
import type { Branch } from '../../types/domain.js';

/** Same preset list the onboarding wizard's Branch step uses (settings.storeType) — kept in sync manually since it's just a small constant, not worth sharing a module for two call sites. */
const STORE_TYPES = ['Supermarket', 'Convenience Store', 'Restaurant', 'Warehouse', 'Kitchen / Production', 'Office', 'Other'];

/** Same IANA-timezone source the onboarding wizard's Branch step uses (settings.timeZone) — see that file's own comment for the fallback rationale. */
function getTimeZoneOptions(): string[] {
  try {
    const supportedValuesOf = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
    if (typeof supportedValuesOf === 'function') {
      return supportedValuesOf('timeZone');
    }
  } catch {
    // fall through to the static fallback below
  }
  return [
    'Africa/Lagos',
    'Africa/Accra',
    'Africa/Nairobi',
    'Africa/Johannesburg',
    'Europe/London',
    'America/New_York',
    'America/Los_Angeles',
    'Asia/Dubai',
    'UTC'
  ];
}

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
  const [storeType, setStoreType] = useState('');
  const [country, setCountry] = useState('');
  const [branchState, setBranchState] = useState('');
  const [city, setCity] = useState('');
  const [timeZone, setTimeZone] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
  const timeZoneOptions = useMemo(() => getTimeZoneOptions(), []);

  useEffect(() => {
    if (branch) {
      setName(branch.name);
      setAddress(branch.address ?? '');
      const settings = branch.settings;
      setStoreType(typeof settings.storeType === 'string' ? settings.storeType : '');
      setCountry(typeof settings.country === 'string' ? settings.country : '');
      setBranchState(typeof settings.state === 'string' ? settings.state : '');
      setCity(typeof settings.city === 'string' ? settings.city : '');
      setTimeZone(typeof settings.timeZone === 'string' ? settings.timeZone : '');
    }
  }, [branch]);

  type BranchMutationInput = { name?: string; address?: string | null; settings?: Record<string, unknown> };
  const createMutation = useRpcMutation<Branch, BranchMutationInput>('create_branch', {
    invalidates: ['list_branches'],
    onSuccess: (created) => navigate(`/branches/${created.id}`, { replace: true }),
    onError: (err) => setFormError(err.message)
  });

  const updateMutation = useRpcMutation<Branch, BranchMutationInput & { branchId: string }>('update_branch', {
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
    // Required on create (matching the onboarding wizard's own Branch step,
    // which every organization's first branch goes through) — optional on
    // edit, so an existing branch that predates these fields stays editable
    // (e.g. fixing a typo in the name) without being blocked into backfilling
    // location/time zone data it may never have collected.
    if (isCreate && (!storeType || !country.trim() || !branchState.trim() || !city.trim() || !timeZone)) {
      setFormError('Store type, country, state, city and time zone are required.');
      return;
    }
    setFormError(null);
    // Spread the branch's existing settings first so any key this form
    // doesn't manage survives the update — `patch()` replaces the whole
    // settings column, it doesn't merge.
    const settings = {
      ...(branch?.settings ?? {}),
      ...(storeType ? { storeType } : {}),
      ...(country.trim() ? { country: country.trim() } : {}),
      ...(branchState.trim() ? { state: branchState.trim() } : {}),
      ...(city.trim() ? { city: city.trim() } : {}),
      ...(timeZone ? { timeZone } : {})
    };
    if (isCreate) {
      createMutation.mutate({ name: name.trim(), address: address.trim() || null, settings });
    } else {
      updateMutation.mutate({ branchId: branchId!, name: name.trim(), address: address.trim() || null, settings });
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
            <FormField label="Address" htmlFor="branchAddress" hint="Used on attendance records and shift notes.">
              {(fieldProps) => <Input {...fieldProps} value={address} onChange={(e) => setAddress(e.target.value)} disabled={!isCreate && !canUpdate} />}
            </FormField>
            <FormField label="Store type" htmlFor="branchStoreType" required={isCreate}>
              {(fieldProps) => (
                <Select
                  {...fieldProps}
                  value={storeType}
                  onChange={(e) => setStoreType(e.target.value)}
                  placeholder="Select store type"
                  options={STORE_TYPES.map((label) => ({ value: label, label }))}
                  disabled={!isCreate && !canUpdate}
                />
              )}
            </FormField>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField label="Country" htmlFor="branchCountry" required={isCreate}>
                {(fieldProps) => (
                  <Input {...fieldProps} value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Nigeria" disabled={!isCreate && !canUpdate} />
                )}
              </FormField>
              <FormField label="State" htmlFor="branchState" required={isCreate}>
                {(fieldProps) => (
                  <Input {...fieldProps} value={branchState} onChange={(e) => setBranchState(e.target.value)} placeholder="e.g. Lagos" disabled={!isCreate && !canUpdate} />
                )}
              </FormField>
              <FormField label="City" htmlFor="branchCity" required={isCreate}>
                {(fieldProps) => (
                  <Input {...fieldProps} value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Ikeja" disabled={!isCreate && !canUpdate} />
                )}
              </FormField>
            </div>
            <FormField label="Time zone" htmlFor="branchTimeZone" required={isCreate} hint="Keeps clock-ins and schedules accurate.">
              {(fieldProps) => (
                <Select
                  {...fieldProps}
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  placeholder="Select time zone"
                  options={timeZoneOptions.map((tz) => ({ value: tz, label: tz }))}
                  disabled={!isCreate && !canUpdate}
                />
              )}
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
