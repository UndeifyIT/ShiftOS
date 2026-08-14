import React from 'react';

/**
 * Shared marketing/site primitives, ported from shift-app-hero's
 * components/site/marketing-shell.tsx (Section, SectionHeading) and its
 * `.eyebrow` utility class (now defined in src/styles/global.css), plus the
 * pre-existing IconCircle helper used across the ported pages.
 */

export function Eyebrow({ children }: { children: React.ReactNode }): React.ReactElement {
  return <span className="eyebrow">{children}</span>;
}

export function IconCircle({
  children,
  tone = 'brand',
  size = 44
}: {
  children: React.ReactNode;
  tone?: 'brand' | 'success' | 'info' | 'warning' | 'neutral';
  size?: number;
}): React.ReactElement {
  const toneClasses: Record<string, string> = {
    brand: 'bg-brand-soft text-brand-deep',
    success: 'bg-success-soft text-success-600',
    info: 'bg-info-50 text-info-600',
    warning: 'bg-warning-soft text-brand-deep',
    neutral: 'bg-neutral-100 text-neutral-600'
  };
  return (
    <div
      className={['flex shrink-0 items-center justify-center rounded-xl', toneClasses[tone]].join(' ')}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}

/** Ported from shift-app-hero's marketing-shell.tsx `Section`. */
export function Section({
  children,
  className = '',
  wash = false
}: {
  children: React.ReactNode;
  className?: string;
  wash?: boolean;
}): React.ReactElement {
  return (
    <section className={[wash ? 'bg-neutral-50' : '', 'py-16 sm:py-20 lg:py-24', className].filter(Boolean).join(' ')}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">{children}</div>
    </section>
  );
}

/** Ported from shift-app-hero's marketing-shell.tsx `SectionHeading`. */
export function SectionHeading({
  eyebrow,
  title,
  highlight,
  description,
  align = 'center'
}: {
  eyebrow?: string;
  title: string;
  highlight?: string;
  description?: string;
  align?: 'center' | 'left';
}): React.ReactElement {
  return (
    <div className={['max-w-2xl', align === 'center' ? 'mx-auto text-center' : ''].filter(Boolean).join(' ')}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="mt-4 font-display text-3xl font-semibold leading-[1.1] text-neutral-900 sm:text-4xl">
        {title} {highlight ? <span className="text-brand-700">{highlight}</span> : null}
      </h2>
      {description ? <p className="mt-4 text-base leading-relaxed text-neutral-500">{description}</p> : null}
    </div>
  );
}
