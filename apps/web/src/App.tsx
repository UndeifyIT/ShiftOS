import React, { Suspense, lazy, useRef } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { SkeletonRows, Spinner } from '@shiftos/ui';
import { useSession } from './auth/SessionProvider.js';
import { AppShell } from './layout/AppShell.js';
import { ErrorState } from '@shiftos/ui';
import { useRpcQuery } from './lib/useRpc.js';
import type { Branch } from './types/domain.js';

const LandingPage = lazy(() => import('./pages/marketing/LandingPage.js'));
const FeaturesPage = lazy(() => import('./pages/marketing/FeaturesPage.js'));
const SolutionsPage = lazy(() => import('./pages/marketing/SolutionsPage.js'));
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
const OnboardingWizard = lazy(() => import('./pages/onboarding/OnboardingWizard.js'));
const OrganizationStep = lazy(() => import('./pages/onboarding/steps/OrganizationStep.js'));
// Named export, not default — the shell is shared by OnboardingWizard.tsx's
// own already-lazy chunk too, so re-wrap it here rather than importing it
// eagerly (which would pull Shifty's mascot image assets into the main bundle).
const OnboardingWizardShell = lazy(() =>
  import('./pages/onboarding/OnboardingWizardShell.js').then((mod) => ({ default: mod.OnboardingWizardShell }))
);

const RoleDashboard = lazy(() => import('./pages/dashboard/RoleDashboard.js'));
const AdminConsolePage = lazy(() => import('./pages/admin/AdminConsolePage.js'));
const AnnouncementsPage = lazy(() => import('./pages/announcements/AnnouncementsPage.js'));
const RequestsPage = lazy(() => import('./pages/requests/RequestsPage.js'));
const OrganizationSettingsPage = lazy(() => import('./pages/organization/OrganizationSettingsPage.js'));
const BranchListPage = lazy(() => import('./pages/branches/BranchListPage.js'));
const BranchDetailPage = lazy(() => import('./pages/branches/BranchDetailPage.js'));
const EmployeeDirectoryPage = lazy(() => import('./pages/employees/EmployeeDirectoryPage.js'));
const EmployeeProfilePage = lazy(() => import('./pages/employees/EmployeeProfilePage.js'));
const AddEmployeePage = lazy(() => import('./pages/employees/AddEmployeePage.js'));
const ImportEmployeesPage = lazy(() => import('./pages/employees/import/ImportEmployeesPage.js'));
const MembersPage = lazy(() => import('./pages/members/MembersPage.js'));
const InvitationsPage = lazy(() => import('./pages/members/InvitationsPage.js'));
const SchedulesPage = lazy(() => import('./pages/scheduling/SchedulesPage.js'));
const ProfilePage = lazy(() => import('./pages/account/ProfilePage.js'));
const SecurityPage = lazy(() => import('./pages/account/SecurityPage.js'));
const ComingSoonPage = lazy(() => import('./pages/placeholder/ComingSoonPage.js'));
const TasksPage = lazy(() => import('./pages/tasks/TasksPage.js'));
const AttendancePage = lazy(() => import('./pages/attendance/AttendancePage.js'));

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
 * organization, not every org that predates the onboardingCompletedAt
 * metadata flag. For a *new-flow* org (one whose metadata carries
 * `onboardingStartedAt`, stamped by OrganizationStep.tsx on creation), the
 * wizard must stay reachable regardless of branch count until
 * `onboardingCompletedAt` is set — otherwise the Branch step's own
 * create_branch call (its first action) would flip `list_branches` non-empty
 * mid-wizard and eject the user to the dashboard before
 * Supervisor/Departments/Finish ever run, and worse, permanently: this gate
 * re-evaluates fresh on every mount (including a page reload), so without
 * the onboardingStartedAt signal a reload after the Branch step would look
 * identical to a legacy org that finished setup long ago. The branch-count
 * heuristic below is retained only for legacy orgs (no onboardingStartedAt),
 * which predate this flag and have no other signal to distinguish "done"
 * from "needs onboarding."
 */
function OnboardingGate(): React.ReactElement {
  const { activeOrganization } = useSession();
  const isNewFlowOrg = Boolean(activeOrganization?.metadata?.onboardingStartedAt);
  const { data: branches, isLoading, refetch } = useRpcQuery<Branch[]>('list_branches');
  // Decided once, on this gate's first successful load, and never
  // re-evaluated after that (see the comment above for why a new-flow org
  // must never fall back to the branch-count heuristic mid-wizard).
  const alreadySetUpRef = useRef<boolean | null>(null);
  // A legacy org's very first list_branches read has been observed
  // (intermittently, both for an established org and for a brand-new
  // invitee's first-ever login) to sometimes come back empty even when the
  // org genuinely already has branches — a client-side bootstrap-timing
  // issue, not a data problem (verified directly against the database in
  // both cases this was caught). Since wrongly locking in "not set up" here
  // sends an already-onboarded org/user into the setup wizard, a first
  // empty read for a legacy org gets one free refetch before being trusted.
  const retriedEmptyReadRef = useRef(false);
  if (alreadySetUpRef.current === null && !isLoading && branches) {
    if (isNewFlowOrg) {
      alreadySetUpRef.current = false;
    } else if (branches.length > 0 || retriedEmptyReadRef.current) {
      alreadySetUpRef.current = branches.length > 0;
    } else {
      retriedEmptyReadRef.current = true;
      void refetch();
    }
  }

  if (isLoading || alreadySetUpRef.current === null) {
    // Keep the wizard shell visible (sidebar/progress/Shifty panel) instead
    // of a bare full-page spinner, so the transition from OrganizationStep's
    // refresh() into this gate's own list_branches load doesn't flash a
    // second, fully-unmounted loading state right after the first one in
    // App()'s status === 'loading' branch.
    return (
      <OnboardingWizardShell currentStep="Branch">
        <SkeletonRows rows={3} />
      </OnboardingWizardShell>
    );
  }
  if (alreadySetUpRef.current) {
    return <AppShellRoutes />;
  }
  return <OnboardingWizard />;
}

