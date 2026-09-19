import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PermissionDenied } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { HandoffModal, ModalField, ModalFields, modalControl } from '../../components/HandoffModal.js';
import { useRpcMutation, useRpcQuery } from '../../lib/useRpc.js';
import type { Branch, Invitation, Member, Role } from '../../types/domain.js';
import { OverviewEmpty, OverviewHeader, OverviewLoading } from '../dashboard/manager/ManagerOverview.js';
import { useNow } from '../dashboard/manager/useManagerOverview.js';
import { ScheduleToast, useScheduleToast } from '../scheduling/grid/ScheduleToast.js';
import { DialogNote, HeaderCta, RolePeopleTable } from './RolePeopleTable.js';
import { adminsCount, adminsSubtitle, buildAdminRows, filterSupervisors, invitableAdminRoles, type SupervisorFilter } from './rolePeopleModel.js';

/*
 * The Manager's Admins page, built to the design handoff
 * (`ShiftOS Dashboards.dc.html`: `PAGES["Manager/Admins"]` + `ADMINS`, the
 * same toolbar and generic table as Supervisors with its own columns —
 * Admin, Scope, Access, Invited, Status). An admin is someone whose ShiftOS
 * role is org-wide: they see every branch.
 */

const COLUMNS: [string, string, string, string, string] = ['Admin', 'Scope', 'Access', 'Invited', 'Status'];
const FOOT = "Admins manage billing and view every branch. They can't edit schedules, employees or approvals.";

/**
 * The handoff's "Invite an Admin" dialog, over the real `invite_member`. The
 * Admin role is branch-scoped on purpose (migration 048) so it can go through
 * the ordinary invite pipeline — an org-wide role is never invitable, which
 * is what stops invite issuance from handing over full organization access —
 * so the invitation grants every current branch, and migration 049's trigger
 * adds any branch created later.
 */
function InviteAdminModal({
  open,
  roles,
  branchIds,
  onClose,
  onInvited,
  onOpenMembers
}: {
  open: boolean;
  roles: Role[];
  branchIds: string[];
  onClose: () => void;
  onInvited: (email: string) => void;
  onOpenMembers: () => void;
}): React.ReactElement {
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const invite = useRpcMutation<Invitation, { email: string; roleId: string; branchIds: string[] }>('invite_member', { invalidates: ['list_invitations'] });
  const role = roleId || roles[0]?.id || '';

  const send = async (): Promise<void> => {
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(address)) {
      setError('Enter a valid work email address');
      return;
    }
    try {
      // Every current branch; 049's trigger grants any branch added later.
      await invite.mutateAsync({ email: address, roleId: role, branchIds });
      setEmail('');
      setError(null);
      onInvited(address);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Could not send the invitation');
    }
  };

  const subtitle =
    "Admins can manage your ShiftOS subscription and view organization-wide branch information. They don't manage day-to-day branch operations.";

  if (roles.length === 0) {
    return (
      <HandoffModal open={open} title="Invite an Admin" subtitle={subtitle} primary="Open Members & Roles" onPrimary={onOpenMembers} onClose={onClose}>
        <DialogNote>
          This organization has no Admin role to grant yet — only the role it was created with, which holds every permission and can never be handed out by invitation. Open
          Members &amp; Roles to see the roles this organization has.
        </DialogNote>
      </HandoffModal>
    );
  }

  return (
    <HandoffModal
      open={open}
      title="Invite an Admin"
      subtitle={subtitle}
      primary={invite.isPending ? 'Sending\u2026' : 'Send Invitation'}
      primaryDisabled={invite.isPending}
      onPrimary={() => void send()}
      onClose={onClose}
    >
      <ModalFields>
        <ModalField label="Work email" required full>
          <input type="email" value={email} aria-label="Work email" placeholder="name@yourcompany.com" onChange={(event) => setEmail(event.target.value)} className={modalControl} />
        </ModalField>
        {roles.length > 1 ? (
          <ModalField label="Access" required full>
            <select value={role} aria-label="Access" onChange={(event) => setRoleId(event.target.value)} className={`${modalControl} cursor-pointer`}>
              {roles.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </ModalField>
        ) : null}
      </ModalFields>
      <DialogNote>
        They get every branch in {branchIds.length === 1 ? 'this organization' : `all ${branchIds.length} branches`}, and any branch added later. They set their own password from
        the invitation; invitations last 7 days.
      </DialogNote>
      {error ? <p className="mx-[22px] mb-0 mt-2.5 text-[12px] font-semibold text-[#C93A22]">{error}</p> : null}
    </HandoffModal>
  );
}

