import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Shield, User, Users } from 'lucide-react';
import { Button, FormField, InlineError, Input } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { supabase } from '../../lib/supabase.js';
import { isNetworkError } from '../../lib/authErrors.js';
import { AuthShell, type AuthBenefit, type AuthHighlight } from './AuthShell.js';

const HIGHLIGHT: AuthHighlight = {
  icon: User,
  title: 'Photos are optional',
  body: 'Without one, ShiftOS shows your initials in every avatar.'
};

const BENEFITS: AuthBenefit[] = [
  { icon: Users, title: 'Recognizable on shift', body: 'Your name appears on schedules and tasks.' },
  { icon: MessageSquare, title: 'Reachable', body: 'Supervisors can contact you about cover.' },
  { icon: User, title: 'Photo optional', body: 'Add, replace or remove it any time.' },
  { icon: Shield, title: 'Only your organization', body: 'Profile details stay inside it.' }
];

const PENDING_NAME_KEY = 'shiftos.pendingName';

/**
 * Not a numbered screen in FD-4 on its own — it's the concrete UI for the
 * `public.users` self-insert step every authenticated identity needs before
 * create_organization_with_owner or any RPC operation can run (see
 * SessionProvider.completeProfile / migration 017's user_self_manage RLS
 * policy). Session status 'no-profile' renders this unconditionally.
 */
export default function CompleteProfilePage(): React.ReactElement {
  const { authUser, completeProfile, signOut } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // SignUpPage stashes the name the person typed there so they don't have
  // to retype it here — best-effort only, cleared immediately after use.
  useEffect(() => {
    const pending = window.sessionStorage.getItem(PENDING_NAME_KEY);
    if (!pending) return;
    window.sessionStorage.removeItem(PENDING_NAME_KEY);
    try {
      const parsed = JSON.parse(pending) as { firstName?: string; lastName?: string; phone?: string };
      if (parsed.firstName) setFirstName(parsed.firstName);
      if (parsed.lastName) setLastName(parsed.lastName);
      if (parsed.phone) setPhone(parsed.phone);
    } catch {
      // Malformed sessionStorage value — ignore, the form just starts blank.
    }
  }, []);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setError('First name, last name and phone number are needed.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      let avatarUrl: string | undefined;
      if (photoFile && authUser) {
        const path = `users/${authUser.id}/${Date.now()}-${photoFile.name}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(path, photoFile, { upsert: true });
        if (uploadError) {
          setError('Could not upload your photo. You can add it later from Settings.');
        } else {
          avatarUrl = path;
        }
      }
      const { error: submitError } = await completeProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        jobTitle: jobTitle.trim() || undefined,
        avatarUrl
      });
      if (submitError) setError(submitError);
    } catch (err) {
      setError(isNetworkError(err) ? "Couldn't reach ShiftOS. Check your connection and try again." : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Almost there"
      title="Complete Your"
      accent="Profile"
      body="Add the details your branch needs to recognize you on the schedule. A photo is optional and can be added later."
      highlight={HIGHLIGHT}
      benefits={BENEFITS}
      topRightPrompt="Signed in as"
      topRightLinkLabel={authUser?.email ?? ''}
    >
      <h2 className="text-2xl font-bold text-neutral-900">Complete your profile</h2>
      <p className="mt-1 text-sm text-neutral-500">This is how your team will see you in ShiftOS.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-neutral-50 text-neutral-400 hover:border-brand-400"
          >
            {photoPreviewUrl ? (
              <img src={photoPreviewUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <User size={26} />
            )}
          </button>
          <div>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              {photoFile ? 'Change photo' : 'Add photo'}
            </button>
            <p className="text-xs text-neutral-400">Optional. JPG or PNG.</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <FormField label="First Name" htmlFor="firstName" required>
          {(fieldProps) => <Input {...fieldProps} placeholder="Sarah" value={firstName} onChange={(e) => setFirstName(e.target.value)} />}
        </FormField>
        <FormField label="Last Name" htmlFor="lastName" required>
          {(fieldProps) => <Input {...fieldProps} placeholder="Johnson" value={lastName} onChange={(e) => setLastName(e.target.value)} />}
        </FormField>
        <FormField label="Phone Number" htmlFor="phone" required>
          {(fieldProps) => <Input {...fieldProps} type="tel" autoComplete="tel" placeholder="+234 802 345 6789" value={phone} onChange={(e) => setPhone(e.target.value)} />}
        </FormField>
        <FormField label="Job Title" htmlFor="jobTitle" hint="Optional">
          {(fieldProps) => <Input {...fieldProps} placeholder="Floor Supervisor" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />}
        </FormField>

        {error ? <InlineError message={error} /> : null}
        <Button type="submit" loading={submitting} fullWidth size="lg">
          Save and continue →
        </Button>
        <p className="text-center text-xs text-neutral-400">You can change any of this later from Settings → Profile.</p>
        <button type="button" onClick={() => void signOut()} className="text-center text-sm font-medium text-neutral-500 hover:text-neutral-700">
          Sign out
        </button>
      </form>
    </AuthShell>
  );
}
