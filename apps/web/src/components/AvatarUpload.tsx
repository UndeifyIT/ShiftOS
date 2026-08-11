import React, { useRef, useState } from 'react';
import { Avatar, Button } from '@shiftos/ui';
import { removeAvatar, useSignedAvatarUrl } from '../lib/avatars.js';

export interface AvatarUploadProps {
  name: string;
  path: string | null;
  size?: number;
  onUpload: (file: File) => Promise<string>;
  onChange: (path: string | null) => void;
  disabled?: boolean;
}

const MAX_BYTES = 5 * 1024 * 1024;

/** Shared upload/preview/replace/remove control for employee and manager profile photos (private `avatars` bucket, migration 030). */
export function AvatarUpload({ name, path, size = 64, onUpload, onChange, disabled }: AvatarUploadProps): React.ReactElement {
  const signedUrl = useSignedAvatarUrl(path);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File): Promise<void> => {
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Images must be 5MB or smaller.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const previousPath = path;
      const newPath = await onUpload(file);
      onChange(newPath);
      if (previousPath && previousPath !== newPath) {
        await removeAvatar(previousPath);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload photo.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (): Promise<void> => {
    if (!path) return;
    setBusy(true);
    setError(null);
    try {
      await removeAvatar(path);
      onChange(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove photo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name || '?'} src={signedUrl} size={size} />
      <div className="flex flex-col gap-1">
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" loading={busy} disabled={disabled} onClick={() => inputRef.current?.click()}>
            {path ? 'Replace photo' : 'Upload photo'}
          </Button>
          {path ? (
            <Button type="button" variant="ghost" size="sm" disabled={disabled || busy} onClick={() => void handleRemove()}>
              Remove
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-neutral-500">Optional. JPG or PNG, up to 5MB.</p>
        {error ? <p className="text-xs text-error-text">{error}</p> : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}
