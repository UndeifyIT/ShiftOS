import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PermissionDenied } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { useDefaultBranchId } from '../../auth/useDefaultBranchId.js';
import { HandoffModal, ModalField, ModalFields, modalControl } from '../../components/HandoffModal.js';
import { useRpcMutation, useRpcQueries, useRpcQuery } from '../../lib/useRpc.js';
import type { Department, Employee, Invitation, Member, Role } from '../../types/domain.js';
import { OverviewEmpty, OverviewHeader, OverviewLoading } from '../dashboard/manager/ManagerOverview.js';
import { useNow } from '../dashboard/manager/useManagerOverview.js';
import { ScheduleToast, useScheduleToast } from '../scheduling/grid/ScheduleToast.js';
import { TONES, type Tone } from '../scheduling/grid/scheduleFormat.js';
import { HeaderCta, RolePeopleTable, TableAction } from './RolePeopleTable.js';
import {
  buildSupervisorRows,
  filterSupervisors,
  supervisorRoles,
  supervisorsCount,
  supervisorsSubtitle,
  type SupervisorFilter
} from './rolePeopleModel.js';

/*
 * WEB-009 — the Manager's Supervisors page, built to the design handoff
 * (`ShiftOS Dashboards.dc.html`: `PAGES["Manager/Supervisors"]`, the shared
 * toolbar at lines 363-376 and the generic table at lines 378-407, with
 * TABLE_GRID and CELL). Rows are the branch's real supervisors — people whose
 * ShiftOS role is branch-scoped — followed by invitations still outstanding.
 * Sizes are the prototype's rendered ones, not Tailwind approximations.
 */

const COLUMNS: [string, string, string, string, string] = ['Supervisor', 'Department', 'Permissions', 'Team size', 'Status'];

/** The six capabilities a branch-scoped role can hold, plus what it can never do (handoff "Manage permissions"). */
const CAPABILITIES: Array<{ key: string; label: string }> = [
  { key: 'manageSchedules', label: 'Manage schedules' },
  { key: 'markAttendance', label: 'Mark attendance' },
  { key: 'assignTasks', label: 'Assign tasks' },
  { key: 'approveSwaps', label: 'Approve swaps' },
  { key: 'postAnnouncements', label: 'Post announcements' },
  { key: 'viewReports', label: 'View reports' }
];
const NEVER = ['Change organization settings', 'Delete employees'];

const pillStyle = (tone: Tone): React.CSSProperties => ({ color: TONES[tone][0], backgroundColor: TONES[tone][1] });

function InviteSupervisorModal({
  open,
  roles,
  branchName,
  onClose,
  onInvited
}: {
  open: boolean;
  roles: Role[];
  branchName: string;
  onClose: () => void;
  onInvited: (email: string) => void;
}): React.ReactElement {
  const branchId = useDefaultBranchId() ?? '';
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
    if (!role) {
      setError('Create a supervisor role first — Members & Roles');
      return;
    }
    try {
      await invite.mutateAsync({ email: address, roleId: role, branchIds: [branchId] });
      setEmail('');
      setError(null);
      onInvited(address);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Could not send the invitation');
    }
  };

  return (
    <HandoffModal
      open={open}
      title="Invite a supervisor"
      subtitle="They set their own password. Invitations last 7 days."
      primary={invite.isPending ? 'Sending…' : 'Send invitation'}
      primaryDisabled={invite.isPending}
      onPrimary={() => void send()}
      onClose={onClose}
    >
      <ModalFields>
        <ModalField label="Work email" required full>
          <input
            type="email"
            value={email}
            aria-label="Work email"
            placeholder="name@yourcompany.com"
            onChange={(event) => setEmail(event.target.value)}
            className={modalControl}
          />
        </ModalField>
        <ModalField label="Permissions" required full>
          <select value={role} aria-label="Permissions" onChange={(event) => setRoleId(event.target.value)} className={`${modalControl} cursor-pointer`}>
            {roles.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
            {roles.length === 0 ? <option value="">No supervisor role yet</option> : null}
          </select>
        </ModalField>
      </ModalFields>
      <p className="mx-[22px] mb-0 mt-3.5 rounded-[13px] border border-solid border-[#F2EEEA] bg-[#FDFCFB] p-3.5 text-[12.5px] leading-[1.55] text-[#57504A]">
        They get access to {branchName} with everything that role allows. Their name and department are theirs to fill in once they accept — you can set the department from their employee record.
      </p>
      {error ? <p className="mx-[22px] mb-0 mt-2.5 text-[12px] font-semibold text-[#C93A22]">{error}</p> : null}
    </HandoffModal>
  );
}

