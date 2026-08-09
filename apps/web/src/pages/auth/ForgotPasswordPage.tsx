import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, FormField, InlineError, Input } from '@shiftos/ui';
import { supabase } from '../../lib/supabase.js';
import { AuthLayout } from './AuthLayout.js';

/** SHARED-002 — Forgot Password. */
export default function ForgotPasswordPage(): React.ReactElement {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!email) {
      setError('Enter your email.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    setSubmitting(false);
    // Supabase never reveals whether the email is registered — always show
    // the same success state regardless of outcome (account-enumeration safe).
    if (!resetError) {
      setSent(true);
    } else {
      setError('Something went wrong. Please try again.');
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Check your email">
        <p className="text-sm text-neutral-600">
          If an account exists for <strong>{email}</strong>, we sent a link to reset your password.
        </p>
        <Link to="/sign-in" className="mt-6 inline-block text-sm font-medium text-brand-600 hover:text-brand-700">
          Back to sign in
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset your password" description="Enter your email and we'll send you a reset link.">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormField label="Email" htmlFor="email" required>
          {(fieldProps) => (
            <Input {...fieldProps} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          )}
        </FormField>
        {error ? <InlineError message={error} /> : null}
        <Button type="submit" loading={submitting} fullWidth>
          Send reset link
        </Button>
        <Link to="/sign-in" className="text-center text-sm font-medium text-brand-600 hover:text-brand-700">
          Back to sign in
        </Link>
      </form>
    </AuthLayout>
  );
}
