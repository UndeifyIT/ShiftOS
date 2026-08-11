import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Spinner } from '@shiftos/ui';
import { useSession } from './auth/SessionProvider.js';
import { AppShell } from './layout/AppShell.js';
import { ErrorState } from '@shiftos/ui';
import { useRpcQuery } from './lib/useRpc.js';
import type { Branch } from './types/domain.js';

const LandingPage = lazy(() => import('./pages/marketing/LandingPage.js'));
const FeaturesPage = lazy(() => import('./pages/marketing/FeaturesPage.js'));
const PricingPage = lazy(() => import('./pages/marketing/PricingPage.js'));
const ResourcesPage = lazy(() => import('./pages/marketing/ResourcesPage.js'));
const AboutPage = lazy(() => import('./pages/marketing/AboutPage.js'));
const DemoPage = lazy(() => import('./pages/marketing/DemoPage.js'));
const PrivacyPage = lazy(() => import('./pages/marketing/PrivacyPage.js'));
const TermsPage = lazy(() => import('./pages/marketing/TermsPage.js'));

const SignInPage = lazy(() => import('./pages/auth/SignInPage.js'));
const SignUpPage = lazy(() => import('./pages/auth/SignUpPage.js'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage.js'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage.js'));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage.js'));
const AcceptInvitationPage = lazy(() => import('./pages/auth/AcceptInvitationPage.js'));
const CompleteProfilePage = lazy(() => import('./pages/auth/CompleteProfilePage.js'));
const OrganizationSetupPage = lazy(() => import('./pages/onboarding/OrganizationSetupPage.js'));
const OnboardingWizard = lazy(() => import('./pages/onboarding/OnboardingWizard.js'));

const RoleDashboard = lazy(() => import('./pages/dashboard/RoleDashboard.js'));
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

/**
 * Guards the onboarding wizard so it only ever shows for a genuinely fresh
 * organization (no branches yet), not every org that predates the
 * onboardingCompletedAt metadata flag — an org that already has a branch
 * clearly finished setup under the old single-step flow.
 */
function OnboardingGate(): React.ReactElement {
  const { data: branches, isLoading } = useRpcQuery<Branch[]>('list_branches');

  if (isLoading) {
    return <FullPageSpinner />;
  }
  if (branches && branches.length > 0) {
    return <AppShellRoutes />;
  }
  return <OnboardingWizard />;
}

export function App(): React.ReactElement {
  const { status, errorMessage, refresh, activeOrganization } = useSession();

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
          <Route path="/" element={<LandingPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/request-demo" element={<DemoPage />} />
          <Route path="/demo" element={<Navigate to="/request-demo" replace />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
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

  if (status === 'ready' && !activeOrganization?.metadata?.onboardingCompletedAt) {
    return (
      <SuspenseRoute>
        <OnboardingGate />
      </SuspenseRoute>
    );
  }

  return (
    <SuspenseRoute>
      <AppShellRoutes />
    </SuspenseRoute>
  );
}

function AppShellRoutes(): React.ReactElement {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<RoleDashboard />} />
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
  );
}
