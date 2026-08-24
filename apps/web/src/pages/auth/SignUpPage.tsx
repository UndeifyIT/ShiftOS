import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Calendar, Lock, MessageSquare, ShieldCheck, Users } from 'lucide-react';
import { Button, FormField, InlineError, Input } from '@shiftos/ui';
import { supabase } from '../../lib/supabase.js';
import { checklistFor, strengthFor } from '../../lib/password.js';
import { isNetworkError } from '../../lib/authErrors.js';
import { AuthShell, type AuthBenefit, type AuthHighlight } from './AuthShell.js';
import { PasswordInput } from './PasswordInput.js';
import { PasswordStrengthMeter } from './PasswordStrengthMeter.js';

const HIGHLIGHT: AuthHighlight = {
  icon: Building2,
  title: 'One account. One organization workspace.',
  body: "Invite supervisors and staff once your branches are set up."
};

const BENEFITS: AuthBenefit[] = [
  { icon: Calendar, title: '30-day free trial', body: 'Explore every feature for 30 days.' },
  { icon: Lock, title: 'No credit card', body: 'Start instantly. No hidden fees.' },
  { icon: Users, title: 'Built for shift teams', body: 'Designed for managers and supervisors.' },
  { icon: MessageSquare, title: 'Support included', body: "We're here to help you get set up." }
];

/**
 * Not a screen in FD-4's numbered inventory — self-service signup is new
 * scope beyond the invitation-only model (DEC-017). Wired to real
 * `supabase.auth.signUp()`. The person who signs up here always becomes the
 * org "Owner" via WEB-001's create_organization_with_owner during onboarding
 * — there is no backend concept of choosing a role at signup (031: real
 * role assignment for anyone else happens exclusively through invitations).
 * The design file's Sign Up screen shows a Role selector; it is deliberately
 * omitted here (Auth phase design decision, 2026-08-23) since it has no
 * effect on anything and would imply a choice that doesn't exist.
 */
export default function SignUpPage(): React.ReactElement {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const checks = useMemo(() => checklistFor(password), [password]);
  const strength = useMemo(() => strengthFor(checks), [checks]);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!fullName.trim() || !email || !whatsapp.trim() || checks.some((c) => !c.passed)) {
      setError('Please fill in all required fields. Password must meet every requirement below.');
      return;
    }
    setSubmitting(true);
    setError(null);

    const [firstName, ...rest] = fullName.trim().split(/\s+/);
    const lastName = rest.join(' ') || firstName;
    window.sessionStorage.setItem('shiftos.pendingName', JSON.stringify({ firstName, lastName, phone: whatsapp || undefined }));

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName.trim(), whatsapp } }
      });

      if (signUpError) {
        if (isNetworkError(signUpError)) {
          setError("Couldn't reach ShiftOS. Check your connection and try again.");
          return;
        }
        const message = signUpError.message.toLowerCase();
        if (message.includes('already registered') || message.includes('already exists')) {
          setError('An account with this email already exists.');
        } else if (message.includes('rate limit') || message.includes('too many') || message.includes('email send')) {
          setError('Too many sign-up attempts for this email right now. Please wait a few minutes and try again.');
        } else {
          setError('Something went wrong. Please try again.');
        }
        return;
      }
      if (!data.session) {
        window.sessionStorage.setItem('shiftos.pendingVerifyEmail', email);
        navigate('/verify-email');
        return;
      }
      // If a session came back immediately (email confirmation disabled on
      // this Supabase project), SessionProvider's onAuthStateChange listener
      // picks it up and the app routes into CompleteProfilePage on its own.
    } catch (err) {
      setError(isNetworkError(err) ? "Couldn't reach ShiftOS. Check your connection and try again." : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Create your account"
      title="Run Your Shifts Without Spreadsheets"
      accent="or Chat-App Chaos"
      body="Create your organization workspace in minutes. Build schedules, keep staff informed and manage operations from one platform."
      highlight={HIGHLIGHT}
      benefits={BENEFITS}
      topRightPrompt="Already have an account?"
      topRightLinkLabel="Sign in"
      topRightLinkTo="/sign-in"
    >
      <h2 className="text-2xl font-bold text-neutral-900">Create your account</h2>
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
        <FormField label="WhatsApp Number" htmlFor="whatsapp" required>
          {(fieldProps) => (
            <div className="flex">
              <span className="flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-sm text-neutral-600">+234</span>
              <Input {...fieldProps} className="rounded-l-none" placeholder="801 234 5678" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
            </div>
          )}
        </FormField>
        <FormField label="Password" htmlFor="password" required>
          {(fieldProps) => (
            <PasswordInput {...fieldProps} autoComplete="new-password" placeholder="Create your password" value={password} onChange={(e) => setPassword(e.target.value)} />
          )}
        </FormField>
        {password ? <PasswordStrengthMeter checks={checks} strength={strength} /> : null}

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
          onClick={() => void supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })}
        >
          Continue with Google
        </Button>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-neutral-400">
          <ShieldCheck size={14} /> By creating an account you agree to our Terms &amp; Conditions and Privacy Policy.
        </p>
      </form>
    </AuthShell>
  );
}
