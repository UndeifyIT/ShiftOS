import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Clock3, Mail, ShieldCheck, Users, WifiOff } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { isNetworkError } from '../../lib/authErrors.js';
import { AuthShell, type AuthBenefit } from './AuthShell.js';
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
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [view, setView] = useState<'checking' | 'no-email' | 'waiting' | 'network-error'>('checking');

  useEffect(() => {
    void supabase.auth.getSession().then(() => {
      // No `if (data.session) ...` branch here: this page only ever renders
      // while SessionProvider's status is 'unauthenticated' (see App.tsx),
      // which by definition means there is no session.
      const pending = window.sessionStorage.getItem(PENDING_EMAIL_KEY);
      if (!pending) {
        setView('no-email');
        return;
      }
      setEmail(pending);
      setView('waiting');
    });
  }, []);

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
          setError('Could not resend the email. Please try again in a moment.');
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
          onCta={() => setView('waiting')}
        />
      ) : view === 'no-email' ? (
        <AuthStatusPanel
          icon={Mail}
          tone="info"
          title="Nothing to verify yet"
          body="Start by creating your account — we'll send a confirmation link to your email."
          ctaLabel="Go to sign up"
          onCta={() => navigate('/sign-up')}
        />
      ) : (
        <AuthStatusPanel
          icon={Mail}
          tone="primary"
          title="Check your email"
          body={`We sent a confirmation link to ${email}. Open it and click the link to verify your account, then come back here to log in.`}
          meta={error ?? (resent ? 'Link resent — check your email.' : "Didn't arrive within a few minutes? Check spam, or resend it below.")}
          ctaLabel="Link confirmed — Log in"
          onCta={() => navigate('/sign-in')}
          secondaryLabel={resending ? 'Resending…' : 'Resend confirmation link'}
          onSecondary={() => void handleResend()}
        />
      )}
    </AuthShell>
  );
}
