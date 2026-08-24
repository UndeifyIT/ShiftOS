import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Lock, X } from 'lucide-react';
import { Badge, Button, FormField, InlineError, Input, Select, SkeletonRows } from '@shiftos/ui';
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

/** Preset store-type options for the Branch step's Store Type field (settings.storeType). */
const STORE_TYPES = ['Supermarket', 'Convenience Store', 'Restaurant', 'Warehouse', 'Kitchen / Production', 'Office', 'Other'];

/**
 * Time zone options for the Branch step's Time Zone field (settings.timeZone).
 * Uses the runtime's own IANA tz database via Intl.supportedValuesOf — no new
 * dependency — falling back to a short static list on engines that predate it.
 */
function getTimeZoneOptions(): string[] {
  try {
    const supportedValuesOf = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
    if (typeof supportedValuesOf === 'function') {
      return supportedValuesOf('timeZone');
    }
  } catch {
    // fall through to the static fallback below
  }
  return [
    'Africa/Lagos',
    'Africa/Accra',
    'Africa/Nairobi',
    'Africa/Johannesburg',
    'Europe/London',
    'America/New_York',
    'America/Los_Angeles',
    'Asia/Dubai',
    'UTC'
  ];
}

function BranchStep({ onNext }: { onNext: () => void }): React.ReactElement {
  const { activeOrganization } = useSession();
  const { data: branches, isLoading } = useRpcQuery<Branch[]>('list_branches');

  const orgCountry = typeof activeOrganization?.metadata?.country === 'string' ? (activeOrganization.metadata.country as string) : '';
  const timeZoneOptions = useMemo(() => getTimeZoneOptions(), []);

  const [name, setName] = useState('');
  const [storeType, setStoreType] = useState('');
  const [country, setCountry] = useState(orgCountry);
  const [branchState, setBranchState] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [timeZone, setTimeZone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useRpcMutation<Branch, { name: string; address?: string | null; settings?: Record<string, unknown> }>(
    'create_branch',
    {
      invalidates: ['list_branches'],
      onSuccess: onNext,
      onError: (err) => setError(err.message)
    }
  );

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
        if (!name.trim() || !storeType || !country.trim() || !branchState.trim() || !city.trim() || !timeZone) {
          setError('Branch name, store type, country, state, city and time zone are required.');
          return;
        }
        setError(null);
        createMutation.mutate({
          name: name.trim(),
          address: address.trim() || null,
          settings: { storeType, state: branchState.trim(), city: city.trim(), timeZone }
        });
      }}
      className="flex flex-col gap-4"
    >
      <div>
        <h2 className="font-display text-xl font-semibold text-neutral-900">Set up your first branch</h2>
        <p className="mt-1 text-sm text-neutral-500">Branches let you organize schedules and staff by location.</p>
      </div>
      <FormField label="Branch name" htmlFor="branchName" required>
        {(fieldProps) => (
          <Input {...fieldProps} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Main Branch" />
        )}
      </FormField>
      <FormField label="Store type" htmlFor="branchStoreType" required>
        {(fieldProps) => (
          <Select
            {...fieldProps}
            value={storeType}
            onChange={(e) => setStoreType(e.target.value)}
            placeholder="Select store type"
            options={STORE_TYPES.map((label) => ({ value: label, label }))}
          />
        )}
      </FormField>
      <FormField
        label="Country"
        htmlFor="branchCountry"
        required
        hint={orgCountry ? "From your organization's settings." : undefined}
      >
        {(fieldProps) =>
          orgCountry ? (
            <Input {...fieldProps} value={country} disabled />
          ) : (
            <Input {...fieldProps} value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Nigeria" />
          )
        }
      </FormField>
      <FormField label="State" htmlFor="branchState" required>
        {(fieldProps) => (
          <Input {...fieldProps} value={branchState} onChange={(e) => setBranchState(e.target.value)} placeholder="Select state" />
        )}
      </FormField>
      <FormField label="City" htmlFor="branchCity" required>
        {(fieldProps) => <Input {...fieldProps} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Select city" />}
      </FormField>
      <FormField label="Branch address" htmlFor="branchAddress" hint="Optional — used on attendance records and shift notes.">
        {(fieldProps) => (
          <Input {...fieldProps} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter full address" />
        )}
      </FormField>
      <FormField label="Time zone" htmlFor="branchTimeZone" required>
        {(fieldProps) => (
          <Select
            {...fieldProps}
            value={timeZone}
            onChange={(e) => setTimeZone(e.target.value)}
            placeholder="Select time zone"
            options={timeZoneOptions.map((tz) => ({ value: tz, label: tz }))}
          />
        )}
      </FormField>
      {error ? <InlineError message={error} /> : null}
      <Button type="submit" loading={createMutation.isPending} className="self-start">
        Create branch
      </Button>
    </form>
  );
}

