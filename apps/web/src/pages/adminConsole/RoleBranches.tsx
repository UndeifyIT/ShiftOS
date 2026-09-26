import React, { lazy } from 'react';
import { useNavRole } from '../../layout/Sidebar.js';

const AdminBranchesPage = lazy(() => import('./AdminBranchesPage.js'));
const AdminBranchDetailPage = lazy(() => import('./AdminBranchDetailPage.js'));
const BranchListPage = lazy(() => import('../branches/BranchListPage.js'));
const BranchDetailPage = lazy(() => import('../branches/BranchDetailPage.js'));

/** /branches by role: the Admin console's Branches; everyone else keeps the branch list and form. */
export function RoleBranchList(): React.ReactElement {
  return useNavRole() === 'Admin' ? <AdminBranchesPage /> : <BranchListPage />;
}

/** /branches/:branchId by role: the Admin console's read-only Branch Detail; everyone else keeps the branch form. */
export function RoleBranchDetail(): React.ReactElement {
  return useNavRole() === 'Admin' ? <AdminBranchDetailPage /> : <BranchDetailPage />;
}
