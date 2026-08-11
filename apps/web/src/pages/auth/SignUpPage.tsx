import React, { useState } from 'react';
import { Calendar, Check, CreditCard, Headset, ShieldCheck, RefreshCw, Building2, UserPlus, Users2 } from 'lucide-react';
import { Button, FormField, InlineError, Input, Select } from '@shiftos/ui';
import { supabase } from '../../lib/supabase.js';
import { AuthMarketingLayout } from './AuthMarketingLayout.js';
import { PasswordInput } from './PasswordInput.js';

const FEATURES = [
  { icon: Calendar, title: '30-Day Free Trial', description: 'Explore all features for 30 days.' },
  { icon: CreditCard, title: 'No Credit Card Required', description: 'Start your trial instantly. No hidden fees.' },
  { icon: Users2, title: 'Built For Retail Teams', description: 'Designed for managers and supervisors.' },
  { icon: Headset, title: 'Response & Support Included', description: "We're here to help you succeed." }
];

const STEPS = {
  heading: 'How It Works',
  items: [
    { icon: UserPlus, title: 'Create Your Account', description: 'Sign up in less than 2 minutes to get started.' },
    { icon: Building2, title: 'Set Up Your Branch', description: 'Add your branch details and customize settings.' },
    { icon: Calendar, title: 'Create Your First Schedule', description: 'Build shifts and invite your team.' }
  ]
};

const TRUST_ITEMS = [
  { icon: ShieldCheck, label: 'Already trusted by retail managers and supervisors across Nigeria' },
  { icon: Calendar, label: '30-Day Free Trial' },
  { icon: CreditCard, label: 'No Credit Card' },
  { icon: RefreshCw, label: 'Cancel Anytime' }
];

const ROLE_OPTIONS = [
  { value: 'manager', label: 'Manager' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'staff', label: 'Staff' }
];

/**
 * Not a screen in FD-4's numbered inventory — self-service signup is new
 * scope beyond the invitation-only model the frontend foundation doc
 * describes (DEC-017). Wired to real `supabase.auth.signUp()`; the "Role"
 * field is stored as auth user_metadata only — there is no backend concept
 * of assigning a role at signup (the first person to sign up always becomes
 * the org "Owner" via WEB-001's create_organization_with_owner, and real
 * role assignment only happens through invitations, which aren't
 * self-service yet). After signup, the existing bootstrap chain
 * (CompleteProfilePage -> OrganizationSetupPage) takes over unchanged.
 */
export default function SignUpPage(): React.ReactElement {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [role, setRole] = useState('manager');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!fullName.trim() || !email || password.length < 8) {
      setError('Please fill in all required fields. Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    setError(null);

    const [firstName, ...rest] = fullName.trim().split(/\s+/);
    const lastName = rest.join(' ') || firstName;
    window.sessionStorage.setItem('shiftos.pendingName', JSON.stringify({ firstName, lastName, phone: whatsapp || undefined }));

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName.trim(), whatsapp, intended_role: role } }
    });
    setSubmitting(false);

    if (signUpError) {
      const message = signUpError.message.toLowerCase();
      if (message.includes('already registered') || message.includes('already exists')) {
        setError('An account with this email already exists.');
        return;
      }
      if (message.includes('rate limit') || message.includes('too many') || message.includes('email send')) {
        setError('Too many sign-up attempts for this email right now. Please wait a few minutes and try again.');
        return;
      }
      setError('Something went wrong. Please try again.');
      return;
    }
    if (!data.session) {
      setCheckEmail(true);
    }
    // If a session came back immediately (email confirmation disabled on
    // this Supabase project), SessionProvider's onAuthStateChange listener
    // picks it up and the app routes into CompleteProfilePage on its own.
  };

  return (
    <AuthMarketingLayout
      eyebrow="Create Your Account"
      heading={
        <>
          Run Your Branch Without Spreadsheets
          <br />
          or <span className="text-brand-500">WhatsApp Chaos</span>
        </>
      }
      description="Create your branch workspace in minutes. Build schedules, keep staff informed, and manage operations from one platform."
      features={FEATURES}
      steps={STEPS}
      trustItems={TRUST_ITEMS}
      topRightPrompt="Already have an account?"
      topRightLinkLabel="Sign In"
      topRightLinkTo="/sign-in"
    >
      {checkEmail ? (
        <div className="py-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-50 text-success-600">
            <Check size={24} />
          </div>
          <h2 className="mt-4 text-xl font-bold text-neutral-900">Check your email</h2>
          <p className="mt-2 text-sm text-neutral-500">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
          </p>
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-neutral-900">Create Your Account</h2>
          <p className="mt-1 text-sm text-neutral-500">Start your 30-day free trial. Cancel anytime.</p>

          <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
            <FormField label="Full Name" htmlFor="fullName" required>
              {(fieldProps) => <Input {...fieldProps} placeholder="Enter your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />}
            </FormField>
            <FormField label="Work Email" htmlFor="email" required>
              {(fieldProps) => (
                <Input {...fieldProps} type="email" autoComplete="email" placeholder="Enter your work email" value={email} onChange={(e) => setEmail(e.target.value)} />
              )}
            </FormField>
            <FormField label="WhatsApp Number" htmlFor="whatsapp">
              {(fieldProps) => (
                <div className="flex">
                  <span className="flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-sm text-neutral-600">+234</span>
                  <Input {...fieldProps} className="rounded-l-none" placeholder="Enter your WhatsApp number" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                </div>
              )}
            </FormField>
            <FormField label="Role" htmlFor="role" hint="Not enforced yet — real role assignment happens through invitations.">
              {(fieldProps) => <Select {...fieldProps} value={role} onChange={(e) => setRole(e.target.value)} options={ROLE_OPTIONS} />}
            </FormField>
            <FormField label="Password" htmlFor="password" required>
              {(fieldProps) => (
                <PasswordInput {...fieldProps} autoComplete="new-password" placeholder="Confirm your password" value={password} onChange={(e) => setPassword(e.target.value)} />
              )}
            </FormField>
            <p className={['flex items-center gap-1.5 text-xs', password.length >= 8 ? 'text-success-600' : 'text-neutral-400'].join(' ')}>
              <Check size={14} /> Password must be at least 8 characters long
            </p>

            {error ? <InlineError message={error} /> : null}
            <Button type="submit" loading={submitting} fullWidth size="lg">
              Continue →
            </Button>

            <div className="flex items-center gap-3 text-xs text-neutral-400">
              <span className="h-px flex-1 bg-neutral-200" />
              or
              <span className="h-px flex-1 bg-neutral-200" />
            </div>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              size="lg"
              onClick={() =>
                void supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
              }
            >
              Continue with Google
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-neutral-400">
              <ShieldCheck size={14} /> Your data is secure and protected.
            </p>
          </form>
        </>
      )}
    </AuthMarketingLayout>
  );
}
