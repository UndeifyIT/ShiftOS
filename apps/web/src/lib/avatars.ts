import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';

/**
 * Direct Supabase Storage access for the private `avatars` bucket
 * (supabase/migrations/030) — RLS-protected, same pattern as lib/supabase.ts's
 * documented exceptions (own-profile self-management, org bootstrap): photo
 * upload/removal is a storage-object operation, not a Tier-1 domain RPC, so it
 * goes through the anon-key client directly rather than packages/api.
 */
const BUCKET = 'avatars';

function extensionOf(file: File): string {
  const fromName = file.name.split('.').pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type.split('/')[1] ?? 'jpg';
}

export async function uploadEmployeeAvatar(organizationId: string, employeeId: string, file: File): Promise<string> {
  const path = `employees/${organizationId}/${employeeId}/${Date.now()}.${extensionOf(file)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw new Error(error.message);
  return path;
}

export async function uploadUserAvatar(authUserId: string, file: File): Promise<string> {
  const path = `users/${authUserId}/${Date.now()}.${extensionOf(file)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw new Error(error.message);
  return path;
}

/**
 * Organization logo upload (Onboarding wizard rebuild, spec decision 2) —
 * same private `avatars` bucket, a new `organizations/{organizationId}/...`
 * prefix. Requires supabase/migrations/046_add_organization_logo_storage_policy.sql
 * to be applied — 030's original RLS only recognized `employees/`/`users/`.
 */
export async function uploadOrganizationLogo(organizationId: string, file: File): Promise<string> {
  const path = `organizations/${organizationId}/${Date.now()}.${extensionOf(file)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw new Error(error.message);
  return path;
}

export async function removeAvatar(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path]);
}

export async function getSignedAvatarUrl(path: string | null | undefined, expiresInSeconds = 3600): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}

/** Resolves a stored avatar path (not a URL) to a short-lived signed URL for display. Returns null while resolving or when there is no photo. */
export function useSignedAvatarUrl(path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!path) {
      setUrl(null);
      return;
    }
    void getSignedAvatarUrl(path).then((signed) => {
      if (!cancelled) setUrl(signed);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return url;
}