/**
 * Static, read-only mirror of the Supervisor role's fixed permission set
 * (design's `Supervisor.permissions`, `ShiftOS Onboarding.dc.html` ~line
 * 448). Informational only — spec decision 4 explicitly rules out an
 * editable per-invitation permission override, so this never feeds into
 * `invite_member`'s call.
 */
const SUPERVISOR_PERMISSIONS: { label: string; on?: boolean; locked?: boolean }[] = [
  { label: 'Manage schedules', on: true },
  { label: 'Mark attendance', on: true },
  { label: 'Assign tasks', on: false },
  { label: 'Approve swaps', on: true },
  { label: 'Post announcements', on: false },
  { label: 'View reports', on: false },
  { label: 'Change organization settings', locked: true },
  { label: 'Delete employees', locked: true }
];

/** Read-only checklist of what a Supervisor can/can't do — see SUPERVISOR_PERMISSIONS. */
function SupervisorPermissionsChecklist(): React.ReactElement {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">What a Supervisor can do</p>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SUPERVISOR_PERMISSIONS.map((permission) => {
          const label = permission.locked
            ? `Cannot ${permission.label.charAt(0).toLowerCase()}${permission.label.slice(1)}`
            : permission.label;
          const tone = permission.locked ? 'error' : permission.on ? 'success' : 'neutral';
          const Icon = permission.locked ? X : permission.on ? Check : Lock;
          return (
            <li key={permission.label}>
              <Badge tone={tone} className="w-full justify-start gap-2 py-1.5">
                <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </Badge>
            </li>
          );
        })}
      </ul>
    </div>
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
  const [error, setError] = useState<string | null>(null);
  // Running list of everyone invited so far this step (design's `repeat: true`) —
  // pure local-state accumulation of this step's own successful invite_member
  // results, no separate list-fetching RPC needed.
  const [invitedSoFar, setInvitedSoFar] = useState<{ firstName: string; lastName: string; email: string }[]>([]);
  const [justInvited, setJustInvited] = useState<{ firstName: string; email: string } | null>(null);

  const inviteMutation = useRpcMutation<
    Invitation,
    { email: string; firstName: string; lastName: string; roleId: string; branchIds: string[] }
  >('invite_member', {
    invalidates: ['list_invitations'],
    onSuccess: (invitation) => {
      setInvitedSoFar((prev) => [
        ...prev,
        { firstName: invitation.first_name, lastName: invitation.last_name, email: invitation.email }
      ]);
      setJustInvited({ firstName: invitation.first_name, email: invitation.email });
      setFirstName('');
      setLastName('');
      setEmail('');
    },
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

      {invitedSoFar.length > 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">
            Invited so far ({invitedSoFar.length})
          </p>
          <ul className="flex flex-col gap-1.5">
            {invitedSoFar.map((invitee, index) => (
              <li key={`${invitee.email}-${index}`} className="text-sm text-neutral-700">
                <span className="font-medium">
                  {invitee.firstName} {invitee.lastName}
                </span>{' '}
                <span className="text-neutral-500">{invitee.email}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {justInvited ? (
        <div className="flex flex-col gap-3 rounded-xl bg-success-50 p-4 text-sm text-success-text">
          <p>
            An invitation has been sent to {justInvited.email}. {justInvited.firstName} will become a Supervisor once they accept it.
          </p>
          <Button variant="secondary" className="self-start" onClick={() => setJustInvited(null)}>
            Invite another supervisor
          </Button>
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
          <SupervisorPermissionsChecklist />
        </form>
      )}

      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm font-medium text-neutral-500 hover:text-neutral-700">
          Back
        </button>
        <Button variant={invitedSoFar.length > 0 ? 'primary' : 'ghost'} onClick={onNext}>
          {invitedSoFar.length > 0 ? 'Continue' : 'Skip for now'}
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