export function App(): React.ReactElement {
  const { status, errorMessage, refresh, activeOrganization, myContext } = useSession();

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
          <Route path="/solutions" element={<SolutionsPage />} />
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
        <Routes>
          <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
          <Route path="*" element={<CompleteProfilePage />} />
        </Routes>
      </SuspenseRoute>
    );
  }

  if (status === 'no-organization') {
    return (
      <SuspenseRoute>
        <OnboardingWizardShell currentStep="Organization">
          <OrganizationStep />
        </OnboardingWizardShell>
      </SuspenseRoute>
    );
  }

  // Onboarding only ever applies to the org-wide Owner/Manager who created
  // this organization (SignUpPage.tsx: "the person who signs up here always
  // becomes the org Owner" — there is no other path to organization
  // creation). An invited Supervisor/Employee joins a pre-existing
  // organization and must never be routed into "set up your organization,"
  // no matter what onboardingCompletedAt/branch state looks like: they
  // didn't create it, typically lack the permissions (e.g. branches.read)
  // the legacy branch-count heuristic below depends on, and would see a
  // wizard for a setup step they have no way to complete.
  const isOrgWideMember = myContext?.branchAccess.isOrgWide ?? false;
  if (status === 'ready' && isOrgWideMember && !activeOrganization?.metadata?.onboardingCompletedAt) {
    return (
      <SuspenseRoute>
        <Routes>
          {/*
           * The Branch step's "Back" button (OnboardingWizard.tsx) has
           * nowhere else to go — Organization is a different, separately
           * gated component (OrganizationStep, above) that never remounts
           * once the organization exists. Carving out this one route lets
           * a mid-onboarding org-wide member revisit/edit what they entered
           * there without exposing the rest of AppShellRoutes (whose nav
           * assumes setup is finished).
           */}
          <Route path="/organization" element={<OnboardingWizardShell currentStep="Organization"><OrganizationSettingsPage /></OnboardingWizardShell>} />
          <Route path="*" element={<OnboardingGate />} />
        </Routes>
      </SuspenseRoute>
    );
  }

  return (
    <SuspenseRoute>
      <AppShellRoutes />
    </SuspenseRoute>
  );
}

function EmployeeEditRedirect(): React.ReactElement {
  const { employeeId = '' } = useParams<{ employeeId: string }>();
  return <Navigate to={`/employees/${employeeId}`} replace />;
}

function AppShellRoutes(): React.ReactElement {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<RoleDashboard />} />
        <Route path="/admin" element={<AdminConsolePage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route path="/requests" element={<RequestsPage />} />
        <Route path="/organization" element={<OrganizationSettingsPage />} />
        <Route path="/branches" element={<BranchListPage />} />
        <Route path="/branches/new" element={<BranchDetailPage />} />
        <Route path="/branches/:branchId" element={<BranchDetailPage />} />
        <Route path="/employees" element={<EmployeeDirectoryPage />} />
        <Route path="/employees/new" element={<AddEmployeePage />} />
        <Route path="/employees/import" element={<ImportEmployeesPage />} />
        <Route path="/employees/:employeeId" element={<EmployeeProfilePage />} />
        {/* The profile's Employee Details tab is the edit form (design handoff), so the old edit route lands there. */}
        <Route path="/employees/:employeeId/edit" element={<EmployeeEditRedirect />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/invitations" element={<InvitationsPage />} />
        <Route path="/schedules" element={<SchedulesPage />} />
        {/* Creating a week is now one click from the Schedules empty state (design handoff), so the old create form route lands there. */}
        <Route path="/schedules/new" element={<Navigate to="/schedules" replace />} />
        <Route path="/schedules/:scheduleId" element={<SchedulesPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/supervisors" element={<ComingSoonPage page="supervisors" />} />
        <Route path="/admins" element={<ComingSoonPage page="admins" />} />
        <Route path="/recent-activity" element={<ComingSoonPage page="recentActivity" />} />
        <Route path="/reports" element={<ComingSoonPage page="reports" />} />
        <Route path="/settings" element={<ComingSoonPage page="settings" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
