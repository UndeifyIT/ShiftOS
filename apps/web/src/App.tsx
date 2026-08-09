import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Spinner } from '@shiftos/ui';
import { useSession } from './auth/SessionProvider.js';
import { AppShell } from './layout/AppShell.js';
import { ErrorState } from '@shiftos/ui';

const SignInPage = lazy(() => import('./pages/auth/SignInPage.js'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage.js'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage.js'));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage.js'));
const AcceptInvitationPage = lazy(() => import('./pages/auth/AcceptInvitationPage.js'));
const CompleteProfilePage = lazy(() => import('./pages/auth/CompleteProfilePage.js'));
const OrganizationSetupPage = lazy(() => import('./pages/onboarding/OrganizationSetupPage.js'));

const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage.js'));
const OrganizationSettingsPage = lazy(() => import('./pages/organization/OrganizationSettingsPage.js'));
const BranchListPage = lazy(() => import('./pages/branches/BranchListPage.js'));
const BranchDetailPage = lazy(() => import('./pages/branches/BranchDetailPage.js'));
const EmployeeDirectoryPage = lazy(() => import('./pages/employees/EmployeeDirectoryPage.js'));
const EmployeeDetailPage = lazy(() => import('./pages/employees/EmployeeDetailPage.js'));
const EmployeeFormPage = lazy(() => import('./pages/employees/EmployeeFormPage.js'));
const MembersPage = lazy(() => import('./pages/members/MembersPage.js'));
const InvitationsPage = lazy(() => import('./pages/members/InvitationsPage.js'));
const ScheduleListPage = lazy(() => import('./pages/scheduling/ScheduleListPage.js'));
const ScheduleBuilderPage = lazy(() => import('./pages/scheduling/ScheduleBuilderPage.js'));
const ProfilePage = lazy(() => import('./pages/account/ProfilePage.js'));
const SecurityPage = lazy(() => import('./pages/account/SecurityPage.js'));

function FullPageSpinner(): React.ReactElement {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner size={28} label="Loading ShiftOS" />
    </div>
  );
}

function SuspenseRoute({ children }: { children: React.ReactNode }): React.ReactElement {
  return <Suspense fallback={<FullPageSpinner />}>{children}</Suspense>;
}

export function App(): React.ReactElement {
  const { status, errorMessage, refresh } = useSession();

  if (status === 'loading') {
    return <FullPageSpinner />;
  }

  if (status === 'error') {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <ErrorState description={errorMessage ?? undefined} onRetry={() => void refresh()} />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <SuspenseRoute>
        <Routes>
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
          <Route path="*" element={<Navigate to="/sign-in" replace />} />
        </Routes>
      </SuspenseRoute>
    );
  }

  if (status === 'no-profile') {
    return (
      <SuspenseRoute>
        <CompleteProfilePage />
      </SuspenseRoute>
    );
  }

  if (status === 'no-organization') {
    return (
      <SuspenseRoute>
        <OrganizationSetupPage />
      </SuspenseRoute>
    );
  }

  return (
    <SuspenseRoute>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/organization" element={<OrganizationSettingsPage />} />
          <Route path="/branches" element={<BranchListPage />} />
          <Route path="/branches/new" element={<BranchDetailPage />} />
          <Route path="/branches/:branchId" element={<BranchDetailPage />} />
          <Route path="/employees" element={<EmployeeDirectoryPage />} />
          <Route path="/employees/new" element={<EmployeeFormPage />} />
          <Route path="/employees/:employeeId" element={<EmployeeDetailPage />} />
          <Route path="/employees/:employeeId/edit" element={<EmployeeFormPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/invitations" element={<InvitationsPage />} />
          <Route path="/schedules" element={<ScheduleListPage />} />
          <Route path="/schedules/new" element={<ScheduleBuilderPage />} />
          <Route path="/schedules/:scheduleId" element={<ScheduleBuilderPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </SuspenseRoute>
  );
}
