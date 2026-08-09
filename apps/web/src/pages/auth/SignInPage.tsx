import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, FormField, InlineError, Input } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { AuthLayout } from './AuthLayout.js';

/** SHARED-001 — Sign In (WF-001). */
export default function SignInPage(): React.ReactElement {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!email || !password) {
      setError('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await signIn(email, password);
    setSubmitting(false);
    if (signInError) {
      setError(signInError);
    }
  };

  return (
    <AuthLayout title="Sign in to ShiftOS" description="Access your workspace and manage your team.">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormField label="Email" htmlFor="email" required>
          {(fieldProps) => (
            <Input {...fieldProps} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          )}
        </FormField>
        <FormField label="Password" htmlFor="password" required>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </FormField>
        {error ? <InlineError message={error} /> : null}
        <div className="flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="font-medium text-brand-600 hover:text-brand-700">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" loading={submitting} fullWidth>
          Sign In
        </Button>
      </form>
    </AuthLayout>
  );
}
