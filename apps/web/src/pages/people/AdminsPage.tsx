import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PermissionDenied } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { HandoffModal } from '../../components/HandoffModal.js';
import { useRpcQuery } from '../../lib/useRpc.js';
import type { Invitation, Member, Role } from '../../types/domain.js';
import { OverviewEmpty, OverviewHeader, OverviewLoading } from '../dashboard/manager/ManagerOverview.js';
import { useNow } from '../dashboard/manager/useManagerOverview.js';
import { DialogNote, HeaderCta, RolePeopleTable } from './RolePeopleTable.js';
import { adminsCount, adminsSubtitle, buildAdminRows, filterSupervisors, type SupervisorFilter } from './rolePeopleModel.js';

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
 * The handoff's "Invite an Admin" dialog. Org-wide roles deliberately cannot
 * be granted by invitation (MembershipService.inviteMember refuses them, so
 * invite issuance can never become a path to full organization access), so
 * the dialog says how admin access really happens instead of offering a form
 * that the server would reject.
 */
function InviteAdminModal({ open, onClose, onOpenMembers }: { open: boolean; onClose: () => void; onOpenMembers: () => void }): React.ReactElement {
  return (
    <HandoffModal
      open={open}
      title="Invite an Admin"
      subtitle="Admins can manage your ShiftOS subscription and view organization-wide branch information. They don't manage day-to-day branch operations."
      primary="Open Members & Roles"
      onPrimary={onOpenMembers}
      onClose={onClose}
    >
      <DialogNote>
        Organization-wide access isn&apos;t handed out by email invitation — an invitation can only grant a branch role, which keeps invites from becoming a way into your whole
        organization. To make someone an admin, add them under Members &amp; Roles and move them onto an organization-wide role there.
      </DialogNote>
    </HandoffModal>
  );
}

export default function AdminsPage(): React.ReactElement {
  const navigate = useNavigate();
  const now = useNow();
  const { hasPermission } = useSession();
  const canManage = hasPermission('org.members.manage');

  const membersQuery = useRpcQuery<Member[]>('list_members', undefined, { enabled: canManage });
  const { data: invitations } = useRpcQuery<Invitation[]>('list_invitations', undefined, { enabled: canManage });
  const { data: roles } = useRpcQuery<Role[]>('list_roles', undefined, { enabled: canManage });

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
        onClose={() => setInviteOpen(false)}
        onOpenMembers={() => {
          setInviteOpen(false);
          navigate('/members');
        }}
      />
    </div>
  );
}