function ManagePermissionsModal({
  open,
  roles,
  onClose,
  onSaved
}: {
  open: boolean;
  roles: Role[];
  onClose: () => void;
  onSaved: () => void;
}): React.ReactElement {
  const [roleId, setRoleId] = useState('');
  const role = roleId || roles[0]?.id || '';
  const { data: capabilities, isLoading } = useRpcQuery<Record<string, boolean>>('get_role_capabilities', role ? { roleId: role } : undefined, { enabled: open && Boolean(role) });
  const [draft, setDraft] = useState<Record<string, boolean> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const save = useRpcMutation<Record<string, boolean>, { roleId: string; capabilities: Record<string, boolean> }>('update_role_permissions', {
    invalidates: ['get_role_capabilities']
  });
  const current = draft ?? capabilities ?? {};

  const submit = async (): Promise<void> => {
    try {
      await save.mutateAsync({ roleId: role, capabilities: Object.fromEntries(CAPABILITIES.map(({ key }) => [key, Boolean(current[key])])) });
      setDraft(null);
      setError(null);
      onSaved();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Could not save the permissions');
    }
  };

  return (
    <HandoffModal
      open={open}
      title="Manage permissions"
      subtitle="Least privilege by default — grant only what the role needs."
      primary={save.isPending ? 'Saving…' : 'Save permissions'}
      primaryDisabled={save.isPending || isLoading || !role}
      onPrimary={() => void submit()}
      onClose={() => {
        setDraft(null);
        onClose();
      }}
    >
      {roles.length > 1 ? (
        <ModalFields>
          <ModalField label="Role" full>
            <select
              value={role}
              aria-label="Role"
              onChange={(event) => {
                setRoleId(event.target.value);
                setDraft(null);
              }}
              className={`${modalControl} cursor-pointer`}
            >
              {roles.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </ModalField>
        </ModalFields>
      ) : null}

      <div className="mx-[22px] mt-[18px] flex flex-col gap-2">
        {CAPABILITIES.map(({ key, label }) => {
          const on = Boolean(current[key]);
          return (
            <label key={key} className="flex cursor-pointer items-center gap-2.5 rounded-[12px] border border-solid border-[#F2EEEA] bg-[#FDFCFB] px-3.5 py-3">
              <input
                type="checkbox"
                checked={on}
                disabled={isLoading}
                onChange={(event) => setDraft({ ...current, [key]: event.target.checked })}
                className="mx-0 my-0 size-4 cursor-pointer accent-[#F04E17]"
              />
              <span className="flex-auto text-[12.5px] font-bold">{label}</span>
              <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={pillStyle(on ? 'ok' : 'neutral')}>
                {on ? 'Allowed' : 'Not allowed'}
              </span>
            </label>
          );
        })}
        {NEVER.map((label) => (
          <p key={label} className="m-0 flex items-center gap-2.5 rounded-[12px] border border-solid border-[#F7E4DF] bg-[#FDF6F4] px-3.5 py-3">
            <span className="flex-auto text-[12.5px] font-bold text-[#8E5A2E]">{label}</span>
            <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={pillStyle('bad')}>
              Never for supervisors
            </span>
          </p>
        ))}
      </div>
      {error ? <p className="mx-[22px] mb-0 mt-2.5 text-[12px] font-semibold text-[#C93A22]">{error}</p> : null}
    </HandoffModal>
  );
}

export default function SupervisorsPage(): React.ReactElement {
  const navigate = useNavigate();
  const now = useNow();
  const { toast, show, dismiss } = useScheduleToast();
  const { hasPermission } = useSession();
  const canManage = hasPermission('org.members.manage');

  const branchId = useDefaultBranchId() ?? '';
  const scoped = branchId ? { branchId } : undefined;
  const membersQuery = useRpcQuery<Member[]>('list_members', undefined, { enabled: canManage });
  const { data: invitations } = useRpcQuery<Invitation[]>('list_invitations', undefined, { enabled: canManage });
  const { data: roles } = useRpcQuery<Role[]>('list_roles', undefined, { enabled: canManage });
  const { data: employees } = useRpcQuery<Employee[]>('list_employees', scoped, { enabled: Boolean(branchId) && hasPermission('employees.read') });
  const { data: departments } = useRpcQuery<Department[]>('list_departments', scoped, { enabled: Boolean(branchId) && hasPermission('departments.read') });
  const { data: branches } = useRpcQuery<{ id: string; name: string }[]>('list_branches', undefined, { enabled: hasPermission('branches.read') });
  const branchName = (branches ?? []).find((branch) => branch.id === branchId)?.name ?? 'your branch';

  // Every branch-scoped role, and how many capabilities each one holds — that count is the Permissions
  // column, and it's also what separates a supervisor role from a plain staff-login one.
  const branchRoles = useMemo(() => (roles ?? []).filter((role) => role.is_active && !role.deleted_at && !role.grants_org_wide_branch_access), [roles]);
  const capabilityQueries = useRpcQueries<Record<string, boolean>>(
    'get_role_capabilities',
    branchRoles.map((role) => ({ roleId: role.id })),
    { enabled: canManage }
  );
  const capabilitiesLoading = capabilityQueries.some((query) => query.isLoading);
  const permissionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    branchRoles.forEach((role, index) => {
      const data = capabilityQueries[index]?.data;
      if (data) counts[role.id] = Object.values(data).filter(Boolean).length;
    });
    return counts;
  }, [branchRoles, capabilityQueries]);
  const roleChoices = useMemo(() => supervisorRoles(branchRoles, permissionCounts), [branchRoles, permissionCounts]);

  const [filter, setFilter] = useState<SupervisorFilter>('All');
  const [query, setQuery] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);

  const rows = useMemo(
    () =>
      buildSupervisorRows({
        members: membersQuery.data ?? [],
        invitations: invitations ?? [],
        roles: roles ?? [],
        employees: employees ?? [],
        departments: departments ?? [],
        permissionCounts,
        now
      }),
    [membersQuery.data, invitations, roles, employees, departments, permissionCounts, now]
  );
  const shown = filterSupervisors(rows, filter, query);

  if (!canManage) {
    return (
      <div className="px-7 py-6">
        <PermissionDenied />
      </div>
    );
  }

  const headerActions = <HeaderCta label="Invite supervisor" onClick={() => setInviteOpen(true)} />;

  const body = (): React.ReactNode => {
    if (membersQuery.isLoading || capabilitiesLoading) return <OverviewLoading title="Supervisors" />;
    if (rows.length === 0) {
      return (
        <OverviewEmpty
          title="No supervisors yet"
          body="Supervisors run a department day to day — attendance, tasks and shift notes. Invite your first."
          cta={{ label: 'Invite supervisor', onClick: () => setInviteOpen(true) }}
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
        searchPlaceholder="Search supervisors"
        count={supervisorsCount(shown, filter)}
        foot="Invitations expire after 7 days. Resending issues a fresh link."
        actions={<TableAction label="Manage permissions" onClick={() => setPermissionsOpen(true)} />}
        emptyLine="No supervisors match this search."
      />
    );
  };

  return (
    <div className="flex min-h-full flex-col text-[13px] text-[#38312B] [line-height:normal]">
      <OverviewHeader title="Supervisors" subtitle={supervisorsSubtitle(rows)} now={now} actions={rows.length ? headerActions : null} />
      <div className="flex flex-auto flex-col gap-[18px] bg-[#FDFCFB] px-7 pb-10 pt-[22px] max-[859px]:gap-3.5 max-[859px]:px-3.5 max-[859px]:pb-[84px] max-[859px]:pt-4">{body()}</div>

      <InviteSupervisorModal
        open={inviteOpen}
        roles={roleChoices}
        branchName={branchName}
        onClose={() => setInviteOpen(false)}
        onInvited={(email) => {
          setInviteOpen(false);
          show(`Invitation sent to ${email}`);
        }}
      />
      <ManagePermissionsModal
        open={permissionsOpen}
        roles={roleChoices}
        onClose={() => setPermissionsOpen(false)}
        onSaved={() => {
          setPermissionsOpen(false);
          show('Permissions updated');
        }}
      />
      <ScheduleToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
