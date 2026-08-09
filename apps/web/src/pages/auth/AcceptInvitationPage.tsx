import React, { useState } from 'react';
import { Button, FormField, InlineError, Input } from '@shiftos/ui';
import { supabase } from '../../lib/supabase.js';
import { AuthLayout } from './AuthLayout.js';

/**
 * SHARED-005 — Accept Invitation / Account Setup (WF-002). The invite email
 * link (packages/auth's inviteUser) establishes a session the same way a
 * password-recovery link does; this screen's job is only to let the invitee
 * set their password. Organization membership itself is created by
 * create_organization_with_owner only for a brand-new organization — there
 * is no invitation-acceptance service yet that turns an accepted invite into
 * an organization_memberships row (frontend foundation §H, a documented,
 * not-yet-built gap). After this step the normal session bootstrap runs; if
 * no membership exists yet, the "no organization" screen explains that
 * next step rather than failing silently.
 */
export default function AcceptInvitationPage(): React.ReactElement {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError('This invitation link has expired. Ask your administrator to resend it.');
    }
  };

  return (
    <AuthLayout title="Finish setting up your account" description="Set a password to activate your ShiftOS account.">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormField label="Password" htmlFor="password" required hint="At least 8 characters.">
          {(fieldProps) => (
            <Input {...fieldProps} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          )}
        </FormField>
        <FormField label="Confirm password" htmlFor="confirmPassword" required>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          )}
        </FormField>
        {error ? <InlineError message={error} /> : null}
        <Button type="submit" loading={submitting} fullWidth>
          Activate account
        </Button>
      </form>
    </AuthLayout>
  );
}
