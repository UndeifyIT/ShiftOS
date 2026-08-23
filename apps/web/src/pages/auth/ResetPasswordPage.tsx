import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, CheckCircle2, Clock, Lock, RotateCw, ShieldCheck, Users, X } from 'lucide-react';
import { Button, FormField, InlineError } from '@shiftos/ui';
import { supabase } from '../../lib/supabase.js';
import { checklistFor, strengthFor } from '../../lib/password.js';
import { AuthMarketingLayout } from './AuthMarketingLayout.js';
import { PasswordInput } from './PasswordInput.js';

const FEATURES = [
  { icon: Lock, title: 'Secure & Protected', description: 'Your new password is encrypted and your data stays safe.' },
  { icon: Users, title: "You're in Control", description: 'Only you can access your account with your new password.' },
  { icon: ShieldCheck, title: 'Peace of Mind', description: "We'll also sign you out of all other devices for your security." }
];

type View = 'checking' | 'form' | 'expired' | 'success';

/**
 * SHARED-003 — Reset Password. Three visual states from the same reference
 * design (default form / expired link / success) map to real logic here,
 * not separate mockups: 'expired' means the recovery link's session never
 * got established (detectSessionInUrl found nothing valid to exchange),
 * 'success' means updateUser() actually succeeded.
 */
export default function ResetPasswordPage(): React.ReactElement {
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
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (signOutOthers) {
      await supabase.auth.signOut({ scope: 'others' });
    }
    setSubmitting(false);
    if (updateError) {
      setView('expired');
      return;
    }
    setView('success');
  };

  return (
    <AuthMarketingLayout
      eyebrow="Secure Password Reset"
      heading="Create a New Password"
      description="Your new password must be strong and unique to keep your ShiftOS account and branch data secure."
      features={FEATURES}
      topRightPrompt="Remember your password?"
      topRightLinkLabel="Sign In"
      topRightLinkTo="/sign-in"
    >
      {view === 'checking' ? (
        <div className="py-16 text-center text-sm text-neutral-400">Checking your link…</div>
      ) : view === 'expired' ? (
        <div className="py-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning-50 text-warning-600">
            <Clock size={26} />
          </div>
          <h2 className="mt-4 text-xl font-bold text-neutral-900">This link has expired</h2>
          <p className="mt-2 text-sm text-neutral-500">For your security, password reset links expire after 20 minutes.</p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <Link
              to="/forgot-password"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
            >
              <RotateCw size={16} /> Request New Link
            </Link>
            <Link to="/sign-in" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              Back to Sign In
            </Link>
          </div>
        </div>
      ) : view === 'success' ? (
        <div className="py-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-50 text-success-600">
            <CheckCircle2 size={26} />
          </div>
          <h2 className="mt-4 text-xl font-bold text-neutral-900">Password Updated Successfully!</h2>
          <p className="mt-2 text-sm text-neutral-500">Your password has been changed and all other devices have been signed out.</p>
          <Link
            to="/sign-in"
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Continue to Sign In →
          </Link>
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-neutral-900">Reset Your Password</h2>
          <p className="mt-1 text-sm text-neutral-500">Enter and confirm your new password below.</p>

          <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_13rem]">
              <div className="flex flex-col gap-4">
                <FormField label="New Password" htmlFor="password" required>
                  {(fieldProps) => <PasswordInput {...fieldProps} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
                </FormField>
                {password ? (
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-500">Password Strength:</span>
                      <span className={strength.label === 'Strong' ? 'font-semibold text-success-600' : strength.label === 'Fair' ? 'font-semibold text-warning-600' : 'font-semibold text-error-600'}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                      <div className={['h-full rounded-full transition-all', strength.color].join(' ')} style={{ width: `${strength.ratio * 100}%` }} />
                    </div>
                  </div>
                ) : null}
                <FormField label="Confirm Password" htmlFor="confirmPassword" required>
                  {(fieldProps) => (
                    <PasswordInput {...fieldProps} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  )}
                </FormField>
              </div>

              <div className="rounded-xl bg-brand-50 p-4">
                <p className="mb-2 text-xs font-semibold text-neutral-700">Password must include:</p>
                <ul className="flex flex-col gap-1.5">
                  {checks.map((check) => (
                    <li key={check.label} className={['flex items-center gap-1.5 text-xs', check.passed ? 'text-success-700' : 'text-neutral-400'].join(' ')}>
                      {check.passed ? <Check size={13} /> : <X size={13} />}
                      {check.label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

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
              Reset Password →
            </Button>
            <p className="text-center text-xs text-neutral-400">For security reasons, this reset link will expire in 20 minutes.</p>
          </form>
        </>
      )}
    </AuthMarketingLayout>
  );
}
