import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Mail, ShieldCheck, Users } from 'lucide-react';
import { Button, FormField, InlineError, Input } from '@shiftos/ui';
import { supabase } from '../../lib/supabase.js';
import { AuthMarketingLayout } from './AuthMarketingLayout.js';

const FEATURES = [
  { icon: Lock, title: 'Secure & Protected', description: 'Reset links are single-use and expire after 20 minutes.' },
  { icon: Users, title: "You're in Control", description: 'Only the email on file can request a reset.' },
  { icon: ShieldCheck, title: 'Peace of Mind', description: 'We never reveal whether an email is registered.' }
];

/** SHARED-002 — Forgot Password, styled to match Reset Password (SHARED-003). */
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

  return (
    <AuthMarketingLayout
      eyebrow="Secure Password Reset"
      heading="Forgot Your Password?"
      description="No problem — enter the email on your ShiftOS account and we'll send you a link to reset it."
      features={FEATURES}
      topRightPrompt="Remember your password?"
      topRightLinkLabel="Sign In"
      topRightLinkTo="/sign-in"
    >
      {sent ? (
        <div className="py-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-50 text-success-600">
            <Mail size={26} />
          </div>
          <h2 className="mt-4 text-xl font-bold text-neutral-900">Check your email</h2>
          <p className="mt-2 text-sm text-neutral-500">
            If an account exists for <strong>{email}</strong>, we sent a link to reset your password.
          </p>
          <Link to="/sign-in" className="mt-6 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700">
            Back to Sign In
          </Link>
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-neutral-900">Reset Your Password</h2>
          <p className="mt-1 text-sm text-neutral-500">Enter your email and we&rsquo;ll send you a reset link.</p>

          <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
            <FormField label="Work Email" htmlFor="email" required>
              {(fieldProps) => (
                <Input {...fieldProps} type="email" autoComplete="email" placeholder="Enter your work email" value={email} onChange={(e) => setEmail(e.target.value)} />
              )}
            </FormField>
            {error ? <InlineError message={error} /> : null}
            <Button type="submit" loading={submitting} fullWidth size="lg">
              Send Reset Link →
            </Button>
            <Link to="/sign-in" className="text-center text-sm font-medium text-brand-600 hover:text-brand-700">
              Back to Sign In
            </Link>
          </form>
        </>
      )}
    </AuthMarketingLayout>
  );
}
