import React from 'react';

export interface AvatarProps {
  name: string;
  /** Signed/public image URL. Falls back to initials when absent — never render a broken image. */
  src?: string | null;
  size?: number;
  className?: string;
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function Avatar({ name, src, size = 36, className = '' }: AvatarProps): React.ReactElement {
  const [imageFailed, setImageFailed] = React.useState(false);

  if (src && !imageFailed) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setImageFailed(true)}
        className={['inline-block shrink-0 rounded-full object-cover', className].join(' ')}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={name}
      className={['inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700', className].join(
        ' '
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initialsFor(name)}
    </span>
  );
}
