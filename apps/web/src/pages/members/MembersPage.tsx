import React from 'react';
import { EmptyState, PageContainer, PageHeader } from '@shiftos/ui';

/**
 * WEB-009 — Member & Role Administration. `org.members.manage`/`org.roles.manage`
 * are seeded permissions, but no service/RPC layer consumes them yet
 * (frontend foundation §H, §K open question 2) — inventing a fake list here
 * would violate instruction #6 (no fake backend). This renders the honest
 * "not built yet" state instead of a working screen.
 */
export default function MembersPage(): React.ReactElement {
  return (
    <PageContainer>
      <PageHeader title="Members & Roles" description="Manage who has access to your organization and what they can do." />
      <EmptyState
        title="Member administration is coming soon"
        description="Managing memberships and role permissions from ShiftOS directly isn't available yet — this screen is reserved for a coming backend milestone."
      />
    </PageContainer>
  );
}