export default function AdminsPage(): React.ReactElement {
  const navigate = useNavigate();
  const now = useNow();
  const { toast, show, dismiss } = useScheduleToast();
  const { hasPermission } = useSession();
  const canManage = hasPermission('org.members.manage');

  const membersQuery = useRpcQuery<Member[]>('list_members', undefined, { enabled: canManage });
  const { data: invitations } = useRpcQuery<Invitation[]>('list_invitations', undefined, { enabled: canManage });
  const { data: roles } = useRpcQuery<Role[]>('list_roles', undefined, { enabled: canManage });
  const { data: branches } = useRpcQuery<Branch[]>('list_branches', undefined, { enabled: hasPermission('branches.read') });
  const adminRoles = useMemo(() => invitableAdminRoles(roles ?? []), [roles]);
  const branchIds = useMemo(() => (branches ?? []).filter((branch) => branch.is_active && !branch.deleted_at).map((branch) => branch.id), [branches]);

  const [filter, setFilter] = useState<SupervisorFilter>('All');
  const [query, setQuery] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);

  const rows = useMemo(
    () => buildAdminRows({ members: membersQuery.data ?? [], invitations: invitations ?? [], roles: roles ?? [], now }),
    [membersQuery.data, invitations, roles, now]
  );
  const shown = filterSupervisors(rows, filter, query);

  if (!canManage) {
    return (
      <div className="px-7 py-6">
        <PermissionDenied />
      </div>
    );
  }

  const body = (): React.ReactNode => {
    if (membersQuery.isLoading) return <OverviewLoading />;
    if (rows.length === 0) {
      return (
        <OverviewEmpty
          title="No admins yet"
          body="Invite an admin to manage your organization's subscription and see every branch at a glance."
          cta={{ label: 'Invite admin', onClick: () => setInviteOpen(true) }}
          secondary={{ label: 'Learn about roles', onClick: () => navigate('/members') }}
        />
      );
    }
    return (
      <RolePeopleTable
        columns={COLUMNS}
        rows={shown}
        filter={filter}
        onFilter={setFilter}
        query={query}
        onQuery={setQuery}
        searchPlaceholder="Search admins"
        count={adminsCount(shown, filter)}
        foot={FOOT}
        emptyLine="No admins match this search."
      />
    );
  };

  return (
    <div className="flex min-h-full flex-col text-[13px] text-[#38312B] [line-height:normal]">
      <OverviewHeader title="Admins" subtitle={adminsSubtitle(rows)} now={now} actions={rows.length ? <HeaderCta label="Invite admin" onClick={() => setInviteOpen(true)} /> : null} />
      <div className="flex flex-auto flex-col gap-[18px] bg-[#FDFCFB] px-7 pb-10 pt-[22px] max-[859px]:gap-3.5 max-[859px]:px-3.5 max-[859px]:pb-[84px] max-[859px]:pt-4">{body()}</div>

      <InviteAdminModal
        open={inviteOpen}
        roles={adminRoles}
        branchIds={branchIds}
        onClose={() => setInviteOpen(false)}
        onInvited={(email) => {
          setInviteOpen(false);
          show(`Invitation sent to ${email}`);
        }}
        onOpenMembers={() => {
          setInviteOpen(false);
          navigate('/members');
        }}
      />
      <ScheduleToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
