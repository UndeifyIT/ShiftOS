import React from 'react';
import { useSession } from '../../auth/SessionProvider.js';
import ManagerDashboardPage from './ManagerDashboardPage.js';
import SupervisorDashboardPage from './SupervisorDashboardPage.js';
import EmployeeDashboardPage from './EmployeeDashboardPage.js';

const SUPERVISOR_SIGNAL_PERMISSIONS = ['employees.create', 'employees.update', 'schedules.create', 'branches.update'];

/**
 * Picks Manager / Supervisor / Employee by real capability signals from
 * ApplicationContext (never a role-name check, per task §21/§9): org-wide
 * branch access means Manager; branch-scoped access with at least one
 * management permission means Supervisor; anything else (read-only or no
 * management permission) means Staff. Today only the "Owner" role exists out
 * of the box (no create_role RPC yet — see the final gap report), so in
 * practice every live organization currently lands on the Manager dashboard;
 * this still resolves correctly the moment additional roles exist.
 */
export default function RoleDashboard(): React.ReactElement {
  const { myContext } = useSession();
  const isOrgWide = myContext?.branchAccess.isOrgWide ?? false;
  const hasBranchAccess = (myContext?.branchAccess.branchIds.length ?? 0) > 0;
  const hasSupervisorSignal = SUPERVISOR_SIGNAL_PERMISSIONS.some((permission) => myContext?.permissions.includes(permission));

  if (isOrgWide) {
    return <ManagerDashboardPage />;
  }
  if (hasBranchAccess && hasSupervisorSignal) {
    return <SupervisorDashboardPage />;
  }
  return <EmployeeDashboardPage />;
}
