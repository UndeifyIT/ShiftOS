import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, Clock3, Mail, ShieldCheck, Users } from 'lucide-react';
import { Button, FormField, InlineError, Input } from '@shiftos/ui';
import { supabase } from '../../lib/supabase.js';
import { isNetworkError } from '../../lib/authErrors.js';
import { AuthShell, type AuthBenefit, type AuthHighlight } from './AuthShell.js';
import { AuthStatusPanel } from './AuthStatusPanel.js';

const BENEFITS: AuthBenefit[] = [
  { icon: ShieldCheck, title: "Confirms it's you", body: 'Protects the organization you create.' },
  { icon: Clock3, title: 'Valid for 24 hours', body: 'Request a new link any time.' },
  { icon: Building2, title: 'Unlocks setup', body: 'Onboarding starts once verified.' },
  { icon: Users, title: 'Enables invitations', body: 'Needed before inviting your team.' }
];

const PENDING_EMAIL_KEY = 'shiftos.pendingVerifyEmail';

/** SHARED-004 — Email Verification (WF-001 decision point: unverified email is blocked, not a generic error, DEC-019). */
export default function VerifyEmailPage(): React.ReactElement {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [view, setView] = useState<'checking' | 'no-email' | 'form' | 'success' | 'network-error'>('checking');

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setView('success');
        return;
      }
      const pending = window.sessionStorage.getItem(PENDING_EMAIL_KEY);
      if (!pending) {
        setView('no-email');
        return;
      }
      setEmail(pending);
      setView('form');
    });
  }, []);

  const handleVerify = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!email) return;
    if (code.trim().length !== 6) {
      setError('Enter the 6-digit code from the email.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'signup' });
      if (verifyError) {
        setError("That code isn't right. Check the most recent email — earlier codes stop working once a new one is sent.");
        return;
      }
      window.sessionStorage.removeItem(PENDING_EMAIL_KEY);
      setView('success');
    } catch (err) {
      if (isNetworkError(err)) setView('network-error');
      else setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async (): Promise<void> => {
    if (!email) return;
    setResending(true);
    setError(null);
    try {
      const { error: resendError } = await supabase.auth.resend({ type: 'signup', email });
      if (resendError) {
        setError('Could not resend the code. Please try again in a moment.');
      } else {
        setResent(true);
      }
    } catch (err) {
      if (isNetworkError(err)) setView('network-error');
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      eyebrow="One step left"
      title="Verify Your"
      accent="Email"
      body="Confirm your email address so we can secure your account and finish creating your organization workspace."
      highlight={email ? { icon: Mail, title: `Sent to ${email}`, body: 'Wrong address? Change it before verifying.' } : undefined}
      benefits={BENEFITS}
      topRightPrompt="Wrong email address?"
      topRightLinkLabel="Change it"
      topRightLinkTo="/sign-up"
    >
      {view === 'checking' ? (
        <div className="py-16 text-center text-sm text-neutral-400">Checking your session…</div>
      ) : view === 'network-error' ? (
        <AuthStatusPanel
          icon={Clock3}
          tone="warn"
          title="Couldn't reach ShiftOS"
          body="Check your internet connection and try again."
          ctaLabel="Try again"
          onCta={() => setView('form')}
        />
      ) : view === 'no-email' ? (
        <AuthStatusPanel
          icon={Mail}
          tone="info"
          title="Nothing to verify yet"
          body="Start by creating your account — we'll send a verification code to your email."
          ctaLabel="Go to sign up"
          onCta={() => navigate('/sign-up')}
        />
      ) : view === 'success' ? (
        <AuthStatusPanel
          icon={CheckCircle2}
          tone="ok"
          title="Email verified"
          body="Your account is confirmed. Next, set up your organization."
          ctaLabel="Start setup →"
          onCta={() => navigate('/sign-in')}
        />
      ) : (
        <>
          <h2 className="text-2xl font-bold text-neutral-900">Verify your email</h2>
          <p className="mt-1 text-sm text-neutral-500">Enter the 6-digit code from the email we sent to {email}.</p>

          <form onSubmit={handleVerify} noValidate className="mt-6 flex flex-col gap-4">
            <FormField label="Verification Code" htmlFor="code" required hint="6 digits">
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                />
              )}
            </FormField>
            {error ? <InlineError message={error} /> : null}
            <Button type="submit" loading={submitting} fullWidth size="lg">
              Verify email →
            </Button>
            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={resending}
              className="text-center text-sm font-medium text-brand-600 hover:text-brand-700 disabled:text-neutral-400"
            >
              {resending ? 'Resending…' : resent ? 'Code resent — check your email' : 'Resend code'}
            </button>
            <p className="text-center text-xs text-neutral-400">Codes and links expire after 24 hours for your security.</p>
          </form>
        </>
      )}
    </AuthShell>
  );
}
