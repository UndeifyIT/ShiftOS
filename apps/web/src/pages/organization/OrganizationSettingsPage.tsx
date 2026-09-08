import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Card,
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
import { getCountryOptions } from '@shiftos/geography';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcMutation, useRpcQuery } from '../../lib/useRpc.js';
import type { Organization } from '../../types/domain.js';

/** Same preset lists the onboarding wizard's Organization step uses (organizations.metadata) — kept in sync manually since they're small constants, not worth sharing a module for two call sites. */
const BUSINESS_TYPES = ['Supermarket', 'Retail Store', 'Restaurant', 'Pharmacy', 'Warehouse & Logistics', 'Hospitality', 'Healthcare', 'Manufacturing', 'Other'];
const DEPARTMENT_COUNT_ESTIMATES = ['1 – 3', '4 – 6', '7 – 10', '11 – 20', '20+'];
const EMPLOYEE_ESTIMATES = ['1 – 5', '6 – 25', '26 – 50', '51 – 100', '100+'];

/** Same IANA-timezone source the onboarding wizard's Organization/Branch steps use — see those files' own comments for the fallback rationale. */
function getTimeZoneOptions(): string[] {
  try {
    const supportedValuesOf = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
    if (typeof supportedValuesOf === 'function') {
      return supportedValuesOf('timeZone');
    }
  } catch {
    // fall through to the static fallback below
  }
  return ['Africa/Lagos', 'Africa/Accra', 'Africa/Nairobi', 'Africa/Johannesburg', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Asia/Dubai', 'UTC'];
}

/** WEB-002 — Organization Profile & Settings. */
export default function OrganizationSettingsPage(): React.ReactElement {
  const { hasPermission, activeOrganization } = useSession();
  const canRead = hasPermission('organizations.read');
  const canUpdate = hasPermission('organizations.update');
  // Only true mid-onboarding (App.tsx routes this page in from the onboarding
  // gate so the Branch step's Back button has somewhere to go) — an
  // already-onboarded organization reaches this page from AppShellRoutes
  // instead, where a link back into the wizard would be meaningless.
  const isMidOnboarding = !activeOrganization?.metadata?.onboardingCompletedAt;

  const { data, isLoading, error, refetch } = useRpcQuery<Organization>('get_organization', undefined, { enabled: canRead });
  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [departmentCountEstimate, setDepartmentCountEstimate] = useState('');
  const [estimatedEmployees, setEstimatedEmployees] = useState('');
  const [country, setCountry] = useState('');
  const [timeZone, setTimeZone] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const countryOptions = useMemo(() => getCountryOptions(), []);
  const timeZoneOptions = useMemo(() => getTimeZoneOptions(), []);

  useEffect(() => {
    if (!data) return;
    setName(data.name);
    const metadata = data.metadata;
    setBusinessType(typeof metadata.businessType === 'string' ? metadata.businessType : '');
    setDepartmentCountEstimate(typeof metadata.departmentCountEstimate === 'string' ? metadata.departmentCountEstimate : '');
    setEstimatedEmployees(typeof metadata.estimatedEmployees === 'string' ? metadata.estimatedEmployees : '');
    setCountry(typeof metadata.country === 'string' ? metadata.country : '');
    setTimeZone(typeof metadata.timeZone === 'string' ? metadata.timeZone : '');
  }, [data]);

  const updateMutation = useRpcMutation<Organization, { name: string; metadata?: Record<string, unknown> }>('update_organization', {
    invalidates: ['get_organization'],
    onSuccess: () => setSaved(true),
    onError: (err) => setSaveError(err.message)
  });

  if (!canRead) {
    return (
      <PageContainer>
        <PermissionDenied />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="Organization Settings" description="Manage your organization's profile and business details." />
      {isLoading ? (
        <SkeletonRows rows={4} />
      ) : error ? (
        <ErrorState description={(error as Error).message} onRetry={() => void refetch()} />
      ) : (
        <Card className="max-w-xl">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSaveError(null);
              setSaved(false);
              // Spreads the org's existing metadata first — update_organization
              // replaces the whole metadata column rather than merging it, so
              // omitting this would silently drop onboardingStartedAt/
              // onboardingCompletedAt/logoPath (see OrganizationStep.tsx's own
              // handleSubmit, which follows the same pattern).
              updateMutation.mutate({
                name,
                metadata: { ...data?.metadata, businessType, departmentCountEstimate, estimatedEmployees, country, timeZone }
              });
            }}
            className="flex flex-col gap-4"
          >
            <FormField label="Organization name" htmlFor="orgName" required>
              {(fieldProps) => <Input {...fieldProps} value={name} onChange={(e) => setName(e.target.value)} disabled={!canUpdate} />}
            </FormField>
            <FormField label="Workspace URL" htmlFor="orgSlug">
              {(fieldProps) => <Input {...fieldProps} value={data?.slug ?? ''} disabled />}
            </FormField>
            <FormField label="Business type" htmlFor="orgBusinessType">
              {(fieldProps) => (
                <Select
                  {...fieldProps}
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  placeholder="Select business type"
                  options={BUSINESS_TYPES.map((label) => ({ value: label, label }))}
                  disabled={!canUpdate}
                />
              )}
            </FormField>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Number of departments" htmlFor="orgDepartmentCount">
                {(fieldProps) => (
                  <Select
                    {...fieldProps}
                    value={departmentCountEstimate}
                    onChange={(e) => setDepartmentCountEstimate(e.target.value)}
                    placeholder="Select a range"
                    options={DEPARTMENT_COUNT_ESTIMATES.map((label) => ({ value: label, label }))}
                    disabled={!canUpdate}
                  />
                )}
              </FormField>
              <FormField label="Estimated employees" htmlFor="orgEstimatedEmployees">
                {(fieldProps) => (
                  <Select
                    {...fieldProps}
                    value={estimatedEmployees}
                    onChange={(e) => setEstimatedEmployees(e.target.value)}
                    placeholder="Select a range"
                    options={EMPLOYEE_ESTIMATES.map((label) => ({ value: label, label }))}
                    disabled={!canUpdate}
                  />
                )}
              </FormField>
            </div>
            <FormField label="Country" htmlFor="orgCountry">
              {(fieldProps) => (
                <SearchableSelect {...fieldProps} options={countryOptions} placeholder="Search countries…" value={country} onChange={setCountry} disabled={!canUpdate} />
              )}
            </FormField>
            <FormField label="Time zone" htmlFor="orgTimeZone" hint="Keeps clock-ins and schedules accurate.">
              {(fieldProps) => (
                <Select
                  {...fieldProps}
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  placeholder="Select time zone"
                  options={timeZoneOptions.map((tz) => ({ value: tz, label: tz }))}
                  disabled={!canUpdate}
                />
              )}
            </FormField>
            {saveError ? <InlineError message={saveError} /> : null}
            {saved ? <p className="text-sm font-medium text-success-text">Saved.</p> : null}
            <div className="flex flex-wrap items-center gap-3">
              {canUpdate ? (
                <Button type="submit" loading={updateMutation.isPending}>
                  Save changes
                </Button>
              ) : null}
              {isMidOnboarding ? (
                <Link to="/" className="text-sm font-bold text-neutral-500 transition-colors hover:text-neutral-700">
                  &larr; Back to setup
                </Link>
              ) : null}
            </div>
          </form>
        </Card>
      )}
    </PageContainer>
  );
}
