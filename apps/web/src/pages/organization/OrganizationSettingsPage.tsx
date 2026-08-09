import React, { useEffect, useState } from 'react';
import { Button, Card, ErrorState, FormField, InlineError, Input, PageContainer, PageHeader, PermissionDenied, SkeletonRows } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcMutation, useRpcQuery } from '../../lib/useRpc.js';
import type { Organization } from '../../types/domain.js';

/** WEB-002 — Organization Profile & Settings. */
export default function OrganizationSettingsPage(): React.ReactElement {
  const { hasPermission } = useSession();
  const canRead = hasPermission('organizations.read');
  const canUpdate = hasPermission('organizations.update');

  const { data, isLoading, error, refetch } = useRpcQuery<Organization>('get_organization', undefined, { enabled: canRead });
  const [name, setName] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setName(data.name);
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
              updateMutation.mutate({ name });
            }}
            className="flex flex-col gap-4"
          >
            <FormField label="Organization name" htmlFor="orgName" required>
              {(fieldProps) => <Input {...fieldProps} value={name} onChange={(e) => setName(e.target.value)} disabled={!canUpdate} />}
            </FormField>
            <FormField label="Workspace URL" htmlFor="orgSlug">
              {(fieldProps) => <Input {...fieldProps} value={data?.slug ?? ''} disabled />}
            </FormField>
            {saveError ? <InlineError message={saveError} /> : null}
            {saved ? <p className="text-sm font-medium text-success-text">Saved.</p> : null}
            {canUpdate ? (
              <Button type="submit" loading={updateMutation.isPending} className="self-start">
                Save changes
              </Button>
            ) : null}
          </form>
        </Card>
      )}
    </PageContainer>
  );
}
