import React, { useRef, useState } from 'react';
import { Building2, ImageOff } from 'lucide-react';
import { Button, FormField, InlineError, Input, Select, Spinner, type SelectOption } from '@shiftos/ui';
import { supabase } from '../../../lib/supabase.js';
import { callRpc } from '../../../lib/apiClient.js';
import { uploadOrganizationLogo } from '../../../lib/avatars.js';
import { useSession } from '../../../auth/SessionProvider.js';

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const BUSINESS_TYPES: SelectOption[] = [
  { value: 'Supermarket', label: 'Supermarket' },
  { value: 'Retail Store', label: 'Retail Store' },
  { value: 'Restaurant', label: 'Restaurant' },
  { value: 'Pharmacy', label: 'Pharmacy' },
  { value: 'Warehouse & Logistics', label: 'Warehouse & Logistics' },
  { value: 'Hospitality', label: 'Hospitality' },
  { value: 'Healthcare', label: 'Healthcare' },
  { value: 'Manufacturing', label: 'Manufacturing' },
  { value: 'Other', label: 'Other' }
];

const DEPARTMENT_COUNT_ESTIMATES: SelectOption[] = [
  { value: '1 – 3', label: '1 – 3' },
  { value: '4 – 6', label: '4 – 6' },
  { value: '7 – 10', label: '7 – 10' },
  { value: '11 – 20', label: '11 – 20' },
  { value: '20+', label: '20+' }
];

const EMPLOYEE_ESTIMATES: SelectOption[] = [
  { value: '1 – 5', label: '1 – 5' },
  { value: '6 – 25', label: '6 – 25' },
  { value: '26 – 50', label: '26 – 50' },
  { value: '51 – 100', label: '51 – 100' },
  { value: '100+', label: '100+' }
];

const COUNTRIES: SelectOption[] = [
  { value: 'Nigeria', label: 'Nigeria' },
  { value: 'Ghana', label: 'Ghana' },
  { value: 'Kenya', label: 'Kenya' },
  { value: 'South Africa', label: 'South Africa' },
  { value: 'Egypt', label: 'Egypt' },
  { value: 'United Kingdom', label: 'United Kingdom' },
  { value: 'United States', label: 'United States' },
  { value: 'Canada', label: 'Canada' },
  { value: 'India', label: 'India' },
  { value: 'United Arab Emirates', label: 'United Arab Emirates' },
  { value: 'Other', label: 'Other' }
];

const TIME_ZONES: SelectOption[] = [
  { value: 'Africa/Lagos', label: 'Africa/Lagos (UTC +1)' },
  { value: 'Africa/Accra', label: 'Africa/Accra (UTC +0)' },
  { value: 'Africa/Nairobi', label: 'Africa/Nairobi (UTC +3)' },
  { value: 'Africa/Johannesburg', label: 'Africa/Johannesburg (UTC +2)' },
  { value: 'Africa/Cairo', label: 'Africa/Cairo (UTC +2)' },
  { value: 'Europe/London', label: 'Europe/London (UTC +0)' },
  { value: 'America/New_York', label: 'America/New York (UTC -5)' },
  { value: 'America/Chicago', label: 'America/Chicago (UTC -6)' },
  { value: 'America/Los_Angeles', label: 'America/Los Angeles (UTC -8)' },
  { value: 'America/Toronto', label: 'America/Toronto (UTC -5)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (UTC +5:30)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (UTC +4)' }
];

type LogoState = 'empty' | 'uploading' | 'uploaded' | 'error';

/**
 * WEB-001 — Organization step (design's first of 5 onboarding steps).
 * Replaces `OrganizationSetupPage.tsx`, carrying over its name/slug/
 * create_organization_with_owner logic, and adds the design's fuller field
 * set (Business Type, Number of Departments estimate, Estimated Employees,
 * Country, Time Zone — merged into organizations.metadata via
 * update_organization) plus an optional, deferred logo upload.
 *
 * Rendered by App.tsx's `no-organization` branch inside
 * `OnboardingWizardShell`, before an organizationId exists — so, like
 * `OrganizationSetupPage` before it, org creation itself goes straight
 * through the anon-key `supabase.rpc` client (bootstrap exception, see
 * lib/supabase.ts's module doc) rather than useRpcMutation (which requires
 * a resolved myContext.organizationId this screen doesn't have yet).
 */
