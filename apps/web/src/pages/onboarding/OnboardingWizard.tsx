import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, FormField, InlineError, Input, SkeletonRows } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcMutation, useRpcQuery } from '../../lib/useRpc.js';
import { ShiftyMascot } from '../../components/shifty/mascot.js';
import { OnboardingWizardShell, type OnboardingStepId } from './OnboardingWizardShell.js';
import type { Branch, Invitation, Organization, Role } from '../../types/domain.js';

const STEPS = ['branch', 'supervisor', 'departments', 'finish'] as const;
type Step = (typeof STEPS)[number];

/** Maps this wizard's local step ids onto the shared shell's 5-step ids (Task 1's `OnboardingWizardShell`). */
const SHELL_STEP: Record<Step, OnboardingStepId> = {
  branch: 'Branch',
  supervisor: 'Supervisor',
  departments: 'Department',
  finish: 'Finish'
};

/**
 * Runs after create_organization_with_owner succeeds but before the normal
 * AppShell — gated in App.tsx by organization.metadata.onboardingCompletedAt
 * (set by FinishStep via the existing update_organization RPC). Branch and
 * Supervisor steps use real RPCs; Departments is an honest not-yet-connected
 * state (no backend table exists — Tier 3 per the frontend foundation doc).
 *
 * The Organization step (design's first of 5 steps) isn't wired here yet —
 * it's created by a separate route branch (`no-organization` in App.tsx,
 * Task 2) that mounts the same `OnboardingWizardShell`. This wizard only
 * covers Branch → Supervisor → Department → Finish.
 */
export default function OnboardingWizard(): React.ReactElement {
  const { refresh } = useSession();
  const [step, setStep] = useState<Step>('branch');

  return (
    <OnboardingWizardShell currentStep={SHELL_STEP[step]}>
      {step === 'branch' ? <BranchStep onNext={() => setStep('supervisor')} /> : null}
      {step === 'supervisor' ? <SupervisorStep onNext={() => setStep('departments')} onBack={() => setStep('branch')} /> : null}
      {step === 'departments' ? <DepartmentsStep onNext={() => setStep('finish')} onBack={() => setStep('supervisor')} /> : null}
      {step === 'finish' ? <FinishStep onFinish={() => void refresh()} /> : null}
    </OnboardingWizardShell>
  );
}

function BranchStep({ onNext }: { onNext: () => void }): React.ReactElement {
  const { data: branches, isLoading } = useRpcQuery<Branch[]>('list_branches');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useRpcMutation<Branch, { name: string; address?: string | null }>('create_branch', {
    invalidates: ['list_branches'],
    onSuccess: onNext,
    onError: (err) => setError(err.message)
  });

  if (isLoading) {
    return <SkeletonRows rows={3} />;
  }

  if (branches && branches.length > 0) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-neutral-900">Your first branch is set up</h2>
          <p className="mt-1 text-sm text-neutral-500">{branches[0]!.name} is ready to go.</p>
        </div>
        <Button className="self-start" onClick={onNext}>
          Continue
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) {
          setError('Branch name is required.');
          return;
        }
        setError(null);
        createMutation.mutate({ name: name.trim(), address: address.trim() || null });
      }}
      className="flex flex-col gap-4"
    >
      <div>
        <h2 className="font-display text-xl font-semibold text-neutral-900">Set up your first branch</h2>
        <p className="mt-1 text-sm text-neutral-500">Branches let you organize schedules and staff by location.</p>
      </div>
      <FormField label="Branch name" htmlFor="branchName" required>
        {(fieldProps) => <Input {...fieldProps} value={name} onChange={(e) => setName(e.target.value)} placeholder="Main Branch" />}
      </FormField>
      <FormField label="Address" htmlFor="branchAddress">
        {(fieldProps) => <Input {...fieldProps} value={address} onChange={(e) => setAddress(e.target.value)} />}
      </FormField>
      {error ? <InlineError message={error} /> : null}
      <Button type="submit" loading={createMutation.isPending} className="self-start">
        Create branch
      </Button>
    </form>
  );
}

function SupervisorStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }): React.ReactElement {
  const { data: branches } = useRpcQuery<Branch[]>('list_branches');
  const branchId = branches?.[0]?.id;
  const { data: invitableRoles } = useRpcQuery<Role[]>('list_invitable_roles');
  const supervisorRole = invitableRoles?.find((r) => r.name.toLowerCase() === 'supervisor');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [invited, setInvited] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inviteMutation = useRpcMutation<
    Invitation,
    { email: string; firstName: string; lastName: string; roleId: string; branchIds: string[] }
  >('invite_member', {
    invalidates: ['list_invitations'],
    onSuccess: () => setInvited(true),
    onError: (err) => setError(err.message)
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-xl font-semibold text-neutral-900">Add your first supervisor</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Send them a real invitation by email. They&rsquo;ll set their own password and sign in as a Supervisor scoped to this branch.
        </p>
      </div>

      {invited ? (
        <div className="rounded-xl bg-success-50 p-4 text-sm text-success-text">
          An invitation has been sent to {email}. {firstName} will become a Supervisor once they accept it.
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!branchId) {
              setError('Create a branch first.');
              return;
            }
            if (!supervisorRole) {
              setError('The Supervisor role is not set up for this organization yet.');
              return;
            }
            if (!firstName.trim() || !lastName.trim() || !email.trim()) {
              setError('First name, last name, and email are required.');
              return;
            }
            setError(null);
            inviteMutation.mutate({
              email: email.trim(),
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              roleId: supervisorRole.id,
              branchIds: [branchId]
            });
          }}
          className="flex flex-col gap-4"
        >
          <FormField label="First name" htmlFor="supFirstName" required>
            {(fieldProps) => <Input {...fieldProps} value={firstName} onChange={(e) => setFirstName(e.target.value)} />}
          </FormField>
          <FormField label="Last name" htmlFor="supLastName" required>
            {(fieldProps) => <Input {...fieldProps} value={lastName} onChange={(e) => setLastName(e.target.value)} />}
          </FormField>
          <FormField label="Email" htmlFor="supEmail" required hint="We'll send a real invitation to this address.">
            {(fieldProps) => <Input {...fieldProps} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
          </FormField>
          {error ? <InlineError message={error} /> : null}
          <Button type="submit" loading={inviteMutation.isPending} className="self-start">
            Send invitation
          </Button>
        </form>
      )}

      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm font-medium text-neutral-500 hover:text-neutral-700">
          Back
        </button>
        <Button variant={invited ? 'primary' : 'ghost'} onClick={onNext}>
          {invited ? 'Continue' : 'Skip for now'}
        </Button>
      </div>
    </div>
  );
}

function DepartmentsStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }): React.ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-xl font-semibold text-neutral-900">Departments</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Organizing staff into departments isn&rsquo;t available yet — today, ShiftOS organizes your team by branch. Department support is
          planned for a future update.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-sm text-neutral-500">Coming soon</div>
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm font-medium text-neutral-500 hover:text-neutral-700">
          Back
        </button>
        <Button onClick={onNext}>Continue</Button>
      </div>
    </div>
  );
}

function FinishStep({ onFinish }: { onFinish: () => void }): React.ReactElement {
  const { activeOrganization } = useSession();
  const [error, setError] = useState<string | null>(null);

  const completeMutation = useRpcMutation<Organization, { metadata: Record<string, unknown> }>('update_organization', {
    onSuccess: onFinish,
    onError: (err) => setError(err.message)
  });

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <span className="flex size-20 items-end justify-center overflow-hidden rounded-2xl bg-success-50">
        <ShiftyMascot variant="success" className="h-[88%] w-full" />
      </span>
      <h2 className="font-display text-xl font-semibold text-neutral-900">You&rsquo;re all set!</h2>
      <p className="text-sm text-neutral-500">
        {activeOrganization?.name ?? 'Your organization'} is ready. You can add more team members and refine settings anytime from your
        dashboard.
      </p>
      {error ? <InlineError message={error} /> : null}
      <Button
        loading={completeMutation.isPending}
        onClick={() =>
          completeMutation.mutate({
            metadata: { ...(activeOrganization?.metadata ?? {}), onboardingCompletedAt: new Date().toISOString() }
          })
        }
      >
        Go to dashboard
      </Button>

      <div className="mt-2 w-full border-t border-neutral-200 pt-4 text-left">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">Good next steps</p>
        <div className="flex flex-col gap-2">
          <Link
            to="/schedules"
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
          >
            Create your first schedule
          </Link>
          <Link
            to="/employees"
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
          >
            Add your first employee
          </Link>
        </div>
      </div>
    </div>
  );
}
