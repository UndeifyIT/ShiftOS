import React from 'react';
import { useNavRole } from '../../layout/Sidebar.js';
import ManagerDashboardPage from './ManagerDashboardPage.js';
import SupervisorDashboardPage from './SupervisorDashboardPage.js';
import MyShiftPage from '../staff/MyShiftPage.js';
import AdminOverviewPage from '../adminConsole/AdminOverviewPage.js';

/**
 * The home page for each of the handoff's experiences, picked by real
 * capability signals (useNavRole — never a role-name check): org-wide access
 * is the Manager's overview; a member-managing role that runs no operations is
 * the Admin console's Overview; a role that runs schedules or the team is the
 * Supervisor's Today's Shift; anyone else gets Staff's My Shift.
 */
export default function RoleDashboard(): React.ReactElement {
  const role = useNavRole();
  if (role === 'Manager') return <ManagerDashboardPage />;
  if (role === 'Admin') return <AdminOverviewPage />;
  if (role === 'Supervisor') return <SupervisorDashboardPage />;
  return <MyShiftPage />;
}