export default function OrganizationStep(): React.ReactElement {
  const { refresh, signOut } = useSession();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<Record<string, unknown>>({});

  const [name, setName] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [slug, setSlug] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [departmentCountEstimate, setDepartmentCountEstimate] = useState('');
  const [estimatedEmployees, setEstimatedEmployees] = useState('');
  const [country, setCountry] = useState('');
  const [timeZone, setTimeZone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [metadataWarning, setMetadataWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleNameChange = (value: string): void => {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!name.trim() || !slug.trim()) {
      setError('Organization name is required.');
      return;
    }
    if (!businessType || !departmentCountEstimate || !estimatedEmployees || !country || !timeZone) {
      setError('Please fill in every field before continuing.');
      return;
    }
    setSubmitting(true);
    setError(null);

    const { data: newOrganizationId, error: rpcError } = await supabase.rpc('create_organization_with_owner', {
      p_name: name.trim(),
      p_slug: slug.trim()
    });
    if (rpcError || !newOrganizationId) {
      setSubmitting(false);
      setError(rpcError?.message.includes('duplicate') ? 'That workspace URL is already taken — try another.' : 'We could not create your organization. Please try again.');
      return;
    }

    const orgMetadata: Record<string, unknown> = {
      businessType,
      departmentCountEstimate,
      estimatedEmployees,
      country,
      timeZone,
      // Marks this org as having gone through the new multi-step wizard (as
      // opposed to a legacy org from the old single-step flow) — App.tsx's
      // OnboardingGate reads this to decide whether the branch-count
      // heuristic applies, so the wizard survives a mid-onboarding reload.
      onboardingStartedAt: new Date().toISOString()
    };
    try {
      await callRpc('update_organization', newOrganizationId as string, { metadata: orgMetadata });
      setMetadata(orgMetadata);
    } catch {
      // The organization itself was created successfully — these extra
      // details are supplementary, so a failure here doesn't block
      // progress. Surface it on the logo screen instead of losing it.
      setMetadataWarning("We saved your organization, but couldn't save a few extra details — you can try again later.");
      setMetadata(orgMetadata);
    }

    setOrganizationId(newOrganizationId as string);
    setSubmitting(false);
  };

  if (organizationId) {
    return (
      <OrganizationLogoStep
        organizationId={organizationId}
        organizationName={name.trim()}
        metadata={metadata}
        warning={metadataWarning}
        onContinue={() => void refresh()}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-xl font-semibold text-neutral-900">Tell us about your organization</h2>
        <p className="mt-1 text-sm text-neutral-500">This information helps us create your ShiftOS workspace.</p>
      </div>

      <FormField label="Organization Name" htmlFor="orgName" required>
        {(fieldProps) => <Input {...fieldProps} value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Acme Retail" />}
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Business Type" htmlFor="businessType" required>
          {(fieldProps) => (
            <Select {...fieldProps} options={BUSINESS_TYPES} placeholder="Select business type" value={businessType} onChange={(e) => setBusinessType(e.target.value)} />
          )}
        </FormField>
        <FormField label="Number of Departments" htmlFor="departmentCount" required>
          {(fieldProps) => (
            <Select
              {...fieldProps}
              options={DEPARTMENT_COUNT_ESTIMATES}
              placeholder="Select a range"
              value={departmentCountEstimate}
              onChange={(e) => setDepartmentCountEstimate(e.target.value)}
            />
          )}
        </FormField>
        <FormField label="Estimated Employees" htmlFor="estimatedEmployees" required>
          {(fieldProps) => (
            <Select
              {...fieldProps}
              options={EMPLOYEE_ESTIMATES}
              placeholder="Select a range"
              value={estimatedEmployees}
              onChange={(e) => setEstimatedEmployees(e.target.value)}
            />
          )}
        </FormField>
        <FormField label="Country" htmlFor="orgCountry" required>
          {(fieldProps) => <Select {...fieldProps} options={COUNTRIES} placeholder="Select country" value={country} onChange={(e) => setCountry(e.target.value)} />}
        </FormField>
        <FormField label="Time Zone" htmlFor="orgTimeZone" required hint="Keeps clock-ins and schedules accurate.">
          {(fieldProps) => <Select {...fieldProps} options={TIME_ZONES} placeholder="Select time zone" value={timeZone} onChange={(e) => setTimeZone(e.target.value)} />}
        </FormField>
      </div>

      <FormField label="Workspace Name" htmlFor="orgSlug" required hint="This is your unique workspace URL. You can change it later.">
        {(fieldProps) => (
          <Input
            {...fieldProps}
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
          />
        )}
      </FormField>

      {error ? <InlineError message={error} /> : null}
      <Button type="submit" loading={submitting} fullWidth>
        Continue →
      </Button>

      <p className="mt-2 text-center text-xs text-neutral-500">
        Were you invited to an existing team? Ask your administrator to confirm your invitation was completed.
      </p>
      <button type="button" onClick={() => void signOut()} className="block w-full text-center text-sm font-medium text-neutral-500 hover:text-neutral-700">
        Sign out
      </button>
    </form>
  );
}

/**
 * Deferred logo upload, revealed only once `organizationId` exists (the
 * `avatars` bucket's `organizations/{organizationId}/` prefix — RLS-gated by
 * migration 046 — needs a real id to upload against). Purely optional:
 * "Continue" always works, matching the design's "Optional — your initials
 * are used until you upload one" framing (no `req: true` on this field).
 */
function OrganizationLogoStep({
  organizationId,
  organizationName,
  metadata,
  warning,
  onContinue
}: {
  organizationId: string;
  organizationName: string;
  metadata: Record<string, unknown>;
  warning: string | null;
  onContinue: () => void;
}): React.ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoState, setLogoState] = useState<LogoState>('empty');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [continuing, setContinuing] = useState(false);

  const initials = organizationName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  const handleFileSelected = async (file: File): Promise<void> => {
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setLogoState('uploading');
    try {
      const path = await uploadOrganizationLogo(organizationId, file);
      // Best-effort: the org row already exists — a failure to persist the
      // logo path just leaves the org without a logoPath, not un-created.
      await callRpc('update_organization', organizationId, { metadata: { ...metadata, logoPath: path } });
      setLogoState('uploaded');
    } catch {
      setLogoState('error');
    }
  };

  const handleContinue = (): void => {
    setContinuing(true);
    onContinue();
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-xl font-semibold text-neutral-900">Add your organization logo</h2>
        <p className="mt-1 text-sm text-neutral-500">Optional — your initials are used until you upload one.</p>
      </div>

      <div className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-neutral-50/50 p-3.5">
        <div
          className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border ${
            logoState === 'error'
              ? 'border-error-300 bg-error-50 text-error-500'
              : logoState === 'uploading'
                ? 'border-neutral-200 bg-neutral-100 text-neutral-400'
                : 'border-neutral-200 bg-white text-neutral-400'
          }`}
        >
          {logoState === 'uploading' ? (
            <Spinner size={20} label="Uploading logo" />
          ) : logoState === 'error' ? (
            <ImageOff size={22} aria-hidden="true" />
          ) : logoState === 'uploaded' && previewUrl ? (
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          ) : initials ? (
            <span className="text-base font-semibold text-neutral-500">{initials}</span>
          ) : (
            <Building2 size={26} aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs text-neutral-400">
            {logoState === 'uploading'
              ? 'Uploading your logo…'
              : logoState === 'uploaded'
                ? 'Logo added.'
                : logoState === 'error'
                  ? "Couldn't upload your logo."
                  : 'PNG, JPG or SVG · max 2 MB.'}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            {logoState === 'empty' ? (
              <Button type="button" variant="primary" size="sm" onClick={() => fileInputRef.current?.click()}>
                Upload logo
              </Button>
            ) : logoState === 'uploading' ? (
              <span className="text-sm font-medium text-neutral-400">Uploading…</span>
            ) : logoState === 'uploaded' ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
                Replace logo
              </Button>
            ) : (
              <>
                <Button type="button" variant="primary" size="sm" onClick={() => fileInputRef.current?.click()}>
                  Try again
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setLogoState('empty')}>
                  Skip for now
                </Button>
              </>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void handleFileSelected(file);
          }}
        />
      </div>

      {warning ? <InlineError message={warning} /> : null}

      <Button loading={continuing} onClick={handleContinue} disabled={logoState === 'uploading'} fullWidth>
        Continue →
      </Button>
      <p className="text-center text-xs text-neutral-500">You can add a logo later once organization settings support it.</p>
    </div>
  );
}
