import React, { useEffect, useState } from 'react';
import { Button, Card, ContentSection, FormField, InlineError, Input, PageContainer, PageHeader } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcQuery } from '../../lib/useRpc.js';
import { supabase } from '../../lib/supabase.js';
import type { Employee } from '../../types/domain.js';

/**
 * SHARED-007 — My Profile. The "workforce profile" section only renders when
 * this identity resolves to an employees row (matched by email — there is no
 * FK between users and employees, DEC-016/DEC-032; §C.2 of the frontend
 * foundation doc). Its absence is a normal, expected outcome for an
 * organization admin, not an error.
 */
export default function ProfilePage(): React.ReactElement {
  const { profile, refresh } = useSession();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name);
      setLastName(profile.last_name);
      setPhone(profile.phone ?? '');
    }
  }, [profile]);

  const { data: employees } = useRpcQuery<Employee[]>('list_employees');
  const myEmployeeRecord = employees?.find((e) => e.email && profile?.email && e.email.toLowerCase() === profile.email.toLowerCase());

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!profile) return;
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required.');
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    const { error: updateError } = await supabase
      .from('users')
      .update({ first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim() || null })
      .eq('id', profile.id);
    setSaving(false);
    if (updateError) {
      setError('Could not save your changes. Please try again.');
      return;
    }
    setSaved(true);
    await refresh();
  };

  return (
    <PageContainer>
      <PageHeader title="My Profile" />
      <Card className="max-w-xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label="First name" htmlFor="firstName" required>
            {(fieldProps) => <Input {...fieldProps} value={firstName} onChange={(e) => setFirstName(e.target.value)} />}
          </FormField>
          <FormField label="Last name" htmlFor="lastName" required>
            {(fieldProps) => <Input {...fieldProps} value={lastName} onChange={(e) => setLastName(e.target.value)} />}
          </FormField>
          <FormField label="Email" htmlFor="email" hint="Contact your administrator to change your email.">
            {(fieldProps) => <Input {...fieldProps} value={profile?.email ?? ''} disabled />}
          </FormField>
          <FormField label="Phone" htmlFor="phone">
            {(fieldProps) => <Input {...fieldProps} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />}
          </FormField>
          {error ? <InlineError message={error} /> : null}
          {saved ? <p className="text-sm font-medium text-success-text">Saved.</p> : null}
          <Button type="submit" loading={saving} className="self-start">
            Save changes
          </Button>
        </form>
      </Card>

      {myEmployeeRecord ? (
        <ContentSection title="Workforce profile" className="mt-8">
          <Card className="max-w-xl">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-neutral-500">Employee #</dt>
                <dd className="text-neutral-900">{myEmployeeRecord.employee_number}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Hire date</dt>
                <dd className="text-neutral-900">{myEmployeeRecord.hire_date}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Status</dt>
                <dd className="text-neutral-900">{myEmployeeRecord.employment_status.replace('_', ' ')}</dd>
              </div>
            </dl>
          </Card>
        </ContentSection>
      ) : null}
    </PageContainer>
  );
}
