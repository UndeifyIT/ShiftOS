import React from 'react';
import { LogoMark } from '../marketing/Logo.js';

const SESSION_KEY = 'shiftos:brand-reveal-shown';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function shouldReveal(): boolean {
  if (typeof window === 'undefined') return false;
  if (prefersReducedMotion()) return false;
  try {
    return window.sessionStorage.getItem(SESSION_KEY) !== '1';
  } catch {
    // sessionStorage unavailable (private mode / disabled) — skip rather than risk showing every load
    return false;
  }
}

/**
 * One-time brand-reveal overlay shown on the very first app load per browser
 * session (never on route changes). Children render immediately underneath
 * — the overlay only covers them for ~700ms then fades, so nothing is
 * delayed, just briefly covered. Skipped entirely under prefers-reduced-motion
 * or if sessionStorage already recorded a reveal this session.
 */
export function BrandReveal({ children }: { children: React.ReactNode }): React.ReactElement {
  const [active] = React.useState(shouldReveal);
  const [fading, setFading] = React.useState(false);
  const [mounted, setMounted] = React.useState(active);

  React.useEffect(() => {
    if (!active) return;
    try {
      window.sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      // ignore — best-effort session gate only
    }
    const fadeTimer = window.setTimeout(() => setFading(true), 520);
    const unmountTimer = window.setTimeout(() => setMounted(false), 820);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(unmountTimer);
    };
  }, [active]);

  return (
    <>
      {children}
      {mounted ? (
        <div
          aria-hidden="true"
          className={[
            'fixed inset-0 z-[100] flex items-center justify-center bg-neutral-900 transition-opacity duration-300 ease-out',
            fading ? 'opacity-0' : 'opacity-100'
          ].join(' ')}
        >
          <LogoMark className="h-14 w-14 animate-[shiftos-reveal_0.6s_ease-out]" />
        </div>
      ) : null}
    </>
  );
}
