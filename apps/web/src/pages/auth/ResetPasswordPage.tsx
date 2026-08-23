import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock3, Lock, ShieldCheck, User } from 'lucide-react';
import { Button, FormField, InlineError } from '@shiftos/ui';
import { supabase } from '../../lib/supabase.js';
import { checklistFor, strengthFor } from '../../lib/password.js';
import { isNetworkError } from '../../lib/authErrors.js';
import { AuthShell, type AuthBenefit, type AuthHighlight } from './AuthShell.js';
import { AuthStatusPanel } from './AuthStatusPanel.js';
import { PasswordInput } from './PasswordInput.js';
import { PasswordStrengthMeter } from './PasswordStrengthMeter.js';

const HIGHLIGHT: AuthHighlight = {
  icon: ShieldCheck,
  title: "You're in control",
  body: 'Only you can access your account with your new password.'
};

const BENEFITS: AuthBenefit[] = [
  { icon: Lock, title: 'Secure & protected', body: 'Your password is encrypted at rest.' },
  { icon: User, title: "You're in control", body: 'Only you can access your account.' },
  { icon: ShieldCheck, title: 'Peace of mind', body: 'We can sign out all other devices.' },
  { icon: Clock3, title: '20-minute link', body: 'Expired links can be reissued.' }
];

type View = 'checking' | 'form' | 'expired' | 'success' | 'network-error';

/**
 * SHARED-003 — Reset Password. The design distinguishes "Expired link" from
 * "Used link", but Supabase's client SDK can't reliably tell those apart for
 * password recovery (no authoritative server-side status to check, unlike
 * Accept Invitation) — both collapse into a single "expired" state here, a
 * documented scope trim (see the Auth phase design spec).
 */
export default function ResetPasswordPage(): React.ReactElement {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signOutOthers, setSignOutOthers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setView(data.session ? 'form' : 'expired'));
  }, []);

  const checks = useMemo(() => checklistFor(password), [password]);
  const strength = useMemo(() => strengthFor(checks), [checks]);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (checks.some((c) => !c.passed)) {
      setError('Your password does not meet all requirements yet.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (signOutOthers) {
        await supabase.auth.signOut({ scope: 'others' });
      }
      if (updateError) {
        setView('expired');
        return;
      }
      setView('success');
    } catch (err) {
      if (isNetworkError(err)) setView('network-error');
      else setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Secure password reset"
      title="Create a New"
      accent="Password"
      body="Your new password must be strong and unique to keep your ShiftOS account and branch data secure."
      highlight={HIGHLIGHT}
      benefits={BENEFITS}
      topRightPrompt="Remember your password?"
      topRightLinkLabel="Sign in"
      topRightLinkTo="/sign-in"
    >
      {view === 'checking' ? (
        <div className="py-16 text-center text-sm text-neutral-400">Checking your link…</div>
      ) : view === 'network-error' ? (
        <AuthStatusPanel
          icon={Clock3}
          tone="warn"
          title="Couldn't reach ShiftOS"
          body="Check your internet connection and try again."
          ctaLabel="Try again"
          onCta={() => setView('form')}
        />
      ) : view === 'expired' ? (
        <AuthStatusPanel
          icon={Clock3}
          tone="warn"
          title="This link has expired"
          body="For your security, password reset links expire after 20 minutes."
          ctaLabel="Request new link"
          onCta={() => navigate('/forgot-password')}
          secondaryLabel="Back to sign in"
          onSecondary={() => navigate('/sign-in')}
        />
      ) : view === 'success' ? (
        <AuthStatusPanel
          icon={CheckCircle2}
          tone="ok"
          title="Password updated successfully"
          body="Your password has been changed and all other devices have been signed out."
          ctaLabel="Continue to sign in →"
          onCta={() => navigate('/sign-in')}
        />
      ) : (
        <>
          <h2 className="text-2xl font-bold text-neutral-900">Reset your password</h2>
          <p className="mt-1 text-sm text-neutral-500">Enter and confirm your new password below.</p>

          <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
            <FormField label="New Password" htmlFor="password" required>
              {(fieldProps) => <PasswordInput {...fieldProps} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
            </FormField>
            {password ? <PasswordStrengthMeter checks={checks} strength={strength} /> : null}
            <FormField label="Confirm Password" htmlFor="confirmPassword" required>
              {(fieldProps) => (
                <PasswordInput {...fieldProps} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              )}
            </FormField>

            <label className="flex items-start gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={signOutOthers}
                onChange={(e) => setSignOutOthers(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-brand-700"
              />
              <span>
                Sign out all other devices
                <span className="block text-xs text-neutral-400">This will end all active sessions except this one.</span>
              </span>
            </label>

            {error ? <InlineError message={error} /> : null}
            <Button type="submit" loading={submitting} fullWidth size="lg">
              Reset password →
            </Button>
            <p className="text-center text-xs text-neutral-400">For security reasons, this reset link will expire in 20 minutes.</p>
          </form>
        </>
      )}
    </AuthShell>
  );
}
