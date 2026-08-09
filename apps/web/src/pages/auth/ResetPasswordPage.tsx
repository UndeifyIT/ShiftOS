import React, { useState } from 'react';
import { Button, FormField, InlineError, Input } from '@shiftos/ui';
import { supabase } from '../../lib/supabase.js';
import { AuthLayout } from './AuthLayout.js';

/**
 * SHARED-003 — Reset Password. Reached from the Supabase recovery-link
 * email; the client's `detectSessionInUrl: true` option (lib/supabase.ts)
 * already exchanges the link's token for a recovery session before this
 * component mounts, so the form only needs to call updateUser().
 */
export default function ResetPasswordPage(): React.ReactElement {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

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
      setError('This reset link has expired. Request a new one.');
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <AuthLayout title="Password updated">
        <p className="text-sm text-neutral-600">Your password has been updated successfully. Taking you to your workspace…</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create a new password" description="Choose a strong password for your ShiftOS account.">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormField label="New password" htmlFor="password" required hint="At least 8 characters.">
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
          Reset password
        </Button>
      </form>
    </AuthLayout>
  );
}
