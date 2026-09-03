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
  SearchableSelect,
  Select,
  SkeletonRows
} from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcMutation, useRpcQuery } from '../../lib/useRpc.js';
import { getCountryOptions, getRegionLabel, getStateOptions, resolveCountryValue, resolveStateValue } from '../../lib/geography.js';
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

  // `country`/`branchState` stay exactly what's in `branch.settings` until
  // the user actively re-picks one from a select — for a pre-existing branch
  // that may be free text/a country name from before this task, this avoids
  // silently rewriting it into the new-format identifier on an unrelated
  // save (e.g. just fixing the branch name), matching Global Constraint 4.
  const countryOptions = useMemo(() => getCountryOptions(), []);
  const resolvedCountry = useMemo(() => resolveCountryValue(country), [country]);
  const effectiveCountryOptions = useMemo(() => {
    if (!resolvedCountry || countryOptions.some((option) => option.value === resolvedCountry.code)) {
      return countryOptions;
    }
    return [{ value: resolvedCountry.code, label: resolvedCountry.label }, ...countryOptions];
  }, [countryOptions, resolvedCountry]);

  const stateOptions = useMemo(() => getStateOptions(resolvedCountry?.code), [resolvedCountry]);
  const regionLabel = useMemo(() => getRegionLabel(resolvedCountry?.code), [resolvedCountry]);
  const resolvedState = useMemo(() => resolveStateValue(resolvedCountry?.code, branchState), [resolvedCountry, branchState]);
  const effectiveStateOptions = useMemo(() => {
    if (!resolvedState || stateOptions.some((option) => option.value === resolvedState.code)) {
      return stateOptions;
    }
    return [{ value: resolvedState.code, label: resolvedState.label }, ...stateOptions];
  }, [stateOptions, resolvedState]);

  /** Country select's onChange — also drops any already-picked state, since it belongs to the previous country's list. */
  const handleCountryChange = (value: string): void => {
    setCountry(value);
    setBranchState('');
  };

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
    // settings column, it doesn't merge. Country/state/city are written
    // together as one unit (rather than each independently omitted when
    // blank, like storeType/timeZone are) because state is now cascaded from
    // country: if the user changes country and leaves state unpicked,
    // independently preserving the old state string would silently pair it
    // with the new country, which is worse than just clearing it.
    const hasLocation = Boolean(country.trim() || branchState.trim() || city.trim());
    const settings = {
      ...(branch?.settings ?? {}),
      ...(storeType ? { storeType } : {}),
      ...(hasLocation ? { country: country.trim(), state: branchState.trim(), city: city.trim() } : {}),
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
                  <SearchableSelect
                    {...fieldProps}
                    options={effectiveCountryOptions}
                    placeholder="Search countries…"
                    value={resolvedCountry?.code ?? ''}
                    onChange={handleCountryChange}
                    disabled={!isCreate && !canUpdate}
                  />
                )}
              </FormField>
              <FormField label={regionLabel} htmlFor="branchState" required={isCreate}>
                {(fieldProps) =>
                  stateOptions.length > 0 ? (
                    <SearchableSelect
                      {...fieldProps}
                      options={effectiveStateOptions}
                      placeholder={resolvedCountry ? `Search ${regionLabel.toLowerCase()}…` : 'Select a country first'}
                      value={resolvedState?.code ?? ''}
                      onChange={setBranchState}
                      disabled={(!isCreate && !canUpdate) || !resolvedCountry}
                    />
                  ) : (
                    <Input
                      {...fieldProps}
                      value={branchState}
                      onChange={(e) => setBranchState(e.target.value)}
                      placeholder="e.g. Lagos"
                      disabled={(!isCreate && !canUpdate) || !resolvedCountry}
                    />
                  )
                }
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
