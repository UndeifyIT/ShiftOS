import React, { useEffect, useRef, useState } from 'react';
import { ImageOff, MessageSquare, Shield, User, Users } from 'lucide-react';
import { FormField, Spinner } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { supabase } from '../../lib/supabase.js';
import { removeAvatar, uploadUserAvatar } from '../../lib/avatars.js';
import { isNetworkError } from '../../lib/authErrors.js';
import { AuthShell, type AuthBenefit, type AuthHighlight } from './AuthShell.js';
import { AuthBanner, AuthInput, AuthSelect, AuthSubmit } from './AuthInputs.js';

// 'Manager'/'Owner' are never assigned via invitation (membershipService
// rejects inviting an org-wide-branch-access role), so they're not real
// options here — only roles invite_member can actually grant.
const JOB_ROLES = ['Supervisor', 'Admin', 'Employee'] as const;

/** Drives the photo tile below — mirrors the 4-state widget in the design
 * handoff (`ShiftOS Auth.dc.html`'s Complete Profile `photo` state). Upload
 * now happens immediately on file selection rather than being deferred to
 * form submit. */
type PhotoState = 'empty' | 'uploading' | 'uploaded' | 'error';

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
  const [photoState, setPhotoState] = useState<PhotoState>('empty');
  // Storage path of the already-uploaded avatar (set once `uploadUserAvatar`
  // resolves) — this, not the raw File, is what handleSubmit sends on.
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Non-null once we've checked whether this identity arrived via a real
  // invitation. When it has, the inviter already chose the role (a
  // Supervisor invite, an Employee invite, an Admin invite are separate
  // forms) -- letting the invitee freely re-pick a different Job Role here
  // would just be a label that contradicts their real, already-granted
  // permissions. Null means "still checking" or "no invitation" (e.g. an
  // Owner completing their own profile after signup), in which case the
  // field stays a free choice.
  const [invitedRoleName, setInvitedRoleName] = useState<string | null>(null);

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

  // Mirrors AcceptInvitationPage's own get_pending_invitation() call rather
  // than passing role_name through router state -- this page can be reached
  // directly (a reload, a bookmarked link) without ever having rendered that
  // page in this session, and the RPC is a cheap, idempotent preview that's
  // still resolvable here (accept_invitation() -- the call that consumes the
  // invitation -- only runs once this page's own submit creates the profile
  // row, so the invitation is still 'pending' right up until then).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.rpc('get_pending_invitation').maybeSingle<{ role_name: string; status: string }>();
      if (cancelled || !data || data.status !== 'pending') return;
      setInvitedRoleName(data.role_name);
      setJobTitle(data.role_name);
    })();
    return () => {
      cancelled = true;
    };
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

  // Upload starts the instant a file is chosen — 'empty', "Replace photo" and
  // "Try again" all funnel through this same handler via the hidden file
  // input, so whichever file the person (re-)picks is what gets uploaded.
  const handleFileSelected = async (file: File): Promise<void> => {
    setPhotoFile(file);
    setPhotoState('uploading');
    if (!authUser) {
      setPhotoState('error');
      return;
    }
    try {
      const path = await uploadUserAvatar(authUser.id, file);
      setAvatarPath(path);
      setPhotoState('uploaded');
    } catch {
      setPhotoState('error');
    }
  };

  const handleRemovePhoto = async (): Promise<void> => {
    const path = avatarPath;
    // Reset to 'empty' up front regardless of what the delete below does —
    // this is best-effort cleanup, same swallow-and-log pattern as the
    // orphaned-upload cleanup in handleSubmit below.
    setPhotoState('empty');
    setPhotoFile(null);
    setAvatarPath(null);
    if (path) {
      try {
        await removeAvatar(path);
      } catch (err) {
        console.error('Failed to remove avatar:', err);
      }
    }
  };

  const handleSkipPhoto = (): void => {
    // Nothing was ever uploaded in the error state, so there's nothing to
    // clean up in Storage — just clear the local selection.
    setPhotoState('empty');
    setPhotoFile(null);
    setAvatarPath(null);
  };

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setError('First name, last name and phone number are needed.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // The photo (if any) is already uploaded by this point — immediate
      // upload-on-select means there's nothing left to upload here, just the
      // already-resolved Storage path to send along.
      const { error: submitError } = await completeProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        jobTitle: jobTitle.trim() || undefined,
        avatarUrl: avatarPath ?? undefined
      });
      if (submitError) {
        // The photo upload succeeded but the profile row was never created —
        // the object in Storage is now orphaned. Best-effort cleanup only:
        // never let a failure here mask the original error above.
        if (avatarPath) {
          try {
            await removeAvatar(avatarPath);
          } catch (cleanupErr) {
            console.error('Failed to clean up orphaned avatar upload:', cleanupErr);
          }
          // The Storage object is gone (or we at least tried) — drop it from
          // state too so a retried submit doesn't resend a deleted path, and
          // the tile reflects that the photo needs re-uploading.
          setAvatarPath(null);
          setPhotoFile(null);
          setPhotoState('empty');
        }
        setError(submitError);
      }
    } catch (err) {
      setError(isNetworkError(err) ? "Couldn't reach ShiftOS. Check your connection and try again." : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Empty-state avatar fallback: initials derived from the name fields
  // typed so far, falling back to a person icon until both are blank.
  const initials = `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase();

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
      <h2 className="text-center text-[22px] font-extrabold tracking-[-0.02em] text-neutral-900">Complete your profile</h2>
      <p className="mt-2 text-center text-[13px] text-neutral-500">This is how your team will see you in ShiftOS.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-[18px] flex flex-col gap-[15px]">
        <div className="flex items-center gap-3.5 rounded-[14px] border border-neutral-200 bg-[#FDFCFB] p-3.5">
          <div
            className={`flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full text-[17px] font-extrabold ${
              photoState === 'error'
                ? 'border-[1.5px] border-dashed border-error-500 bg-error-50 text-error-500'
                : photoState === 'uploading'
                  ? 'bg-[#F4F1EE] text-neutral-500'
                  : photoState === 'uploaded' && photoPreviewUrl
                    ? 'bg-brand-soft'
                    : 'border-[1.5px] border-dashed border-neutral-200 bg-white text-neutral-400'
            }`}
          >
            {photoState === 'uploading' ? (
              <Spinner size={20} label="Uploading photo" />
            ) : photoState === 'error' ? (
              <ImageOff size={22} aria-hidden="true" />
            ) : photoState === 'uploaded' && photoPreviewUrl ? (
              <img src={photoPreviewUrl} alt="" className="h-full w-full object-cover" />
            ) : initials ? (
              <span className="text-base font-semibold text-neutral-500">{initials}</span>
            ) : (
              <User size={26} aria-hidden="true" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-extrabold text-neutral-900">
              Profile photo <span className="font-semibold text-neutral-400">(optional)</span>
            </p>
            <p className="mt-0.5 text-[11.5px] text-neutral-500">
              {photoState === 'uploading'
                ? 'Uploading your photo…'
                : photoState === 'uploaded'
                  ? 'Photo added.'
                  : photoState === 'error'
                    ? "Couldn't upload your photo."
                    : 'PNG, JPG or WebP · max 2 MB. You can add it later.'}
            </p>
            <div className="mt-2 flex flex-wrap gap-[7px]">
              {photoState === 'empty' ? (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-[34px] cursor-pointer rounded-[10px] bg-brand-500 px-3 text-xs font-bold text-white transition-colors hover:bg-brand-600"
                  >
                    Upload photo
                  </button>
                  <button
                    type="button"
                    onClick={handleSkipPhoto}
                    className="h-[34px] cursor-pointer rounded-[10px] border border-neutral-200 bg-white px-3 text-xs font-bold text-neutral-700 transition-colors hover:border-neutral-300"
                  >
                    Skip photo
                  </button>
                </>
              ) : photoState === 'uploading' ? (
                <span className="text-xs font-medium text-neutral-400">Uploading…</span>
              ) : photoState === 'uploaded' ? (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-[34px] cursor-pointer rounded-[10px] border border-neutral-200 bg-white px-3 text-xs font-bold text-neutral-700 transition-colors hover:border-neutral-300"
                  >
                    Replace photo
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRemovePhoto()}
                    className="h-[34px] cursor-pointer rounded-[10px] border border-error-500/40 bg-white px-3 text-xs font-bold text-error-600 transition-colors hover:bg-error-50"
                  >
                    Remove
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-[34px] cursor-pointer rounded-[10px] bg-brand-500 px-3 text-xs font-bold text-white transition-colors hover:bg-brand-600"
                  >
                    Try again
                  </button>
                  <button
                    type="button"
                    onClick={handleSkipPhoto}
                    className="h-[34px] cursor-pointer rounded-[10px] border border-neutral-200 bg-white px-3 text-xs font-bold text-neutral-700 transition-colors hover:border-neutral-300"
                  >
                    Skip photo
                  </button>
                </>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              // Reset so re-picking the exact same file (e.g. "Try again"
              // after a failed upload) still fires onChange.
              e.target.value = '';
              if (file) void handleFileSelected(file);
            }}
          />
        </div>

        <FormField label="First Name" htmlFor="firstName" required>
          {(fieldProps) => <AuthInput {...fieldProps} autoComplete="given-name" placeholder="Sarah" value={firstName} onChange={(e) => setFirstName(e.target.value)} />}
        </FormField>
        <FormField label="Last Name" htmlFor="lastName" required>
          {(fieldProps) => <AuthInput {...fieldProps} autoComplete="family-name" placeholder="Johnson" value={lastName} onChange={(e) => setLastName(e.target.value)} />}
        </FormField>
        <FormField label="Phone Number" htmlFor="phone" required>
          {(fieldProps) => <AuthInput {...fieldProps} type="tel" autoComplete="tel" placeholder="+234 802 345 6789" value={phone} onChange={(e) => setPhone(e.target.value)} />}
        </FormField>
        <FormField label="Job Role" htmlFor="jobTitle" hint={invitedRoleName ? 'Set by your invitation' : 'Optional'}>
          {(fieldProps) =>
            invitedRoleName ? (
              <AuthSelect {...fieldProps} value={invitedRoleName} disabled>
                <option value={invitedRoleName}>{invitedRoleName}</option>
              </AuthSelect>
            ) : (
              <AuthSelect {...fieldProps} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}>
                <option value="">Select your role</option>
                {JOB_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </AuthSelect>
            )
          }
        </FormField>

        {error ? (
          <AuthBanner
            tone={error.includes('reach ShiftOS') || error.includes('connection') ? 'warn' : 'bad'}
            title={error.includes('reach ShiftOS') || error.includes('connection') ? "Couldn't reach ShiftOS" : "Couldn't save your profile"}
            body={error}
          />
        ) : null}
        <AuthSubmit loading={submitting} loadingLabel="Saving your profile…">
          Save and continue →
        </AuthSubmit>
        <p className="text-center text-[11.5px] leading-normal text-neutral-400">
          You can change any of this later from Settings → Profile.
        </p>
        <button type="button" onClick={() => void signOut()} className="text-center text-[13px] font-bold text-neutral-500 transition-colors hover:text-neutral-700">
          Sign out
        </button>
      </form>
    </AuthShell>
  );
}
