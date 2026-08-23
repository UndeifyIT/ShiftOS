import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, CalendarClock, MessageSquare, Clock3, Lock, ShieldCheck } from 'lucide-react';
import { Button, FormField, InlineError, Input } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { supabase } from '../../lib/supabase.js';
import { isNetworkError } from '../../lib/authErrors.js';
import { AuthShell, type AuthBenefit, type AuthHighlight } from './AuthShell.js';
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
      const { error: signInError } = await signIn(email, password);
      if (signInError) setError(signInError);
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
      <h2 className="text-2xl font-bold text-neutral-900">Sign in to your account</h2>
      <p className="mt-1 text-sm text-neutral-500">Access your active workspace</p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <FormField label="Work Email" htmlFor="email" required>
          {(fieldProps) => (
            <Input {...fieldProps} type="email" autoComplete="email" placeholder="Enter your work email" value={email} onChange={(e) => setEmail(e.target.value)} />
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
          <Link to="/forgot-password" className="mt-1.5 block text-right text-xs font-medium text-brand-600 hover:text-brand-700">
            Forgot Password?
          </Link>
        </div>
        {error ? <InlineError message={error} /> : null}
        <Button type="submit" loading={submitting} fullWidth size="lg">
          Sign in →
        </Button>

        <div className="flex items-center gap-3 text-xs text-neutral-400">
          <span className="h-px flex-1 bg-neutral-200" />
          or
          <span className="h-px flex-1 bg-neutral-200" />
        </div>

        <Button type="button" variant="secondary" fullWidth size="lg" onClick={() => void handleGoogleSignIn()} loading={googleLoading}>
          <GoogleIcon /> Continue with Google
        </Button>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-neutral-400">
          <ShieldCheck size={14} /> By signing in you agree to our Terms &amp; Conditions and Privacy Policy.
        </p>
      </form>
    </AuthShell>
  );
}

function GoogleIcon(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4c-7.5 0-14 4.1-17.7 10.7z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6C29.6 34.9 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.9 39.8 16.4 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C41.5 35.9 44 30.4 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}
