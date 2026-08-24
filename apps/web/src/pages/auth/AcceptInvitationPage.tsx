import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, Clock3, ShieldCheck, User, XCircle } from 'lucide-react';
import { Button, FormField, InlineError } from '@shiftos/ui';
import { supabase } from '../../lib/supabase.js';
import { checklistFor, strengthFor } from '../../lib/password.js';
import { isNetworkError } from '../../lib/authErrors.js';
import { AuthShell, type AuthBenefit, type AuthHighlight } from './AuthShell.js';
import { AuthStatusPanel } from './AuthStatusPanel.js';
import { PasswordInput } from './PasswordInput.js';
import { PasswordStrengthMeter } from './PasswordStrengthMeter.js';

const HIGHLIGHT: AuthHighlight = {
  icon: User,
  title: 'Your access is already scoped',
  body: 'Role, branch and permissions were set by the person who invited you.'
};

interface PendingInvitation {
  organization_name: string;
  role_name: string;
  branch_names: string[];
  invited_by_name: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
}

type View = 'loading' | 'form' | 'expired' | 'used' | 'revoked' | 'not-found' | 'success' | 'network-error';

/**
 * SHARED-005 — Accept Invitation / Account Setup (WF-002). The invite email
 * link (packages/auth's inviteUser) establishes a session the same way a
 * password-recovery link does; get_pending_invitation() (044) previews the
 * real invitation details before the person sets a password, and
 * accept_invitation() (031/033, called from SessionProvider's bootstrap once
 * the auth session updates after this form submits) turns it into real
 * organization membership + role + branch access — this page stays unaware
 * of that assignment logic, matching the separation already used for the
 * brand-new-org case (create_organization_with_owner).
 */
export default function AcceptInvitationPage(): React.ReactElement {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('loading');
  const [invitation, setInvitation] = useState<PendingInvitation | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc('get_pending_invitation').maybeSingle<PendingInvitation>();
        if (cancelled) return;
        if (rpcError) {
          setView(isNetworkError(rpcError) ? 'network-error' : 'not-found');
          return;
        }
        if (!data) {
          setView('not-found');
          return;
        }
        setInvitation(data);
        setView(
          data.status === 'expired'
            ? 'expired'
            : data.status === 'revoked'
              ? 'revoked'
              : data.status !== 'pending'
                ? 'used'
                : 'form'
        );
      } catch (err) {
        if (!cancelled) setView(isNetworkError(err) ? 'network-error' : 'not-found');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const checks = useMemo(() => checklistFor(password), [password]);
  const strength = useMemo(() => strengthFor(checks), [checks]);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (checks.some((c) => !c.passed)) {
      setError('Password does not meet all requirements yet.');
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
      if (updateError) {
        if (isNetworkError(updateError)) {
          setView('network-error');
        } else {
          setError('This invitation link has expired. Ask your administrator to resend it.');
        }
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

  const benefits: AuthBenefit[] = invitation
    ? [
        { icon: Building2, title: invitation.organization_name, body: invitation.branch_names.join(', ') || 'All branches' },
        { icon: ShieldCheck, title: `${invitation.role_name} role`, body: 'Access scoped by your organization.' },
        { icon: Clock3, title: 'Invitation valid 7 days', body: `Expires ${new Date(invitation.expires_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}.` },
        { icon: User, title: 'Invited by', body: `${invitation.invited_by_name}.` }
      ]
    : [];

  return (
    <AuthShell
      eyebrow="You've been invited"
      title="Join Your Team on"
      accent="ShiftOS"
      body="Your manager has invited you to a ShiftOS organization. Set a password to activate your account."
      highlight={HIGHLIGHT}
      benefits={benefits}
      topRightPrompt="Not your invitation?"
      topRightLinkLabel="Contact your manager"
    >
      {view === 'loading' ? (
        <div className="py-16 text-center text-sm text-neutral-400">Checking your invitation…</div>
      ) : view === 'network-error' ? (
        <AuthStatusPanel
          icon={Clock3}
          tone="warn"
          title="Couldn't reach ShiftOS"
          body="Check your internet connection and try again."
          ctaLabel="Try again"
          onCta={() => window.location.reload()}
        />
      ) : view === 'not-found' ? (
        <AuthStatusPanel
          icon={XCircle}
          tone="bad"
          title="No invitation found"
          body="We couldn't find a pending invitation for your account. Ask your administrator to send one."
          ctaLabel="Back to sign in"
          onCta={() => navigate('/sign-in')}
        />
      ) : view === 'expired' ? (
        <AuthStatusPanel
          icon={Clock3}
          tone="warn"
          title="This invitation has expired"
          body={`Invitations are valid for 7 days. Ask ${invitation?.invited_by_name ?? 'your manager'} to send a new one — your place on the team is unaffected.`}
          ctaLabel="Back to sign in"
          onCta={() => navigate('/sign-in')}
        />
      ) : view === 'used' ? (
        <AuthStatusPanel
          icon={XCircle}
          tone="bad"
          title="This invitation was already accepted"
          body="An account already exists for this email. Sign in instead, or reset your password if you've forgotten it."
          ctaLabel="Go to sign in"
          onCta={() => navigate('/sign-in')}
          secondaryLabel="Reset password"
          onSecondary={() => navigate('/forgot-password')}
        />
      ) : view === 'revoked' ? (
        <AuthStatusPanel
          icon={XCircle}
          tone="bad"
          title="This invitation was revoked"
          body="Your administrator withdrew this invitation. Contact them if you still need access."
          ctaLabel="Back to sign in"
          onCta={() => navigate('/sign-in')}
        />
      ) : view === 'success' ? (
        <AuthStatusPanel
          icon={CheckCircle2}
          tone="ok"
          title="Welcome to ShiftOS"
          body="Your account is active. Next, complete your profile so your team can recognize you."
          ctaLabel="Complete profile →"
          onCta={() => navigate('/complete-profile')}
        />
      ) : (
        <>
          <h2 className="text-2xl font-bold text-neutral-900">Accept your invitation</h2>
          <p className="mt-1 text-sm text-neutral-500">Set a password to activate your ShiftOS account.</p>

          {invitation ? (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 lg:hidden">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-deep">
                <Building2 size={17} />
              </span>
              <div className="text-sm">
                <p className="font-semibold text-neutral-900">{invitation.organization_name}</p>
                <p className="text-neutral-500">{invitation.role_name} role{invitation.branch_names.length ? ` · ${invitation.branch_names.join(', ')}` : ''}</p>
              </div>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
            <FormField label="Create Password" htmlFor="password" required>
              {(fieldProps) => <PasswordInput {...fieldProps} autoComplete="new-password" placeholder="Create your password" value={password} onChange={(e) => setPassword(e.target.value)} />}
            </FormField>
            {password ? <PasswordStrengthMeter checks={checks} strength={strength} /> : null}
            <FormField label="Confirm Password" htmlFor="confirmPassword" required>
              {(fieldProps) => (
                <PasswordInput {...fieldProps} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              )}
            </FormField>
            {error ? <InlineError message={error} /> : null}
            <Button type="submit" loading={submitting} fullWidth size="lg">
              Accept invitation →
            </Button>
            <p className="text-center text-xs text-neutral-400">By accepting you agree to our Terms &amp; Conditions and Privacy Policy.</p>
          </form>
        </>
      )}
    </AuthShell>
  );
}
