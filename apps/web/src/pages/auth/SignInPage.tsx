import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, CalendarClock, MessageSquare, Clock3, Lock } from 'lucide-react';
import { FormField } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { supabase } from '../../lib/supabase.js';
import { isNetworkError } from '../../lib/authErrors.js';
import { AuthShell, type AuthBenefit, type AuthHighlight } from './AuthShell.js';
import { AuthBanner, AuthCheckbox, AuthGoogleButton, AuthInput, AuthSubmit } from './AuthInputs.js';
import { PasswordInput } from './PasswordInput.js';

const HIGHLIGHT: AuthHighlight = {
  icon: Lock,
  title: 'One account, one workspace',
  body: "You'll land in the branch and role your organization assigned to you."
};

const BENEFITS: AuthBenefit[] = [
  { icon: BarChart3, title: 'Access dashboard', body: "Your role's view, ready on sign-in." },
  { icon: Clock3, title: 'Live shift data', body: 'Attendance and tasks as they happen.' },
  { icon: CalendarClock, title: 'Manage schedules', body: 'Build, publish and adjust the week.' },
  { icon: MessageSquare, title: 'Branch updates', body: 'Announcements your team must read.' }
];

/** SHARED-001 — Sign In (WF-001). */
export default function SignInPage(): React.ReactElement {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!email || !password) {
      setError('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      window.localStorage.setItem('shiftos.rememberMe', rememberMe ? 'true' : 'false');
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError(
          isNetworkError(signInError)
            ? "Couldn't reach ShiftOS. Check your connection and try again."
            : 'Invalid email or password.'
        );
      }
    } catch (err) {
      setError(isNetworkError(err) ? "Couldn't reach ShiftOS. Check your connection and try again." : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async (): Promise<void> => {
    setGoogleLoading(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (oauthError) {
      setError('Google sign-in is not available right now.');
      setGoogleLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Welcome Back. Access Your"
      accent="Workspace"
      body="Sign in to continue managing schedules, staff and daily operations from one secure platform."
      highlight={HIGHLIGHT}
      benefits={BENEFITS}
      topRightPrompt="Don't have an account?"
      topRightLinkLabel="Sign up"
      topRightLinkTo="/sign-up"
    >
      <h2 className="text-center text-[22px] font-extrabold tracking-[-0.02em] text-neutral-900">Sign in to your account</h2>
      <p className="mt-2 text-center text-[13px] text-neutral-500">Access your active workspace</p>

      <form onSubmit={handleSubmit} noValidate className="mt-[18px] flex flex-col gap-[15px]">
        <FormField label="Work Email" htmlFor="email" required>
          {(fieldProps) => (
            <AuthInput {...fieldProps} type="email" autoComplete="email" placeholder="Enter your work email" value={email} onChange={(e) => setEmail(e.target.value)} />
          )}
        </FormField>
        <div>
          <FormField label="Password" htmlFor="password" required>
            {(fieldProps) => (
              <PasswordInput
                {...fieldProps}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </FormField>
          <Link to="/forgot-password" className="mt-1.5 block text-right text-[12.5px] font-bold text-brand-deep transition-colors hover:text-brand-500">
            Forgot Password?
          </Link>
        </div>

        <AuthCheckbox
          checked={rememberMe}
          onChange={setRememberMe}
          label="Keep me signed in"
          body="Only on this device — not on shared branch terminals."
        />

        {error ? (
          <AuthBanner
            tone={error.includes("reach ShiftOS") || error.includes('connection') ? 'warn' : 'bad'}
            title={error.includes("reach ShiftOS") || error.includes('connection') ? "Couldn't reach ShiftOS" : 'Invalid email or password'}
            body={error}
          />
        ) : null}
        <AuthSubmit loading={submitting} loadingLabel="Signing you in…">
          Sign in →
        </AuthSubmit>

        <div>
          <div className="flex items-center gap-3 text-xs text-neutral-400">
            <span className="h-px flex-1 bg-neutral-200" />
            or
            <span className="h-px flex-1 bg-neutral-200" />
          </div>
          <div className="mt-3">
            <AuthGoogleButton onClick={() => void handleGoogleSignIn()} loading={googleLoading} />
          </div>
        </div>

        <p className="text-center text-[11.5px] leading-normal text-neutral-400">
          By signing in you agree to our{' '}
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
