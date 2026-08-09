import React, { useState } from 'react';
import { Button, FormField, InlineError, Input } from '@shiftos/ui';
import { supabase } from '../../lib/supabase.js';
import { useSession } from '../../auth/SessionProvider.js';
import { AuthLayout } from '../auth/AuthLayout.js';

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * WEB-001 — Organization Setup (first run). Calls
 * create_organization_with_owner directly via Supabase RPC (migration 023) —
 * this bootstrap function is intentionally reached outside packages/api's
 * RPC registry, since it's the one operation that must run before any
 * organizationId exists for that registry to resolve against (see
 * lib/supabase.ts's module doc).
 */
export default function OrganizationSetupPage(): React.ReactElement {
  const { refresh, signOut } = useSession();
  const [name, setName] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleNameChange = (value: string): void => {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!name.trim() || !slug.trim()) {
      setError('Organization name is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc('create_organization_with_owner', {
      p_name: name.trim(),
      p_slug: slug.trim()
    });
    if (rpcError) {
      setSubmitting(false);
      setError(rpcError.message.includes('duplicate') ? 'That workspace URL is already taken — try another.' : 'We could not create your organization. Please try again.');
      return;
    }
    await refresh();
    setSubmitting(false);
  };

  return (
    <AuthLayout title="Set up your organization" description="Create your ShiftOS workspace to get started.">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormField label="Organization name" htmlFor="orgName" required>
          {(fieldProps) => <Input {...fieldProps} value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Acme Retail" />}
        </FormField>
        <FormField label="Workspace URL" htmlFor="orgSlug" required hint="Used to identify your organization. Lowercase letters, numbers and dashes only.">
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
            />
          )}
        </FormField>
        {error ? <InlineError message={error} /> : null}
        <Button type="submit" loading={submitting} fullWidth>
          Create organization
        </Button>
      </form>
      <p className="mt-6 text-center text-xs text-neutral-500">
        Were you invited to an existing team? Ask your administrator to confirm your invitation was completed.
      </p>
      <button type="button" onClick={() => void signOut()} className="mt-3 block w-full text-center text-sm font-medium text-neutral-500 hover:text-neutral-700">
        Sign out
      </button>
    </AuthLayout>
  );
}
