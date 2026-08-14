import React, { useState } from 'react';
import { Badge, Button, ConfirmationDialog, DataTable, FormField, InlineError, Input, Modal, PageContainer, PageHeader, PermissionDenied, Select } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcMutation, useRpcQuery } from '../../lib/useRpc.js';
import type { Branch, Invitation, Role } from '../../types/domain.js';

const STATUS_TONE: Record<Invitation['status'], 'pending' | 'success' | 'neutral'> = {
  pending: 'pending',
  accepted: 'success',
  revoked: 'neutral'
};

function isExpired(invitation: Invitation): boolean {
  return invitation.status === 'pending' && new Date(invitation.expires_at).getTime() < Date.now();
}

function InviteMemberForm({ onDone }: { onDone: () => void }): React.ReactElement {
  const { data: roles } = useRpcQuery<Role[]>('list_invitable_roles');
  const { data: branches } = useRpcQuery<Branch[]>('list_branches');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const inviteMutation = useRpcMutation<
    Invitation,
    { email: string; firstName: string; lastName: string; roleId: string; branchIds: string[] }
  >('invite_member', {
    invalidates: ['list_invitations'],
    onSuccess: onDone,
    onError: (err) => setError(err.message)
  });

  const toggleBranch = (id: string): void => {
    setBranchIds((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!firstName.trim() || !lastName.trim() || !email.trim() || !roleId) {
          setError('First name, last name, email, and role are required.');
          return;
        }
        if (branchIds.length === 0) {
          setError('Select at least one branch.');
          return;
        }
        setError(null);
        inviteMutation.mutate({ email: email.trim(), firstName: firstName.trim(), lastName: lastName.trim(), roleId, branchIds });
      }}
      className="flex flex-col gap-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="First name" htmlFor="inviteFirstName" required>
          {(fieldProps) => <Input {...fieldProps} value={firstName} onChange={(e) => setFirstName(e.target.value)} />}
        </FormField>
        <FormField label="Last name" htmlFor="inviteLastName" required>
          {(fieldProps) => <Input {...fieldProps} value={lastName} onChange={(e) => setLastName(e.target.value)} />}
        </FormField>
      </div>
      <FormField label="Email" htmlFor="inviteEmail" required hint="We'll send a real invitation to this address.">
        {(fieldProps) => <Input {...fieldProps} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
      </FormField>
      <FormField label="Role" htmlFor="inviteRole" required>
        {(fieldProps) => (
          <Select
            {...fieldProps}
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            placeholder="Select a role"
            options={(roles ?? []).map((r) => ({ value: r.id, label: r.name }))}
          />
        )}
      </FormField>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-neutral-800">Branches</legend>
        <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3">
          {(branches ?? []).length === 0 ? (
            <p className="text-sm text-neutral-500">No branches yet — create one first.</p>
          ) : (
            (branches ?? []).map((branch) => (
              <label key={branch.id} className="flex items-center gap-2 text-sm text-neutral-800">
                <input
                  type="checkbox"
                  checked={branchIds.includes(branch.id)}
                  onChange={() => toggleBranch(branch.id)}
                  className="h-4 w-4 rounded border-neutral-300 text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                />
                {branch.name}
              </label>
            ))
          )}
        </div>
      </fieldset>
      {error ? <InlineError message={error} /> : null}
      <Button type="submit" loading={inviteMutation.isPending} fullWidth>
        Send invitation
      </Button>
    </form>
  );
}

/**
 * WEB-010 — Invitations. Real: list_invitations/invite_member/revoke_invitation
 * (packages/api/src/operations/membership.ts -> MembershipService, 031) —
 * server-written invitations table, server-side Supabase Auth admin call via
 * context.authProvider (fails closed with a real error if the server has no
 * service-role key configured, e.g. in an environment that hasn't set one up).
 * Whether the invite email actually lands in an inbox depends on the Supabase
 * project's configured SMTP provider — that's infrastructure, not something
 * this page can guarantee or fake.
 */
export default function InvitationsPage(): React.ReactElement {
  const { hasPermission } = useSession();
  const canManage = hasPermission('org.members.manage');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<Invitation | null>(null);

  const { data: invitations, isLoading, error, refetch } = useRpcQuery<Invitation[]>('list_invitations', undefined, { enabled: canManage });

  const revokeMutation = useRpcMutation<{ revoked: boolean }, { invitationId: string }>('revoke_invitation', {
    invalidates: ['list_invitations'],
    onSuccess: () => setRevokeTarget(null)
  });

  if (!canManage) {
    return (
      <PageContainer>
        <PermissionDenied />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Invitations"
        description="Send and track invitations to join your organization."
        actions={<Button onClick={() => setInviteOpen(true)}>Invite member</Button>}
      />

      <DataTable<Invitation>
        columns={[
          { key: 'name', header: 'Name', primary: true, render: (i) => `${i.first_name} ${i.last_name}` },
          { key: 'email', header: 'Email', render: (i) => i.email },
          { key: 'role', header: 'Role', render: (i) => <Badge tone="neutral">{i.role_name}</Badge> },
          {
            key: 'status',
            header: 'Status',
            render: (i) => (
              <Badge tone={isExpired(i) ? 'neutral' : STATUS_TONE[i.status]}>
                {isExpired(i) ? 'Expired' : i.status === 'pending' ? 'Pending' : i.status === 'accepted' ? 'Accepted' : 'Revoked'}
              </Badge>
            )
          },
          { key: 'invitedBy', header: 'Invited by', render: (i) => `${i.invited_by_first_name} ${i.invited_by_last_name}` },
          { key: 'sent', header: 'Sent', render: (i) => new Date(i.created_at).toLocaleDateString() },
          {
            key: 'actions',
            header: '',
            render: (i) =>
              i.status === 'pending' && !isExpired(i) ? (
                <button type="button" className="text-sm font-medium text-error-600 hover:text-error-text" onClick={() => setRevokeTarget(i)}>
                  Revoke
                </button>
              ) : null
          }
        ]}
        rows={invitations ?? []}
        rowKey={(i) => i.id}
        loading={isLoading}
        error={error ? (error as Error).message : undefined}
        onRetry={() => void refetch()}
        emptyTitle="No invitations yet"
        emptyDescription="Invite a Supervisor or Employee to give them their own ShiftOS sign-in."
      />

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite a member" description="They'll receive a real invitation email to set up their own account.">
        <InviteMemberForm onDone={() => setInviteOpen(false)} />
      </Modal>

      <ConfirmationDialog
        open={Boolean(revokeTarget)}
        onClose={() => setRevokeTarget(null)}
        onConfirm={() => revokeTarget && revokeMutation.mutate({ invitationId: revokeTarget.id })}
        title="Revoke invitation"
        description={revokeTarget ? `${revokeTarget.first_name} ${revokeTarget.last_name} will no longer be able to accept this invitation.` : undefined}
        confirmLabel="Revoke"
        destructive
        loading={revokeMutation.isPending}
      />
    </PageContainer>
  );
}
