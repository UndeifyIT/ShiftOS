import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Button, Card, FormField, InlineError, Input, SkeletonRows } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcMutation, useRpcQuery } from '../../lib/useRpc.js';
import { Shifty } from '../../components/shifty/Shifty.js';
import { ShiftyMascot, ShiftyPanel } from '../../components/shifty/mascot.js';
import type { Branch, Employee, Organization } from '../../types/domain.js';

const STEPS = ['branch', 'supervisor', 'departments', 'finish'] as const;
type Step = (typeof STEPS)[number];

const STEP_GUIDANCE: Record<Step, { title: string; message: string; variant: 'wave' | 'guide' | 'success' }> = {
  branch: { title: 'Set up your branch', message: 'Branches are how ShiftOS organizes locations, schedules, and staff. You can add more later.', variant: 'wave' },
  supervisor: {
    title: 'Add a supervisor',
    message: "You can add your first supervisor as a team member now. Giving them their own sign-in requires invitations, which aren't available yet.",
    variant: 'guide'
  },
  departments: { title: 'Departments', message: "Department support isn't built yet — for now, ShiftOS organizes your team by branch.", variant: 'guide' },
  finish: { title: "You're almost done", message: 'Once you finish, you will land on your real dashboard with live data.', variant: 'success' }
};

/**
 * Runs after create_organization_with_owner succeeds but before the normal
 * AppShell — gated in App.tsx by organization.metadata.onboardingCompletedAt
 * (set by FinishStep via the existing update_organization RPC). Branch and
 * Supervisor steps use real RPCs; Departments is an honest not-yet-connected
 * state (no backend table exists — Tier 3 per the frontend foundation doc).
 */
export default function OnboardingWizard(): React.ReactElement {
  const { refresh } = useSession();
  const [step, setStep] = useState<Step>('branch');
  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-base font-bold text-white">S</span>
          <span className="text-xl font-bold text-neutral-900">ShiftOS</span>
        </div>

        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((s, index) => (
            <React.Fragment key={s}>
              <div
                className={[
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                  index < stepIndex ? 'bg-success-500 text-white' : index === stepIndex ? 'bg-brand-500 text-white' : 'bg-neutral-200 text-neutral-500'
                ].join(' ')}
              >
                {index < stepIndex ? <Check size={14} /> : index + 1}
              </div>
              {index < STEPS.length - 1 ? (
                <div className={['h-0.5 w-8', index < stepIndex ? 'bg-success-500' : 'bg-neutral-200'].join(' ')} />
              ) : null}
            </React.Fragment>
          ))}
        </div>

        <Card className="p-8">
          <ShiftyPanel variant={STEP_GUIDANCE[step].variant} message={STEP_GUIDANCE[step].message} className="mb-6" />
          {step === 'branch' ? <BranchStep onNext={() => setStep('supervisor')} /> : null}
          {step === 'supervisor' ? <SupervisorStep onNext={() => setStep('departments')} onBack={() => setStep('branch')} /> : null}
          {step === 'departments' ? <DepartmentsStep onNext={() => setStep('finish')} onBack={() => setStep('supervisor')} /> : null}
          {step === 'finish' ? <FinishStep onFinish={() => void refresh()} /> : null}
        </Card>
      </div>

      <Shifty step={STEP_GUIDANCE[step]} suggestedPrompts={['What is a branch?', 'How do invitations work?']} />
    </div>
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
          <h2 className="text-xl font-bold text-neutral-900">Your first branch is set up</h2>
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
        <h2 className="text-xl font-bold text-neutral-900">Set up your first branch</h2>
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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useRpcMutation<Employee, Record<string, unknown>>('create_employee', {
    invalidates: ['list_employees'],
    onSuccess: () => setAdded(true),
    onError: (err) => setError(err.message)
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-neutral-900">Add your first supervisor</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Add them as a team member now. Inviting them to sign in themselves isn&rsquo;t available yet — account invitations are a backend
          capability still being built.
        </p>
      </div>

      {added ? (
        <div className="rounded-xl bg-success-50 p-4 text-sm text-success-text">
          {firstName} {lastName} has been added to your team.
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!branchId) {
              setError('Create a branch first.');
              return;
            }
            if (!firstName.trim() || !lastName.trim()) {
              setError('First and last name are required.');
              return;
            }
            setError(null);
            createMutation.mutate({
              branchId,
              employeeNumber: `EMP-${Date.now().toString().slice(-6)}`,
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              email: email.trim() || undefined,
              hireDate: new Date().toISOString().slice(0, 10)
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
          <FormField label="Email" htmlFor="supEmail" hint="For your records — account invitations aren't available yet.">
            {(fieldProps) => <Input {...fieldProps} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
          </FormField>
          {error ? <InlineError message={error} /> : null}
          <Button type="submit" loading={createMutation.isPending} className="self-start">
            Add supervisor
          </Button>
        </form>
      )}

      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm font-medium text-neutral-500 hover:text-neutral-700">
          Back
        </button>
        <Button variant={added ? 'primary' : 'ghost'} onClick={onNext}>
          {added ? 'Continue' : 'Skip for now'}
        </Button>
      </div>
    </div>
  );
}

function DepartmentsStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }): React.ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-neutral-900">Departments</h2>
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
      <h2 className="text-xl font-bold text-neutral-900">You&rsquo;re all set!</h2>
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
    </div>
  );
}
