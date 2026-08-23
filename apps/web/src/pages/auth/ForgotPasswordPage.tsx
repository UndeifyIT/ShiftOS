import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock3, Lock, Mail, Users } from 'lucide-react';
import { Button, FormField, InlineError, Input } from '@shiftos/ui';
import { supabase } from '../../lib/supabase.js';
import { isNetworkError } from '../../lib/authErrors.js';
import { AuthShell, type AuthBenefit, type AuthHighlight } from './AuthShell.js';
import { AuthStatusPanel } from './AuthStatusPanel.js';

const HIGHLIGHT: AuthHighlight = {
  icon: Clock3,
  title: 'Links expire in 20 minutes',
  body: "Short-lived links keep your organization's data safe if an inbox is shared."
};

const BENEFITS: AuthBenefit[] = [
  { icon: Mail, title: 'One email', body: 'Sent to the address on your account.' },
  { icon: Clock3, title: '20-minute window', body: 'Request a new link any time.' },
  { icon: Lock, title: 'Nothing changes yet', body: 'Your current password still works.' },
  { icon: Users, title: 'Need a hand?', body: 'Your manager can also reset it for you.' }
];

/** SHARED-002 — Forgot Password, styled to match Reset Password (SHARED-003). */
export default function ForgotPasswordPage(): React.ReactElement {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const sendResetLink = async (): Promise<void> => {
    setSubmitting(true);
    setError(null);
    setNetworkError(false);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      // Supabase never reveals whether the email is registered — always show
      // the same success state regardless of outcome (account-enumeration safe).
      if (!resetError) {
        setSent(true);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch (err) {
      if (isNetworkError(err)) setNetworkError(true);
      else setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    if (!email) {
      setError('Enter your email.');
      return;
    }
    void sendResetLink();
  };

  return (
    <AuthShell
      eyebrow="Password help"
      title="Forgot Your"
      accent="Password?"
      body="Enter the work email on your ShiftOS account and we'll send a secure reset link. Your branch data stays untouched."
      highlight={HIGHLIGHT}
      benefits={BENEFITS}
      topRightPrompt="Remember your password?"
      topRightLinkLabel="Sign in"
      topRightLinkTo="/sign-in"
    >
      {networkError ? (
        <AuthStatusPanel
          icon={Clock3}
          tone="warn"
          title="Couldn't reach ShiftOS"
          body="Check your internet connection and try again."
          ctaLabel="Try again"
          ctaLoading={submitting}
          onCta={() => void sendResetLink()}
        />
      ) : sent ? (
        <AuthStatusPanel
          icon={Mail}
          tone="primary"
          title="Reset link sent"
          body="If that email belongs to a ShiftOS account, a reset link is on its way."
          meta="Didn't arrive within a few minutes? Check spam, or request another link."
          ctaLabel="Back to sign in"
          onCta={() => navigate('/sign-in')}
          secondaryLabel="Send another link"
          onSecondary={() => void sendResetLink()}
        />
      ) : (
        <>
          <h2 className="text-2xl font-bold text-neutral-900">Reset your password</h2>
          <p className="mt-1 text-sm text-neutral-500">We&rsquo;ll email you a secure reset link.</p>

          <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
            <FormField label="Work Email" htmlFor="email" required>
              {(fieldProps) => (
                <Input {...fieldProps} type="email" autoComplete="email" placeholder="Enter your work email" value={email} onChange={(e) => setEmail(e.target.value)} />
              )}
            </FormField>
            {error ? <InlineError message={error} /> : null}
            <Button type="submit" loading={submitting} fullWidth size="lg">
              Send reset link →
            </Button>
            <p className="text-center text-xs text-neutral-400">
              For security we send the same confirmation whether or not the email is registered.
            </p>
          </form>
        </>
      )}
    </AuthShell>
  );
}
