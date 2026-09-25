import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PermissionDenied } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { HandoffModal, ModalField, ModalFields, modalControl, modalSelect } from '../../components/HandoffModal.js';
import { downloadText, toCsv } from '../../lib/spreadsheet.js';
import { useRpcMutation } from '../../lib/useRpc.js';
import { OverviewEmpty, OverviewHeader, OverviewLoading } from '../dashboard/manager/ManagerOverview.js';
import { useManagerOverview } from '../dashboard/manager/useManagerOverview.js';
import { HeaderCta, RolePeopleTable, TableAction } from '../people/RolePeopleTable.js';
import { ScheduleToast, useScheduleToast } from '../scheduling/grid/ScheduleToast.js';
import { fullName, todayDateString } from '../scheduling/grid/scheduleFormat.js';
import { buildTeamRows, filterTeam, TEAM_FILTERS, teamCsv, type TeamFilter } from './teamModel.js';

/*
 * The Supervisor's Team page, built to the design handoff
 * (`ShiftOS Dashboards.dc.html`: `PAGES["Supervisor/Team"]` in the shared
 * toolbar + table markup, lines 363-407, and the addTeam dialog). Everyone
 * assigned to the branch, where they are right now and their hours this week.
 */

export default function TeamPage(): React.ReactElement {
  const navigate = useNavigate();
  const { hasPermission, profile } = useSession();
  const { status, now, branch, overview } = useManagerOverview();
  const { toast, show, dismiss } = useScheduleToast();
  const [filter, setFilter] = useState<TeamFilter>('All');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const update = useRpcMutation('update_employee', { invalidates: ['list_employees'] });

  if (!hasPermission('employees.read')) {
    return (
      <div className="px-7 py-6">
        <PermissionDenied />
      </div>
    );
  }

  const branchName = branch?.name ?? 'Your branch';
  const me = overview?.detail.employees.find((e) => e.email && profile?.email && e.email.toLowerCase() === profile.email.toLowerCase());
  const rows = overview ? buildTeamRows(overview, now, me?.id) : [];
  const shown = filterTeam(rows, filter, query);
  const canAdd = hasPermission('employees.update');
  const candidates = rows.filter((row) => !me || row.employee.reports_to_employee_id !== me.id);
  const departments = (overview?.detail.departments ?? []).filter((d) => d.is_active && !d.deleted_at);

  const openAdd = (): void => {
    setEmployeeId('');
    setDepartmentId('');
    setAdding(true);
  };

  // Adding someone to your team files them under a department and, when you have an employee record yourself, under you.
  const add = (): void => {
    update.mutate(
      { employeeId, departmentId, ...(me ? { reportsToEmployeeId: me.id } : {}) },
      {
        onSuccess: () => {
          setAdding(false);
          show('Added to your team');
        },
        onError: (error) => show(error.message || "Couldn't add them to your team", 'error')
      }
    );
  };

  const exportCsv = (): void => {
    downloadText(`shiftos-team-${todayDateString(now)}.csv`, toCsv(teamCsv(shown)));
    show(`Export ready · ${shown.length} ${shown.length === 1 ? 'person' : 'people'}`);
  };

  const body = (): React.ReactNode => {
    if (status === 'loading') return <OverviewLoading title="Team" />;
    if (rows.length === 0) {
      return (
        <OverviewEmpty
          title="Nobody assigned yet"
          body={`Your branch has no team members. Ask a manager to assign employees to ${branchName}.`}
          cta={hasPermission('employees.create') ? { label: 'Add employee', onClick: () => navigate('/employees/new') } : null}
          secondary={{ label: 'View schedule', onClick: () => navigate('/schedules') }}
        />
      );
    }
    return (
      <RolePeopleTable
        columns={['Team member', 'Department', 'Shift', 'Hours', 'Status']}
        filters={TEAM_FILTERS}
        rows={shown}
        filter={filter}
        onFilter={setFilter}
        query={query}
        onQuery={setQuery}
        searchPlaceholder="Search your team"
        count={`${shown.length} of ${rows.length} shown`}
        foot={`You can see and manage only the people assigned to ${branchName}.`}
        actions={<TableAction label="Export" onClick={exportCsv} />}
        emptyLine="Nobody matches this filter."
      />
    );
  };

  return (
    <div className="flex min-h-full flex-col text-[13px] text-[#38312B] [line-height:normal]">
      <OverviewHeader
        title="Team"
        subtitle={`${branchName} · ${rows.length} ${rows.length === 1 ? 'person' : 'people'}`}
        now={now}
        actions={canAdd && rows.length > 0 ? <HeaderCta label="Add to team" onClick={openAdd} /> : null}
      />
      <div className="flex flex-auto flex-col gap-[18px] bg-[#FDFCFB] px-7 pb-10 pt-[22px] max-[859px]:gap-3.5 max-[859px]:px-3.5 max-[859px]:pb-[84px] max-[859px]:pt-4">{body()}</div>

      <HandoffModal
        open={adding}
        title="Add to team"
        subtitle={`Pick from employees already in ${branchName}.`}
        primary={update.isPending ? 'Adding…' : 'Add to team'}
        primaryDisabled={!employeeId || !departmentId || update.isPending}
        onPrimary={add}
        onClose={() => setAdding(false)}
      >
        <ModalFields>
          <ModalField label="Employee" required>
            <select
              className={modalSelect}
              value={employeeId}
              onChange={(event) => {
                setEmployeeId(event.target.value);
                setDepartmentId(rows.find((r) => r.employee.id === event.target.value)?.employee.department_id ?? '');
              }}
            >
              <option value="">Search employees…</option>
              {candidates.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name} · {row.sub}
                </option>
              ))}
            </select>
          </ModalField>
          <ModalField label="Department" required>
            <select className={modalSelect} value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
              <option value="">Choose a department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </ModalField>
          <ModalField label="Reports to">
            <input className={modalControl} value={me ? `${fullName(me)} (you)` : 'Their department'} readOnly />
          </ModalField>
        </ModalFields>
      </HandoffModal>
      <ScheduleToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
