import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Calendar, Info, Lock, MessageSquare, Users } from 'lucide-react';
import { FormField } from '@shiftos/ui';
import { supabase } from '../../lib/supabase.js';
import { checklistFor, strengthFor } from '../../lib/password.js';
import { isNetworkError } from '../../lib/authErrors.js';
import { AuthShell, type AuthBenefit, type AuthHighlight } from './AuthShell.js';
import { AuthBanner, AuthGoogleButton, AuthInput, AuthSubmit } from './AuthInputs.js';
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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SignUpField = 'fullName' | 'email' | 'whatsapp' | 'password';

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
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<SignUpField, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  const checks = useMemo(() => checklistFor(password), [password]);
  const strength = useMemo(() => strengthFor(checks), [checks]);

  const clearFieldError = (field: SignUpField): void => {
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validate = (): Partial<Record<SignUpField, string>> => {
    const errs: Partial<Record<SignUpField, string>> = {};
    if (!fullName.trim()) errs.fullName = 'Full name is required.';
    if (!email) {
      errs.email = 'Work email is required.';
    } else if (!EMAIL_PATTERN.test(email)) {
      errs.email = 'Enter a valid work email address.';
    }
    if (!whatsapp.trim()) errs.whatsapp = 'WhatsApp number is required.';
    if (checks.some((c) => !c.passed)) errs.password = 'Password must meet every requirement below.';
    return errs;
  };

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
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

  const handleGoogleSignUp = async (): Promise<void> => {
    setGoogleLoading(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (oauthError) {
      setError('Google sign-up is not available right now.');
      setGoogleLoading(false);
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
      <h2 className="text-center text-[22px] font-extrabold tracking-[-0.02em] text-neutral-900">Create your account</h2>
      <p className="mt-2 text-center text-[13px] text-neutral-500">Start your 30-day free trial. Cancel anytime.</p>

      <div className="mt-4.5 flex gap-[11px] rounded-[14px] border border-[#F7DFD1] bg-brand-soft p-[13px_14px] text-brand-800">
        <Info className="size-[18px] shrink-0" aria-hidden="true" />
        <p className="text-[12.5px] leading-relaxed">
          <span className="font-extrabold">This account creates a new organization.</span> Sign up here only if you're a manager
          or branch head. Supervisors and employees should wait for an invitation email instead of creating their own account.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-[18px] flex flex-col gap-[15px]">
        {Object.keys(fieldErrors).length > 0 ? (
          <AuthBanner
            tone="bad"
            title="Check the highlighted fields"
            body={
              Object.keys(fieldErrors).length === 1
                ? 'One field needs attention before we can create your account.'
                : `${Object.keys(fieldErrors).length} fields need attention before we can create your account.`
            }
          />
        ) : null}
        <FormField label="Full Name" htmlFor="fullName" required error={fieldErrors.fullName}>
          {(fieldProps) => (
            <AuthInput
              {...fieldProps}
              placeholder="Enter your full name"
              autoComplete="name"
              value={fullName}
              invalid={!!fieldErrors.fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                clearFieldError('fullName');
              }}
            />
          )}
        </FormField>
        <FormField label="Work Email" htmlFor="email" required error={fieldErrors.email}>
          {(fieldProps) => (
            <AuthInput
              {...fieldProps}
              type="email"
              autoComplete="email"
              placeholder="Enter your work email"
              value={email}
              invalid={!!fieldErrors.email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError('email');
              }}
            />
          )}
        </FormField>
        <FormField label="WhatsApp Number" htmlFor="whatsapp" required error={fieldErrors.whatsapp}>
          {(fieldProps) => (
            <div className="flex">
              <span className="flex items-center rounded-l-xl border border-r-0 border-neutral-300 bg-[#F7F4F1] px-3 text-[13.5px] text-neutral-600">
                +234
              </span>
              <AuthInput
                {...fieldProps}
                type="tel"
                autoComplete="tel"
                className="rounded-l-none"
                placeholder="801 234 5678"
                value={whatsapp}
                invalid={!!fieldErrors.whatsapp}
                onChange={(e) => {
                  setWhatsapp(e.target.value);
                  clearFieldError('whatsapp');
                }}
              />
            </div>
          )}
        </FormField>
        <FormField label="Password" htmlFor="password" required error={fieldErrors.password} hint="Manager creates the organization">
          {(fieldProps) => (
            <PasswordInput
              {...fieldProps}
              autoComplete="new-password"
              placeholder="Create your password"
              value={password}
              invalid={!!fieldErrors.password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearFieldError('password');
              }}
            />
          )}
        </FormField>
        {password ? <PasswordStrengthMeter checks={checks} strength={strength} /> : null}

        {error ? (
          <AuthBanner
            tone={error.includes('reach ShiftOS') || error.includes('connection') ? 'warn' : 'bad'}
            title={error.includes('reach ShiftOS') || error.includes('connection') ? "Couldn't reach ShiftOS" : "Couldn't create your account"}
            body={error}
          />
        ) : null}
        <AuthSubmit loading={submitting} loadingLabel="Creating your account…">
          Continue →
        </AuthSubmit>

        <div>
          <div className="flex items-center gap-3 text-xs text-neutral-400">
            <span className="h-px flex-1 bg-neutral-200" />
            or
            <span className="h-px flex-1 bg-neutral-200" />
          </div>
          <div className="mt-3">
            <AuthGoogleButton onClick={() => void handleGoogleSignUp()} loading={googleLoading} />
          </div>
        </div>

        <p className="text-center text-[11.5px] leading-normal text-neutral-400">
          By creating an account you agree to our{' '}
          <Link to="/terms" className="font-bold text-brand-deep hover:text-brand-500">
            Terms &amp; Conditions
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="font-bold text-brand-deep hover:text-brand-500">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </AuthShell>
  );
}
