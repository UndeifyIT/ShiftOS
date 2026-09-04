import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Check, MessageSquare, Users, X } from 'lucide-react';
import { FormField, SearchableSelect, Skeleton, SkeletonRows } from '@shiftos/ui';
import { getCountryOptions, getRegionLabel, getStateOptions, resolveCountryValue } from '@shiftos/geography';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcMutation, useRpcQuery } from '../../lib/useRpc.js';
import { OnboardingWizardShell, type OnboardingStepId } from './OnboardingWizardShell.js';
import { AuthBanner, AuthInput } from '../auth/AuthInputs.js';
import { ObSelect, WizardFooter } from './OnboardingFields.js';
import type { Branch, Department, Invitation, Organization, Role } from '../../types/domain.js';

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
 * (set by FinishStep via the existing update_organization RPC). Branch,
 * Supervisor and Department steps all use real RPCs (Departments has had a
 * full backend since migration 041 — see spec decision 7).
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

  const orgCountryRaw = typeof activeOrganization?.metadata?.country === 'string' ? (activeOrganization.metadata.country as string) : '';
  // Resolves whatever's in org metadata — a new-format ISO2 code, or a
  // pre-existing free-text country name from before this task — to a
  // canonical {code, label}. See lib/geography.ts's own doc comment.
  const resolvedOrgCountry = useMemo(() => resolveCountryValue(orgCountryRaw), [orgCountryRaw]);
  const timeZoneOptions = useMemo(() => getTimeZoneOptions(), []);
  const countryOptions = useMemo(() => getCountryOptions(), []);
  // Guarantees the disabled, pre-filled-from-org select always has a
  // matching option to display, even for a legacy org whose metadata.country
  // predates this task and doesn't match any known country name/code.
  const effectiveCountryOptions = useMemo(() => {
    if (!resolvedOrgCountry || countryOptions.some((option) => option.value === resolvedOrgCountry.code)) {
      return countryOptions;
    }
    return [{ value: resolvedOrgCountry.code, label: resolvedOrgCountry.label }, ...countryOptions];
  }, [countryOptions, resolvedOrgCountry]);

  const [name, setName] = useState('');
  const [storeType, setStoreType] = useState('');
  const [country, setCountry] = useState(resolvedOrgCountry?.code ?? '');
  const [branchState, setBranchState] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [timeZone, setTimeZone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const stateOptions = useMemo(() => getStateOptions(country), [country]);
  const regionLabel = useMemo(() => getRegionLabel(country), [country]);

  /** Country select's onChange — also drops any already-picked state, since it belongs to the previous country's list. */
  const handleCountryChange = (value: string): void => {
    setCountry(value);
    setBranchState('');
  };

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
          <h2 className="text-[20px] font-extrabold tracking-[-0.02em] text-neutral-900">Your first branch is set up</h2>
          <p className="mt-[7px] text-[13px] text-neutral-500">{branches[0]!.name} is ready to go.</p>
        </div>
        <WizardFooter onNext={onNext} nextLabel="Continue →" />
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
          settings: { storeType, country: country.trim(), state: branchState.trim(), city: city.trim(), timeZone }
        });
      }}
      className="flex flex-col gap-[15px]"
    >
      <div>
        <h2 className="text-[20px] font-extrabold tracking-[-0.02em] text-neutral-900">Tell us about your branch</h2>
        <p className="mt-[7px] text-[13px] text-neutral-500">This information helps us organize your operations and team.</p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3.5">
        <FormField label="Branch Name" htmlFor="branchName" required>
          {(fieldProps) => (
            <AuthInput {...fieldProps} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Main Branch" />
          )}
        </FormField>
        <FormField label="Store Type" htmlFor="branchStoreType" required>
          {(fieldProps) => (
            <ObSelect
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
          hint={resolvedOrgCountry ? "From your organization's settings." : undefined}
        >
          {(fieldProps) => (
            <SearchableSelect
              {...fieldProps}
              variant="onboarding"
              options={effectiveCountryOptions}
              placeholder="Search countries…"
              value={country}
              onChange={handleCountryChange}
              disabled={Boolean(resolvedOrgCountry)}
            />
          )}
        </FormField>
        <FormField label={regionLabel} htmlFor="branchState" required>
          {(fieldProps) =>
            stateOptions.length > 0 ? (
              <SearchableSelect
                {...fieldProps}
                variant="onboarding"
                options={stateOptions}
                placeholder={country ? `Search ${regionLabel.toLowerCase()}…` : 'Select a country first'}
                value={branchState}
                onChange={setBranchState}
                disabled={!country}
              />
            ) : (
              <AuthInput
                {...fieldProps}
                value={branchState}
                onChange={(e) => setBranchState(e.target.value)}
                placeholder="e.g. Lagos"
                disabled={!country}
              />
            )
          }
        </FormField>
        <FormField label="City" htmlFor="branchCity" required>
          {(fieldProps) => <AuthInput {...fieldProps} value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Ikeja" />}
        </FormField>
        <FormField label="Branch Address" htmlFor="branchAddress" hint="Optional — used on attendance records and shift notes.">
          {(fieldProps) => (
            <AuthInput {...fieldProps} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter full address" />
          )}
        </FormField>
      </div>
      <FormField label="Time Zone" htmlFor="branchTimeZone" required>
        {(fieldProps) => (
          <ObSelect
            {...fieldProps}
            value={timeZone}
            onChange={(e) => setTimeZone(e.target.value)}
            placeholder="Select time zone"
            options={timeZoneOptions.map((tz) => ({ value: tz, label: tz }))}
          />
        )}
      </FormField>
      {error ? <AuthBanner tone="bad" title={error} /> : null}
      <WizardFooter onNext={() => undefined} nextLabel="Continue →" nextType="submit" saving={createMutation.isPending} />
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

/** Read-only checklist of what a Supervisor can/can't do, in the design's permission-chip styling (on: green, off: quiet, locked: red). See SUPERVISOR_PERMISSIONS. */
function SupervisorPermissionsChecklist(): React.ReactElement {
  return (
    <div>
      <p className="text-[13px] font-extrabold text-neutral-900">Permissions</p>
      <p className="mb-3 mt-1 text-xs text-neutral-500">
        What this supervisor will access and manage. Least privilege by default &mdash; you can change these later in Members.
      </p>
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-[9px]">
        {SUPERVISOR_PERMISSIONS.map((permission) => {
          const label = permission.locked
            ? `Cannot ${permission.label.charAt(0).toLowerCase()}${permission.label.slice(1)}`
            : permission.label;
          const locked = permission.locked;
          const on = permission.on;
          return (
            <li
              key={permission.label}
              className={[
                'flex items-center gap-[9px] rounded-xl px-3 py-2.5 text-[12.5px] font-bold',
                locked
                  ? 'border border-[#F3C6BD] bg-error-50 text-[#8E2A17]'
                  : on
                    ? 'border border-[#BFE6CF] bg-success-50 text-[#1E6B45]'
                    : 'border border-neutral-200 bg-white text-neutral-500'
              ].join(' ')}
            >
              <span
                className={[
                  'flex size-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white',
                  locked ? 'bg-error-500' : on ? 'bg-success-500' : 'border-[1.5px] border-neutral-200 text-transparent'
                ].join(' ')}
              >
                {locked ? <X className="size-2.5" aria-hidden="true" /> : on ? <Check className="size-2.5" aria-hidden="true" /> : ''}
              </span>
              {label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * First/last name deliberately not collected here (Task 3 — same redundant
 * data-entry finding as InviteMemberForm above: the invitee always provides
 * their own name later, at CompleteProfilePage, regardless of what the
 * inviter typed). "Invited so far"/the success banner identify each invitee
 * by email instead of a name this step never collects.
 */
function SupervisorStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }): React.ReactElement {
  const { data: branches } = useRpcQuery<Branch[]>('list_branches');
  const branchId = branches?.[0]?.id;
  const { data: invitableRoles } = useRpcQuery<Role[]>('list_invitable_roles');
  const supervisorRole = invitableRoles?.find((r) => r.name.toLowerCase() === 'supervisor');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Running list of everyone invited so far this step (design's `repeat: true`) —
  // pure local-state accumulation of this step's own successful invite_member
  // results, no separate list-fetching RPC needed.
  const [invitedSoFar, setInvitedSoFar] = useState<string[]>([]);
  const [justInvited, setJustInvited] = useState<string | null>(null);

  const inviteMutation = useRpcMutation<Invitation, { email: string; roleId: string; branchIds: string[] }>('invite_member', {
    invalidates: ['list_invitations'],
    onSuccess: (invitation) => {
      setInvitedSoFar((prev) => [...prev, invitation.email]);
      setJustInvited(invitation.email);
      setEmail('');
      setError(null);
    },
    onError: (err) => setError(err.message)
  });

  return (
    <div className="flex flex-col gap-[15px]">
      <div>
        <h2 className="text-[20px] font-extrabold tracking-[-0.02em] text-neutral-900">Set up your supervisors</h2>
        <p className="mt-[7px] text-[13px] text-neutral-500">
          Add supervisors who help you manage daily operations. You can add more or edit their details anytime.
        </p>
      </div>

      {invitedSoFar.length > 0 ? (
        <div>
          <p className="text-[13px] font-extrabold text-neutral-900">Invited so far</p>
          <div className="mt-2.5 flex flex-col gap-[9px]">
            {invitedSoFar.map((invitedEmail, index) => (
              <div
                key={`${invitedEmail}-${index}`}
                className="flex flex-wrap items-center gap-2.5 rounded-[13px] border border-neutral-200 bg-[#FDFCFB] px-[13px] py-[11px]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-bold text-neutral-900">{invitedEmail}</span>
                </span>
                <span className="inline-flex items-center rounded-full bg-success-50 px-2 py-0.5 text-[10px] font-extrabold text-success-600">
                  Invitation sent
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {justInvited ? (
        <div className="flex flex-col gap-2 rounded-[13px] border border-[#BFE6CF] bg-success-50 p-3.5 text-[12.5px] text-success-text">
          <p>An invitation has been sent to {justInvited}. They'll become a Supervisor once they accept it.</p>
          <button
            type="button"
            onClick={() => {
              setJustInvited(null);
              setError(null);
            }}
            className="h-8 w-fit cursor-pointer rounded-[9px] border border-neutral-200 bg-white px-3 text-[11.5px] font-bold text-neutral-900 transition-colors hover:border-neutral-300"
          >
            + Add another supervisor
          </button>
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
            if (!email.trim()) {
              setError('Work email is required.');
              return;
            }
            setError(null);
            inviteMutation.mutate({
              email: email.trim(),
              roleId: supervisorRole.id,
              branchIds: [branchId]
            });
          }}
          className="flex flex-col gap-[15px]"
        >
          <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3.5">
            <FormField label="Work Email" htmlFor="supEmail" required hint="We'll send a real invitation to this address.">
              {(fieldProps) => <AuthInput {...fieldProps} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sarah@abcsupermarket.com" />}
            </FormField>
          </div>
          {error ? <AuthBanner tone="bad" title={error} /> : null}
          <button
            type="submit"
            disabled={inviteMutation.isPending}
            className={
              inviteMutation.isPending
                ? 'h-11 w-full cursor-progress rounded-xl bg-[#F5A98A] text-[13.5px] font-bold text-white sm:w-auto sm:px-6'
                : 'h-11 w-full cursor-pointer rounded-xl bg-brand-500 text-[13.5px] font-bold text-white shadow-[0_12px_26px_-14px_rgba(240,78,23,0.75)] transition-colors hover:bg-brand-600 sm:w-auto sm:px-6'
            }
          >
            {inviteMutation.isPending ? 'Sending…' : 'Send invitation'}
          </button>
          <SupervisorPermissionsChecklist />
        </form>
      )}

      <WizardFooter
        onBack={onBack}
        onSkip={invitedSoFar.length === 0 ? onNext : undefined}
        onNext={onNext}
        nextLabel="Continue →"
      />
    </div>
  );
}

/**
 * One-click department suggestion chips (design's `SUGGESTIONS` array,
 * `ShiftOS Onboarding.dc.html` ~line 485).
 */
const DEPARTMENT_SUGGESTIONS = ['Sales Floor', 'Cashiers', 'Warehouse', 'Inventory', 'Customer Service', 'Security', 'Administration'];

/**
 * Real Department step (spec decision 7): uses the existing
 * create_department/list_departments RPCs against the branch created in
 * BranchStep — the backend has existed since migration 041, this just wires
 * the frontend up to it. Kept skippable ("Skip for now") even though the
 * design's own validation copy implies zero departments should block
 * continuing: many organizations legitimately organize by branch alone, so
 * this is a deliberate trim, not a missed requirement.
 */
function DepartmentsStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }): React.ReactElement {
  const { data: branches } = useRpcQuery<Branch[]>('list_branches');
  const branchId = branches?.[0]?.id;
  const { data: departments, isLoading } = useRpcQuery<Department[]>(
    'list_departments',
    { branchId },
    { enabled: Boolean(branchId) }
  );
  const [customName, setCustomName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Names already added to this branch, lower-cased for a case-insensitive
  // match — used to grey out suggestion chips instead of letting a duplicate
  // create_department call reach the DB's unique branch+name constraint
  // (migration 041) and surface a raw constraint-violation error.
  const existingNames = useMemo(() => new Set((departments ?? []).map((d) => d.name.trim().toLowerCase())), [departments]);

  const createMutation = useRpcMutation<Department, { branchId: string; name: string }>('create_department', {
    invalidates: ['list_departments'],
    onSuccess: () => {
      setCustomName('');
      setError(null);
    },
    onError: (err) => setError(err.message)
  });

  const addDepartment = (rawName: string) => {
    if (!branchId) {
      setError('Create a branch first.');
      return;
    }
    const name = rawName.trim();
    if (!name || existingNames.has(name.toLowerCase())) {
      return;
    }
    setError(null);
    createMutation.mutate({ branchId, name });
  };

  if (isLoading) {
    return <SkeletonRows rows={3} />;
  }

  const hasDepartments = Boolean(departments && departments.length > 0);

  return (
    <div className="flex flex-col gap-[15px]">
      <div>
        <h2 className="text-[20px] font-extrabold tracking-[-0.02em] text-neutral-900">Create your departments</h2>
        <p className="mt-[7px] text-[13px] text-neutral-500">
          Add the departments in your branch. You can always add, rename or delete them later.
        </p>
      </div>

      <div>
        <p className="text-[13px] font-extrabold text-neutral-900">Suggested departments</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {DEPARTMENT_SUGGESTIONS.map((label) => {
            const added = existingNames.has(label.toLowerCase());
            return (
              <button
                key={label}
                type="button"
                disabled={added || createMutation.isPending}
                onClick={() => addDepartment(label)}
                aria-pressed={added}
                className={
                  added
                    ? 'inline-flex cursor-default items-center gap-1.5 rounded-full border border-[#BFE6CF] bg-success-50 px-[13px] py-2 text-xs font-bold text-[#1E6B45]'
                    : 'inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-[13px] py-2 text-xs font-bold text-neutral-600 transition-colors hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60'
                }
              >
                {added ? <Check className="size-3.5 shrink-0" aria-hidden="true" /> : null}
                {added ? label : `+ ${label}`}
              </button>
            );
          })}
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          addDepartment(customName);
        }}
        className="flex items-end gap-2"
      >
        <div className="flex-1">
          <FormField label="Or create your own" htmlFor="customDeptName">
            {(fieldProps) => (
              <AuthInput {...fieldProps} value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Bakery" />
            )}
          </FormField>
        </div>
        <button
          type="submit"
          disabled={!customName.trim() || createMutation.isPending}
          className="h-[44px] shrink-0 cursor-pointer rounded-xl bg-brand-500 px-5 text-[13px] font-bold text-white shadow-[0_12px_26px_-14px_rgba(240,78,23,0.75)] transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400 disabled:shadow-none"
        >
          {createMutation.isPending ? 'Adding…' : 'Add'}
        </button>
      </form>

      {error ? <AuthBanner tone="bad" title={error} /> : null}

      <div>
        <p className="flex items-center justify-between gap-2.5 text-[13px] font-extrabold text-neutral-900">
          Your departments{' '}
          {hasDepartments ? (
            <span className="text-[11.5px] font-semibold text-neutral-400">{departments!.length} added</span>
          ) : (
            <span className="text-[11.5px] font-semibold text-neutral-400">At least one is recommended</span>
          )}
        </p>
        {hasDepartments ? (
          <div className="mt-2.5 flex flex-col gap-[9px]">
            {departments!.map((department) => (
              <div
                key={department.id}
                className="flex flex-wrap items-center gap-2.5 rounded-[13px] border border-neutral-200 bg-[#FDFCFB] px-[13px] py-[11px]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-bold text-neutral-900">{department.name}</span>
                  <span className="block text-[11.5px] text-neutral-400">No supervisor assigned yet</span>
                </span>
                <span className="inline-flex items-center rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-extrabold text-brand-deep">
                  {branchId === department.branch_id ? 'This branch' : 'Branch'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2.5 rounded-[13px] border border-dashed border-neutral-300 bg-[#FDFCFB] p-6 text-center">
            <p className="text-[13.5px] font-extrabold text-neutral-900">No departments yet</p>
            <p className="mx-auto mt-1.5 max-w-[340px] text-[12.5px] text-neutral-500">
              Add one from the suggestions above, or create your own. Departments decide where schedules and tasks land.
            </p>
          </div>
        )}
      </div>

      <WizardFooter
        onBack={onBack}
        onSkip={hasDepartments ? undefined : onNext}
        onNext={onNext}
        nextLabel="Continue →"
      />
    </div>
  );
}

/** Pluralizes a count + noun for FinishStep's summary sentence (e.g. "1 branch", "3 supervisors"). */
function pluralize(count: number, singular: string, plural: string = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function FinishStep({ onFinish }: { onFinish: () => void }): React.ReactElement {
  const { activeOrganization } = useSession();
  const [error, setError] = useState<string | null>(null);

  // Real counts for the completion summary (spec decision 8), not hardcoded
  // copy. list_departments with no branchId lists departments across every
  // branch this org has (DepartmentService.listDepartments resolves the
  // caller's full accessible branch scope when no branchId is passed — see
  // packages/services/src/workforce/departmentService.ts:78-82), so this
  // stays correct even once an org has more than one branch. Supervisor
  // count comes from every non-revoked Supervisor-role invitation this
  // organization has ever sent (list_invitations returns every invitation
  // regardless of which session created it), so an org resuming onboarding
  // after a reload still sees accurate numbers, not just this session's own
  // invites.
  const { data: branches, isLoading: branchesLoading } = useRpcQuery<Branch[]>('list_branches');
  const { data: departments, isLoading: departmentsLoading } = useRpcQuery<Department[]>('list_departments');
  const { data: invitations, isLoading: invitationsLoading } = useRpcQuery<Invitation[]>('list_invitations');

  const branchCount = branches?.length ?? 0;
  const departmentCount = departments?.length ?? 0;
  // Counts pending AND accepted invitations (anything not revoked) —
  // deliberately not narrowed to accepted-only, since during onboarding
  // nobody has had time to accept yet and that would always show 0.
  const supervisorCount = useMemo(
    () =>
      (invitations ?? []).filter(
        (invitation) => invitation.role_name.toLowerCase() === 'supervisor' && invitation.status !== 'revoked'
      ).length,
    [invitations]
  );
  const countsLoading = branchesLoading || departmentsLoading || invitationsLoading;
  const orgName = activeOrganization?.name ?? 'Your organization';

  const completeMutation = useRpcMutation<Organization, { metadata: Record<string, unknown> }>('update_organization', {
    onSuccess: onFinish,
    onError: (err) => setError(err.message)
  });

  return (
    <div className="flex flex-col items-center py-2 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-success-50 text-success-500">
        <Check className="size-[30px]" aria-hidden="true" />
      </span>
      <h2 className="mt-[18px] text-2xl font-extrabold tracking-[-0.025em] text-neutral-900">Your workspace is ready</h2>
      {countsLoading ? (
        <Skeleton className="mt-[9px] h-4 w-full max-w-[420px]" />
      ) : (
        <p className="mx-auto mt-[9px] max-w-[420px] text-[13.5px] leading-relaxed text-neutral-500">
          {orgName} is set up with {pluralize(branchCount, 'branch', 'branches')}, {pluralize(supervisorCount, 'supervisor')} and{' '}
          {pluralize(departmentCount, 'department')}. Next, create your first shift.
        </p>
      )}
      {error ? <AuthBanner tone="bad" title={error} /> : null}

      <div className="mt-5 grid w-full grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3 text-left">
        <Link
          to="/schedules"
          className="rounded-[14px] border border-neutral-200 bg-[#FDFCFB] p-[15px] transition-colors hover:border-brand-500"
        >
          <span className="flex size-[34px] items-center justify-center rounded-xl bg-brand-soft text-brand-deep">
            <CalendarDays className="size-[17px]" aria-hidden="true" />
          </span>
          <span className="mt-[11px] block text-[13.5px] font-extrabold text-neutral-900">Create your first schedule</span>
          <span className="mt-[3px] block text-xs text-neutral-500">Plan the week ahead for your branch.</span>
        </Link>
        <Link
          to="/employees"
          className="rounded-[14px] border border-neutral-200 bg-[#FDFCFB] p-[15px] transition-colors hover:border-brand-500"
        >
          <span className="flex size-[34px] items-center justify-center rounded-xl bg-info-50 text-info-600">
            <Users className="size-[17px]" aria-hidden="true" />
          </span>
          <span className="mt-[11px] block text-[13.5px] font-extrabold text-neutral-900">Add your employees</span>
          <span className="mt-[3px] block text-xs text-neutral-500">One at a time, or import a spreadsheet.</span>
        </Link>
        <Link
          to="/invitations"
          className="rounded-[14px] border border-neutral-200 bg-[#FDFCFB] p-[15px] transition-colors hover:border-brand-500"
        >
          <span className="flex size-[34px] items-center justify-center rounded-xl bg-success-soft text-success-500">
            <MessageSquare className="size-[17px]" aria-hidden="true" />
          </span>
          <span className="mt-[11px] block text-[13.5px] font-extrabold text-neutral-900">Invite your team</span>
          <span className="mt-[3px] block text-xs text-neutral-500">Tell the branch that ShiftOS is live.</span>
        </Link>
      </div>

      <button
        type="button"
        onClick={() =>
          completeMutation.mutate({
            metadata: { ...(activeOrganization?.metadata ?? {}), onboardingCompletedAt: new Date().toISOString() }
          })
        }
        disabled={completeMutation.isPending}
        className="mt-5 h-12 w-full max-w-[320px] cursor-pointer rounded-[13px] bg-brand-500 text-[14.5px] font-bold text-white shadow-[0_14px_30px_-16px_rgba(240,78,23,0.75)] transition-colors hover:bg-brand-600 disabled:cursor-progress disabled:bg-[#F5A98A]"
      >
        {completeMutation.isPending ? 'Saving…' : 'Go to dashboard →'}
      </button>
    </div>
  );
}
