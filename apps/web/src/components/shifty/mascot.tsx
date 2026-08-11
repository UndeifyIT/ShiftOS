import * as React from 'react';
import { Check, Sparkles } from 'lucide-react';
import shiftyWave from '../../assets/shifty-wave.png';
import shiftyGuide from '../../assets/shifty-guide.png';
import shiftySuccess from '../../assets/shifty-success.png';
import shiftyAvatar from '../../assets/shifty-avatar.png';

export type ShiftyVariant = 'wave' | 'guide' | 'success' | 'avatar';

const SOURCES: Record<ShiftyVariant, string> = {
  wave: shiftyWave,
  guide: shiftyGuide,
  success: shiftySuccess,
  avatar: shiftyAvatar
};

/** The one and only Shifty. Same character everywhere — only the pose changes. */
export function ShiftyMascot({
  variant = 'guide',
  className = '',
  alt = 'Shifty, the ShiftOS setup assistant'
}: {
  variant?: ShiftyVariant;
  className?: string;
  alt?: string;
}): React.ReactElement {
  return (
    <img
      src={SOURCES[variant]}
      alt={alt}
      width={816}
      height={816}
      loading="lazy"
      draggable={false}
      className={`select-none object-contain ${className}`}
    />
  );
}

/** Small circular Shifty face — used in headers, chat bubbles and list rows. */
export function ShiftyAvatar({ className = '', online = false }: { className?: string; online?: boolean }): React.ReactElement {
  return (
    <span className={`relative inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50 ${className}`}>
      <ShiftyMascot variant="avatar" className="h-full w-full scale-[1.15]" alt="Shifty" />
      {online ? <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-success-500" /> : null}
    </span>
  );
}

/** Shifty speaking to the user — onboarding step guidance, tips, celebration. */
export function ShiftyPanel({
  variant = 'guide',
  eyebrow = 'Shifty',
  message,
  tips,
  tone = 'neutral',
  className = ''
}: {
  variant?: ShiftyVariant;
  eyebrow?: string;
  message: React.ReactNode;
  tips?: { label: string; hint: string }[];
  tone?: 'neutral' | 'success' | 'warning';
  className?: string;
}): React.ReactElement {
  const toneClass =
    tone === 'success' ? 'border-success-500/25 bg-success-50' : tone === 'warning' ? 'border-brand-300 bg-brand-50' : 'border-neutral-200 bg-white';

  return (
    <section aria-label="Shifty guidance" className={`rounded-2xl border p-4 shadow-sm ${toneClass} ${className}`}>
      <div className="flex items-start gap-3">
        <span className="relative flex size-16 shrink-0 items-end justify-center overflow-hidden rounded-xl bg-brand-50">
          <ShiftyMascot variant={variant} className="h-[86%] w-full" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-brand-600">
            <Sparkles size={12} aria-hidden="true" /> {eyebrow}
          </p>
          <p className="mt-1.5 text-[13px] font-semibold leading-relaxed text-neutral-900">{message}</p>
        </div>
      </div>

      {tips && tips.length > 0 ? (
        <ul className="mt-3.5 space-y-2 border-t border-neutral-200 pt-3.5">
          {tips.map((t) => (
            <li key={t.label} className="flex items-start gap-2">
              <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                <Check size={10} aria-hidden="true" />
              </span>
              <span className="min-w-0 text-[12px] leading-relaxed text-neutral-500">
                <span className="font-bold text-neutral-900">{t.label}</span> — {t.hint}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/** Compact inline Shifty note — for validation hints and in-form nudges. */
export function ShiftyNote({
  children,
  tone = 'warning',
  className = ''
}: {
  children: React.ReactNode;
  tone?: 'warning' | 'success' | 'neutral';
  className?: string;
}): React.ReactElement {
  const toneClass =
    tone === 'warning' ? 'border-brand-200 bg-brand-50 text-neutral-900' : tone === 'success' ? 'border-success-500/25 bg-success-50 text-neutral-900' : 'border-neutral-200 bg-neutral-50 text-neutral-500';

  return (
    <p role="status" className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-[12.5px] font-semibold leading-relaxed ${toneClass} ${className}`}>
      <ShiftyAvatar className="size-7" />
      <span className="min-w-0 pt-0.5">{children}</span>
    </p>
  );
}
