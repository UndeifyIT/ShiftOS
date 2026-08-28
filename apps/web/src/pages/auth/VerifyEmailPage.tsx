import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, Clock3, Mail, ShieldCheck, Users, WifiOff } from 'lucide-react';
import { FormField } from '@shiftos/ui';
import { supabase } from '../../lib/supabase.js';
import { isNetworkError } from '../../lib/authErrors.js';
import { AuthShell, type AuthBenefit } from './AuthShell.js';
import { AuthInput, AuthSubmit } from './AuthInputs.js';
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
      // No `if (data.session) setView('success')` branch here: this page only
      // ever renders while SessionProvider's status is 'unauthenticated'
      // (see App.tsx), which by definition means there is no session — so
      // that check would never fire and was dead code.
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
    setResent(false);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'signup' });
      if (verifyError) {
        if (isNetworkError(verifyError)) {
          setView('network-error');
        } else {
          setError("That code isn't right. Check the most recent email — earlier codes stop working once a new one is sent.");
        }
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
        if (isNetworkError(resendError)) {
          setView('network-error');
        } else {
          setError('Could not resend the code. Please try again in a moment.');
        }
      } else {
        setResent(true);
      }
    } catch (err) {
      if (isNetworkError(err)) {
        setView('network-error');
      } else {
        setError('Something went wrong. Please try again.');
      }
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
          icon={WifiOff}
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
          onCta={() => navigate('/complete-profile')}
        />
      ) : (
        <>
          <h2 className="text-center text-[22px] font-extrabold tracking-[-0.02em] text-neutral-900">Verify your email</h2>
          <p className="mt-2 text-center text-[13px] text-neutral-500">
            Enter the 6-digit code from the email we sent to {email}.
          </p>

          <form onSubmit={handleVerify} noValidate className="mt-[18px] flex flex-col gap-[15px]">
            <FormField label="Verification Code" htmlFor="code" required hint="6 digits" error={error ?? undefined}>
              {(fieldProps) => (
                <AuthInput
                  {...fieldProps}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  maxLength={6}
                  invalid={!!error}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, ''));
                    setError(null);
                  }}
                />
              )}
            </FormField>
            <AuthSubmit loading={submitting} loadingLabel="Verifying…">
              Verify email →
            </AuthSubmit>
            <p className="text-center text-[12.5px] text-neutral-500">
              Didn't get the email?{' '}
              <button
                type="button"
                onClick={() => void handleResend()}
                disabled={resending}
                className="cursor-pointer font-bold text-brand-deep transition-colors hover:text-brand-500 disabled:text-neutral-400"
              >
                {resending ? 'Resending…' : resent ? 'Code resent — check your email' : 'Resend verification link'}
              </button>
            </p>
            <p className="text-center text-[11.5px] leading-normal text-neutral-400">
              Codes and links expire after 24 hours for your security.
            </p>
          </form>
        </>
      )}
    </AuthShell>
  );
}
