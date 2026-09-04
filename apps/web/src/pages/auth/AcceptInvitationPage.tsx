import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, Clock3, ShieldCheck, User, WifiOff, XCircle } from 'lucide-react';
import { FormField } from '@shiftos/ui';
import { supabase } from '../../lib/supabase.js';
import { checklistFor, strengthFor } from '../../lib/password.js';
import { isNetworkError, parseAuthHashError } from '../../lib/authErrors.js';
import { AuthShell, type AuthBenefit, type AuthHighlight } from './AuthShell.js';
import { AuthBanner, AuthSubmit } from './AuthInputs.js';
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
  has_other_pending_invitations: boolean;
}

type View = 'loading' | 'form' | 'expired' | 'used' | 'revoked' | 'not-found' | 'success' | 'network-error' | 'invalid-link' | 'multiple';

/** See the mount effect's own comment for why this needs to survive a remount. */
const ACCEPTED_SESSION_KEY = 'shiftos.acceptInvitation.justAccepted';

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
  // Guards the hash-error branch below against running more than once. The
  // branch is not naturally idempotent: it strips the error out of the URL
  // via history.replaceState as a side effect, so a second invocation of
  // this effect (observed in practice -- see the fix commit's report for the
  // reproduction) reads an already-emptied hash, silently falls through to
  // the normal fetch path instead, and overwrites the correct 'invalid-link'
  // view with a misleading generic "not found" once that fetch fails for an
  // unauthenticated caller. The `cancelled` flag a few lines down already
  // protects the async fetch branch the same way; this ref is the equivalent
  // protection for this branch's synchronous, immediate side effect.
  const invalidLinkHandledRef = useRef(false);

  useEffect(() => {
    // Setting the password below fires Supabase's USER_UPDATED auth event,
    // which SessionProvider reacts to by re-running its own session
    // bootstrap -- observed in practice to genuinely unmount and remount
    // this whole page ~20ms after handleSubmit calls setView('success')
    // (bootstrap resolving asynchronously ~300ms later, well after this
    // component has already been torn down and rebuilt). A fresh mount has
    // no memory of that local 'success' state, so its own fetch below finds
    // the invitation still 'pending' (accept_invitation() only runs once a
    // profile row exists, which doesn't happen until CompleteProfilePage)
    // and lands back on the plain form -- the invitee sees their password
    // submission appear to silently do nothing. sessionStorage (unlike
    // component state or a ref) survives that remount, so a fresh mount can
    // recognize "we already succeeded" before ever hitting the network.
    if (window.sessionStorage.getItem(ACCEPTED_SESSION_KEY) === '1') {
      setView('success');
      return;
    }

    // A bad/expired/consumed invite magic-link never establishes a session --
    // Supabase Auth instead redirects back here with the failure encoded as a
    // URL hash (e.g. #error=access_denied&error_code=otp_expired&...), which
    // previously fell straight through to get_pending_invitation() finding no
    // session/profile and landing on the generic "No invitation found" state.
    // Detect and handle it explicitly, before the RPC call, so the message
    // names the actual situation (an invalid link) rather than a vague
    // not-found. The raw error_description is logged for debugging only,
    // matching this codebase's existing console.error pattern for
    // non-user-facing auth diagnostics (see CompleteProfilePage.tsx) -- never
    // shown to the invitee. The hash is cleared from the URL so a refresh or
    // copy-pasted link doesn't keep re-triggering it.
    if (invalidLinkHandledRef.current) return;
    const hashError = parseAuthHashError(window.location.hash);
    if (hashError) {
      invalidLinkHandledRef.current = true;
      console.error('Accept-invitation link redirected with an auth error:', hashError);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      setView('invalid-link');
      return;
    }

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
                : data.has_other_pending_invitations
                  ? 'multiple'
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
      // Written before setView so it's already in place if the USER_UPDATED
      // event this same call fires (see the mount effect's comment) causes a
      // remount before this render even commits.
      window.sessionStorage.setItem(ACCEPTED_SESSION_KEY, '1');
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
          icon={WifiOff}
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
      ) : view === 'invalid-link' ? (
        <AuthStatusPanel
          icon={XCircle}
          tone="bad"
          title="This invitation link is no longer valid"
          body="Ask your organization to send you a new one."
          ctaLabel="Back to sign in"
          onCta={() => navigate('/sign-in')}
        />
      ) : view === 'multiple' ? (
        <AuthStatusPanel
          icon={Building2}
          tone="warn"
          title="You have more than one pending invitation"
          body="We found invitations to more than one organization for this email address. Contact support so we can help you accept the right one."
          ctaLabel="Contact support"
          onCta={() => {
            window.location.href = 'mailto:hello@shiftos.app';
          }}
          secondaryLabel="Back to sign in"
          onSecondary={() => navigate('/sign-in')}
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
          onCta={() => {
            // Clears the flag the mount effect above checks -- without this,
            // a later, unrelated invitation accepted in the same browser tab
            // session would skip straight to 'success' without ever
            // checking that invitation's own real status.
            window.sessionStorage.removeItem(ACCEPTED_SESSION_KEY);
            navigate('/complete-profile');
          }}
        />
      ) : (
        <>
          <h2 className="text-center text-[22px] font-extrabold tracking-[-0.02em] text-neutral-900">Accept your invitation</h2>
          <p className="mt-2 text-center text-[13px] text-neutral-500">Set a password to activate your ShiftOS account.</p>

          {invitation ? (
            <div className="mt-[18px] flex items-center gap-3 rounded-[14px] border border-[#F7DFD1] bg-[#FEF7F2] px-3.5 py-[13px]">
              <span className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-brand-500 text-[13px] font-extrabold text-white">
                {invitation.organization_name
                  .split(' ')
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-extrabold text-neutral-900">{invitation.organization_name}</span>
                <span className="block truncate text-xs text-neutral-500">
                  {invitation.role_name}
                  {invitation.branch_names.length ? ` · ${invitation.branch_names.join(', ')}` : ''} · invited by{' '}
                  {invitation.invited_by_name}
                </span>
              </span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} noValidate className="mt-[18px] flex flex-col gap-[15px]">
            <FormField label="Create Password" htmlFor="password" required>
              {(fieldProps) => <PasswordInput {...fieldProps} autoComplete="new-password" placeholder="Create your password" value={password} onChange={(e) => setPassword(e.target.value)} />}
            </FormField>
            {password ? <PasswordStrengthMeter checks={checks} strength={strength} /> : null}
            <FormField
              label="Confirm Password"
              htmlFor="confirmPassword"
              required
              error={error && error.includes('match') ? 'Passwords do not match.' : undefined}
            >
              {(fieldProps) => (
                <PasswordInput
                  {...fieldProps}
                  autoComplete="new-password"
                  invalid={!!error && error.includes('match')}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError(null);
                  }}
                />
              )}
            </FormField>
            {error && !error.includes('match') ? <AuthBanner tone="bad" title="Check your password" body={error} /> : null}
            <AuthSubmit loading={submitting} loadingLabel="Activating your account…">
              Accept invitation →
            </AuthSubmit>
            <p className="text-center text-[11.5px] leading-normal text-neutral-400">
              By accepting you agree to our Terms &amp; Conditions and Privacy Policy.
            </p>
          </form>
        </>
      )}
    </AuthShell>
  );
}
