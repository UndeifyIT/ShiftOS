import React from 'react';
import { EmptyState, PageContainer, PageHeader } from '@shiftos/ui';

/**
 * WEB-010 — Invitations. `packages/auth`'s `SupabaseAuthProvider.createAdminClient()`
 * can send an invite, but only using `SUPABASE_SERVICE_ROLE_KEY` — a credential
 * that must never reach a browser, and that `packages/backend`'s RPC server
 * deliberately doesn't load today (`@shiftos/config`'s `loadConfig()` never
 * reads it, on purpose). Exposing invitations here would require a new,
 * carefully-scoped RPC operation that constructs a service-role admin client
 * server-side and also decides how the resulting invitation is tracked — a
 * real backend capability, not a UI gap, so it isn't faked here.
 */
export default function InvitationsPage(): React.ReactElement {
  return (
    <PageContainer>
      <PageHeader title="Invitations" description="Send and track invitations to join your organization." />
      <EmptyState
        title="Invitation sending isn't available yet"
        description="Sending an invitation requires a privileged Supabase Auth capability (the service-role key) that isn't wired into the backend API yet. This needs a dedicated, carefully-scoped backend addition — tracked as a follow-up, not implemented here."
      />
    </PageContainer>
  );
}
