import React from 'react';
import { EmptyState, PageContainer, PageHeader } from '@shiftos/ui';

/** WEB-010 — Invitations. Same documented gap as MembersPage: packages/auth can send an invite, but there is no invitation-tracking service yet. */
export default function InvitationsPage(): React.ReactElement {
  return (
    <PageContainer>
      <PageHeader title="Invitations" description="Send and track invitations to join your organization." />
      <EmptyState
        title="Invitation tracking is coming soon"
        description="Sending and monitoring invitations from ShiftOS directly isn't available yet — this screen is reserved for a coming backend milestone."
      />
    </PageContainer>
  );
}
