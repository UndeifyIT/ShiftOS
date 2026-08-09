import React, { useState } from 'react';
import { Button, FormField, InlineError, Input } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { AuthLayout } from './AuthLayout.js';

/**
 * Not a numbered screen in FD-4 on its own — it's the concrete UI for the
 * `public.users` self-insert step every authenticated identity needs before
 * create_organization_with_owner or any RPC operation can run (see
 * SessionProvider.completeProfile / migration 017's user_self_manage RLS
 * policy). Session status 'no-profile' renders this unconditionally.
 */
export default function CompleteProfilePage(): React.ReactElement {
  const { authUser, completeProfile, signOut } = useSession();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: submitError } = await completeProfile({ firstName: firstName.trim(), lastName: lastName.trim() });
    setSubmitting(false);
    if (submitError) {
      setError(submitError);
    }
  };

  return (
    <AuthLayout title="Complete your profile" description={authUser?.email ? `Signed in as ${authUser.email}` : undefined}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormField label="First name" htmlFor="firstName" required>
          {(fieldProps) => <Input {...fieldProps} value={firstName} onChange={(e) => setFirstName(e.target.value)} />}
        </FormField>
        <FormField label="Last name" htmlFor="lastName" required>
          {(fieldProps) => <Input {...fieldProps} value={lastName} onChange={(e) => setLastName(e.target.value)} />}
        </FormField>
        {error ? <InlineError message={error} /> : null}
        <Button type="submit" loading={submitting} fullWidth>
          Continue
        </Button>
        <button type="button" onClick={() => void signOut()} className="text-center text-sm font-medium text-neutral-500 hover:text-neutral-700">
          Sign out
        </button>
      </form>
    </AuthLayout>
  );
}
